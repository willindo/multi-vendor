// src/workflows/marketplace/update-vendor-product/index.ts
import {
    createWorkflow,
    WorkflowResponse,
    transform,
} from "@medusajs/framework/workflows-sdk";
import {
    createProductVariantsWorkflow,
    updateProductVariantsWorkflow,
    deleteProductVariantsWorkflow,
    createRemoteLinkStep,
    useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import { emitEventStep } from "@medusajs/medusa/core-flows";
import { MARKETPLACE_MODULE } from "../../../modules/marketplace";
import type { ApparelDetails } from "@shared/index";

// Import custom workflow steps
import { getUpdatedProductStep } from "./steps/get-product";
import { updateProductStep } from "./steps/update-product";
import { updateInventoryStep, InventoryUpdateItem } from "./steps/update-inventory";
import { updatePricesStep, VariantPriceUpdate } from "./steps/update-prices";
import { resolveOptionsStep } from "./option-resolver";
import { reconcileSalesChannelsStep } from "./reconcile";
import { syncApparelDetailStep } from "./steps/sync-apparel";

// ✅ IMPORT VALIDATION STEPS
import { validateVariantOwnershipStep } from "./steps/validate-variant-ownership";
import { validateSalesChannelsStep } from "./steps/validate-sales-channels";

export type WorkflowInput = {
    vendor_admin_id: string;
    product_id: string;
    product_data?: Record<string, any>;
    sales_channel_ids?: string[];
    apparel_details?: ApparelDetails;
    variants_to_create?: any[];
    variants_to_update?: any[];
    variants_to_delete?: string[];
    inventory_updates?: InventoryUpdateItem[];
    price_updates?: VariantPriceUpdate[];
    location_id?: string;
};

export const updateVendorProductWorkflow = createWorkflow(
    "update-vendor-product",
    (input: WorkflowInput) => {
        // ============================================================
        // PHASE 1: CONTEXT RESOLUTION
        // ============================================================

        const { data: vendorAdmins } = useQueryGraphStep({
            entity: "vendor_admin",
            fields: ["id", "vendor.id"],
            filters: {
                id: input.vendor_admin_id,
            },
        }).config({
            name: "get-update-vendor",
        });

        // ============================================================
        // PHASE 2: VALIDATION (BEFORE ANY MUTATIONS)
        // ============================================================

        // 2a. Validate all variant IDs belong to this product
        const variantValidationInput = transform({ input }, (data) => ({
            product_id: data.input.product_id,
            variants_to_update: data.input.variants_to_update,
            variants_to_delete: data.input.variants_to_delete,
            inventory_updates: data.input.inventory_updates,
            price_updates: data.input.price_updates,
        }));

        validateVariantOwnershipStep(variantValidationInput);

        // 2b. Validate sales channels (only approved ones)
        const salesChannelValidationInput = transform({ vendorAdmins, input }, (data) => ({
            vendor_id: data.vendorAdmins[0]?.vendor?.id,
            sales_channel_ids: data.input.sales_channel_ids,
        }));

        validateSalesChannelsStep(salesChannelValidationInput);

        // 2c. Enforce default sales channel for marketplace
        const { data: stores } = useQueryGraphStep({
            entity: "store",
            fields: ["default_sales_channel_id"],
        }).config({ name: "get-store-for-update" });

        const enforcedSalesChannels = transform({ input, stores }, (data) => {
            const defaultChannelId = data.stores[0]?.default_sales_channel_id;

            // If vendor didn't specify channels, use default
            if (!data.input.sales_channel_ids || data.input.sales_channel_ids.length === 0) {
                return {
                    product_id: data.input.product_id,
                    sales_channel_ids: defaultChannelId ? [defaultChannelId] : [],
                };
            }

            // If vendor specified channels, ensure default is included
            // (validateSalesChannelsStep already verified they're allowed)
            const channels = new Set(data.input.sales_channel_ids);
            if (defaultChannelId) {
                channels.add(defaultChannelId);
            }

            return {
                product_id: data.input.product_id,
                sales_channel_ids: Array.from(channels),
            };
        });

        // ============================================================
        // PHASE 3: MUTATIONS (WITH COMPENSATION)
        // ============================================================

        // 3a. Update Core Product Details
        const updateProductInput = transform({ input }, (data) => ({
            product_id: data.input.product_id,
            updateData: data.input.product_data || {},
        }));

        updateProductStep(updateProductInput);

        // 3b. Sync Apparel Details (with compensation)
        const apparelResult = syncApparelDetailStep({
            product_id: input.product_id,
            apparel_detail: input.apparel_details,
        });

        // 3c. Link Apparel if new
        const apparelLinkPayload = transform(
            { input, apparelResult },
            (data) => {
                if (!data.apparelResult.isNew) {
                    return [];
                }

                return [
                    {
                        [Modules.PRODUCT]: {
                            product_id: data.input.product_id,
                        },
                        [MARKETPLACE_MODULE]: {
                            apparel_detail_id: data.apparelResult.apparel_detail_id,
                        },
                    },
                ];
            }
        );

        createRemoteLinkStep(apparelLinkPayload);

        // 3d. Resolve & Ensure Product Options Exist
        const optionsInput = transform({ input }, (data) => ({
            product_id: data.input.product_id,
            variants: [
                ...(data.input.variants_to_create || []),
                ...(data.input.variants_to_update || []),
            ],
        }));

        resolveOptionsStep(optionsInput);

        // 3e. Handle Variant Mutations
        const variantsToCreatePayload = transform({ input }, (data) => {
            const variants = data.input.variants_to_create || [];
            return {
                product_variants: variants.map((variant) => ({
                    ...variant,
                    product_id: data.input.product_id,
                })),
            };
        });

        createProductVariantsWorkflow.runAsStep({
            input: variantsToCreatePayload,
        });

        const variantsToUpdatePayload = transform({ input }, (data) => {
            const variants = data.input.variants_to_update || [];
            return {
                product_variants: variants.map((variant) => ({
                    ...variant,
                    product_id: data.input.product_id,
                })),
            };
        });

        updateProductVariantsWorkflow.runAsStep({
            input: variantsToUpdatePayload,
        });

        const variantsToDeletePayload = transform({ input }, (data) => ({
            ids: data.input.variants_to_delete || [],
        }));

        deleteProductVariantsWorkflow.runAsStep({
            input: variantsToDeletePayload,
        });

        // 3f. Update Variant Inventory
        const inventoryInput = transform({ input }, (data) => ({
            product_id: data.input.product_id,
            inventory_updates: data.input.inventory_updates || [],
            location_id: data.input.location_id,
        }));

        updateInventoryStep(inventoryInput);

        // 3g. Update Variant Prices
        const priceInput = transform({ input }, (data) => ({
            product_id: data.input.product_id,
            variantPrices: data.input.price_updates || [],
        }));

        updatePricesStep(priceInput);

        // 3h. Reconcile Sales Channels (using enforced channels)
        const salesChannelReconcileInput = transform(
            { enforcedSalesChannels },
            (data) => ({
                product_id: data.enforcedSalesChannels.product_id,
                sales_channel_ids: data.enforcedSalesChannels.sales_channel_ids,
            })
        );

        reconcileSalesChannelsStep(salesChannelReconcileInput);

        // ============================================================
        // PHASE 4: RESPONSE
        // ============================================================

        const updatedProduct = getUpdatedProductStep({
            product_id: input.product_id,
        });

        emitEventStep({
            eventName: "vendor_product.updated",
            data: {
                id: input.product_id,
                updated_at: new Date().toISOString(),
            },
        });

        return new WorkflowResponse(updatedProduct);
    }
);

export default updateVendorProductWorkflow;