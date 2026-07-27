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
    // ------------------------------------------------------
    // 0. Get Vendor Context via Admin ID
    // ------------------------------------------------------
    const { data: vendorAdmins } = useQueryGraphStep({
      entity: "vendor_admin",
      fields: ["id", "vendor.id"],
      filters: {
        id: input.vendor_admin_id,
      },
    }).config({
      name: "get-update-vendor",
    });

    // ------------------------------------------------------
    // 1. Update Core Product Details (Title, Handle, Description, etc.)
    // ------------------------------------------------------
    const updateProductInput = transform({ input }, (data) => ({
      product_id: data.input.product_id,
      updateData: data.input.product_data || {},
    }));

    updateProductStep(updateProductInput);

    // ------------------------------------------------------
    // 2. Sync Apparel Details & Link if required
    // ------------------------------------------------------
    const apparelResult = syncApparelDetailStep({
      product_id: input.product_id,
      apparel_detail: input.apparel_details,
    });

    //------------------------------------------------------
    // Link Apparel
    //------------------------------------------------------

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

    // ------------------------------------------------------
    // 3. Resolve & Ensure Product Options Exist
    // ------------------------------------------------------
    const optionsInput = transform({ input }, (data) => ({
      product_id: data.input.product_id,
      variants: [
        ...(data.input.variants_to_create || []),
        ...(data.input.variants_to_update || []),
      ],
    }));

    resolveOptionsStep(optionsInput);

    // ------------------------------------------------------
    // 4. Handle Variant Mutations (Create, Update, Delete)
    // ------------------------------------------------------

    // Fix 1: Map 'variants' to 'product_variants' and attach product_id to each variant
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

    // Fix 2: Wrap variants to update inside 'product_variants' array
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

    // Delete variants (Expects { ids: string[] })
    const variantsToDeletePayload = transform({ input }, (data) => ({
      ids: data.input.variants_to_delete || [],
    }));

    deleteProductVariantsWorkflow.runAsStep({
      input: variantsToDeletePayload,
    });
    // ------------------------------------------------------
    // 5. Update Variant Inventory Stock Levels
    // ------------------------------------------------------
    const inventoryInput = transform({ input }, (data) => ({
      product_id: data.input.product_id,
      inventoryUpdates: data.input.inventory_updates || [],
      location_id: data.input.location_id,
    }));

    updateInventoryStep(inventoryInput);

    // ------------------------------------------------------
    // 6. Update Variant Prices across Price Sets
    // ------------------------------------------------------
    const priceInput = transform({ input }, (data) => ({
      product_id: data.input.product_id,
      variantPrices: data.input.price_updates || [],
    }));

    updatePricesStep(priceInput);

    // ------------------------------------------------------
    // 7. Reconcile Sales Channels Links
    // ------------------------------------------------------
    const salesChannelInput = transform({ input }, (data) => ({
      product_id: data.input.product_id,
      sales_channel_ids: data.input.sales_channel_ids,
    }));

    reconcileSalesChannelsStep(salesChannelInput);

    // ------------------------------------------------------
    // 8. Fetch & Return Updated Product Graph
    // ------------------------------------------------------
    const updatedProduct = getUpdatedProductStep({
      product_id: input.product_id,
    });

    return new WorkflowResponse(updatedProduct);
  }
);
export default updateVendorProductWorkflow;