// src/api/vendors/products/[id]/route.ts

import {
    AuthenticatedMedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { validateAndCleanApparelInput } from "@/utils/apparel-guard";
import { validateVendorProductOwnership } from "@/utils/validate-vendor-ownership";
import deleteVendorProductWorkflow from "@/workflows/marketplace/delete-vendor-product";
import updateVendorProductWorkflow, { WorkflowInput } from "@/workflows/marketplace/update-vendor-product/index ";

export const GET = async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
) => {
    try {
        const product_id = req.params.id;
        const actor_id = req.auth_context.actor_id;

        await validateVendorProductOwnership(req.scope, actor_id, product_id);

        const query = req.scope.resolve("query");
        const inventoryService = req.scope.resolve(Modules.INVENTORY);

        // 1. Fetch product with all fields (Default empty array avoids destructuring error)
        const { data: [product] = [] } = await query.graph({
            entity: "product",
            fields: [
                "id",
                "title",
                "handle",
                "subtitle",
                "description",
                "status",
                "thumbnail",
                "weight",
                "length",
                "height",
                "width",
                "origin_country",
                "material",
                "metadata",
                "options.id",
                "options.title",
                "options.values.id",
                "options.values.value",
                "variants.id",
                "variants.title",
                "variants.sku",
                "variants.manage_inventory",
                "variants.allow_backorder",
                "variants.inventory_quantity",
                "variants.options.option_id",
                "variants.options.value",
                "variants.price_set.id",
                "variants.price_set.prices.id",
                "variants.price_set.prices.amount",
                "variants.price_set.prices.currency_code",
                "variants.inventory_items.inventory_item_id",
                "apparel_detail.id",
                "apparel_detail.gender",
                "apparel_detail.age_group",
                "apparel_detail.sizing_group",
                "apparel_detail.garment_category",
                "apparel_detail.garment_subcategory",
                "apparel_detail.fit",
                "apparel_detail.pattern",
                "apparel_detail.style_type",
                "apparel_detail.occasion",
                "apparel_detail.sleeve_type",
                "apparel_detail.neck_type",
                "apparel_detail.material_type",
                "apparel_detail.material_composition",
                "apparel_detail.care_instructions",
                "apparel_detail.season",
                "apparel_detail.condition",
            ],
            filters: { id: product_id },
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // 2. Collect inventory item IDs
        const inventoryItemIds = (product.variants ?? []).flatMap((variant: any) =>
            (variant.inventory_items ?? [])
                .map((item: any) => item.inventory_item_id)
                .filter(Boolean)
        );

        // 3. Fetch inventory levels
        const inventoryLevels = inventoryItemIds.length
            ? await inventoryService.listInventoryLevels({
                inventory_item_id: inventoryItemIds,
            })
            : [];

        // 4. Build inventory map
        const inventoryMap = new Map(
            inventoryLevels.map((level: any) => [
                level.inventory_item_id,
                level.stocked_quantity,
            ])
        );

        // 5. Enrich variants with inventory and price data
        const enrichedVariants = (product.variants ?? []).map((variant: any) => {
            const prices = variant.price_set?.prices || [];
            const primaryPrice = prices[0] || null;

            const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id;
            const stockedQuantity = inventoryMap.get(inventoryItemId) ?? 0;

            const enrichedInventoryItems = (variant.inventory_items ?? []).map((item: any) => ({
                ...item,
                stocked_quantity: inventoryMap.get(item.inventory_item_id) ?? 0,
            }));

            return {
                ...variant,
                price_amount: primaryPrice?.amount ?? 0,
                currency_code: primaryPrice?.currency_code ?? "USD",
                price_id: primaryPrice?.id ?? null,
                prices, // Keep raw prices array intact if vendor dashboard needs multi-currency
                inventory_quantity: stockedQuantity,
                stocked_quantity: stockedQuantity,
                inventory_items: enrichedInventoryItems,
            };
        });

        // 6. Calculate total product inventory
        const totalInventory = enrichedVariants.reduce(
            (sum: number, variant: any) => sum + (variant.inventory_quantity ?? 0),
            0
        );

        // 7. Return enriched product
        return res.json({
            product: {
                ...product,
                variants: enrichedVariants,
                inventory_quantity: totalInventory,
            },
        });

    } catch (error: any) {
        console.error("GET SINGLE PRODUCT ERROR:", error);
        return res.status(500).json({
            message: error.message || "Failed to fetch product",
        });
    }
};

/**
 * Helper to strip non-entity fields from variant update payloads
 */
function sanitizeVariantForUpdate(variant: Record<string, any>) {
    const allowedFields = [
        "id",
        "title",
        "sku",
        "barcode",
        "ean",
        "upc",
        "hs_code",
        "mid_code",
        "allow_backorder",
        "manage_inventory",
        "weight",
        "length",
        "height",
        "width",
        "origin_country",
        "material",
        "metadata",
        "variant_rank",
    ];

    const cleanVariant: Record<string, any> = {};

    for (const field of allowedFields) {
        if (variant[field] !== undefined) {
            cleanVariant[field] = variant[field];
        }
    }

    return cleanVariant;
}

// Inside your PATCH route handler:
export const PATCH = async (
    req: AuthenticatedMedusaRequest<any>,
    res: MedusaResponse,
) => {
    try {
        console.log("==========================================");
        console.log("📝 PATCH PRODUCT");
        console.log("Product ID:", req.params.id);
        console.log("Body:", JSON.stringify(req.body, null, 2));
        console.log("==========================================");
        const product_id = req.params.id;
        const actor_id = req.auth_context.actor_id;

        await validateVendorProductOwnership(req.scope, actor_id, product_id);

        const rawVariants = req.body.variants || req.body.variants_to_update || [];

        // 1. Sanitize variants to ONLY contain core ProductVariant entity fields
        const cleanVariantsToUpdate = rawVariants
            .filter((v: any) => v.id) // Only existing variants
            .map(sanitizeVariantForUpdate);

        // 3. Extract Core Product Fields
        const coreProductData: Record<string, any> = {};
        const coreFields = ["title", "handle", "description", "status", "subtitle", "weight"];

        for (const field of coreFields) {
            if (req.body[field] !== undefined) {
                coreProductData[field] = req.body[field];
            }
        }

        if (req.body.product_data) {
            Object.assign(coreProductData, req.body.product_data);
        }
        const apparelData = validateAndCleanApparelInput(req.body);

        // 2. Extract price updates for your pricing step workflow
        const priceUpdates = rawVariants
            .filter((v: any) => v.id && (v.prices?.length || v.currency_code))
            .map((v: any) => ({
                variant_id: v.id,
                prices: v.prices || [
                    {
                        amount: v.price_amount,
                        currency_code: v.currency_code,
                    },
                ],
            }));

        // 3. Extract inventory updates for your inventory step workflow
        const inventoryUpdates = rawVariants
            .filter((v: any) => v.id && v.inventory_quantity !== undefined)
            .map((v: any) => ({
                variant_id: v.id,
                stocked_quantity: Number(v.inventory_quantity),
            }));

        // 4. Construct Workflow Input
        const workflowInput: WorkflowInput = {
            vendor_admin_id: actor_id,
            product_id,
            product_data: coreProductData,
            sales_channel_ids: req.body.sales_channel_ids,
            apparel_details: apparelData,
            variants_to_create: req.body.variants_to_create || [],
            variants_to_update: cleanVariantsToUpdate, // Pure variant entity updates
            variants_to_delete: req.body.deleted_variant_ids || req.body.variants_to_delete || [],
            inventory_updates: inventoryUpdates,      // Passed separately to Inventory step
            price_updates: priceUpdates,              // Passed separately to Pricing step
            location_id: req.body.location_id || process.env.MEDUSA_STOCK_LOCATION_ID,
        };

        const { result } = await updateVendorProductWorkflow(req.scope).run({
            input: workflowInput,
        });

        return res.json({ product: result });
    } catch (error: any) {
        console.error("PATCH ROUTE ERROR:", error);
        return res.status(400).json({
            message: error.message || "Failed to update product",
        });
    }
};

export const DELETE = async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
) => {
    try {
        const product_id = req.params.id;
        const actor_id = req.auth_context.actor_id;

        await validateVendorProductOwnership(req.scope, actor_id, product_id);

        await deleteVendorProductWorkflow(req.scope).run({
            input: { product_id }
        });

        return res.json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error: any) {
        console.error("DELETE ROUTE ERROR:", error);
        return res.status(400).json({
            message: error.message || "Failed to delete product"
        });
    }
};