// src/api/vendors/products/[id]/route.ts
import {
    AuthenticatedMedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http";
import { validateAndCleanApparelInput } from "@/utils/apparel-guard";
import { validateVendorProductOwnership } from "@/utils/validate-vendor-ownership";
import deleteVendorProductWorkflow from "@/workflows/marketplace/delete-vendor-product";
import updateVendorProductWorkflow, { WorkflowInput } from "@/workflows/marketplace/update-vendor-product";
import type { ApparelDetails } from "@shared/index";
import { hydrateVendorProduct } from "@/lib/vendor/product-hydration";

export const GET = async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
) => {
    try {
        const product_id = req.params.id;
        const actor_id = req.auth_context.actor_id;

        await validateVendorProductOwnership(
            req.scope,
            actor_id,
            product_id
        );

        const hydratedProduct = await hydrateVendorProduct(
            req.scope,
            product_id
        );

        return res.json({ product: hydratedProduct });
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
        "options" // Preserve variant options object!
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

        const { vendorId, vendorAdminId } = await validateVendorProductOwnership(
            req.scope,
            actor_id,
            product_id
        )

        const rawVariants = req.body.variants || req.body.variants_to_update || [];

        // 1. Sanitize variants
        // const cleanVariantsToUpdate = rawVariants
        //     .filter((v: any) => v.id)
        //     .map(sanitizeVariantForUpdate);

        const cleanVariantsToUpdate = rawVariants
            .filter((v: any) => v.id)
            .map((v: any) => {
                const sanitized = sanitizeVariantForUpdate(v);
                if (sanitized.options) {
                    const formattedOptions = formatVariantOptions(sanitized.options);
                    // Assign back to the correct property
                    sanitized.options = formattedOptions;
                }
                return sanitized;
            });


        // 2. Extract Core Product Fields
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

        // ✅ Conditional apparel validation
        let apparelData: ApparelDetails | undefined = undefined;
        if (req.body.apparel_detail) {
            apparelData = validateAndCleanApparelInput(req.body);
        }

        // 3. Extract price updates
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

        // 4. Extract inventory updates
        const inventoryUpdates = rawVariants
            .filter((v: any) => v.id && v.inventory_quantity !== undefined)
            .map((v: any) => ({
                variant_id: v.id,
                stocked_quantity: Number(v.inventory_quantity),
            }));

        function formatVariantOptions(rawOptions: any): Record<string, string> {
            if (!rawOptions) return {};
            if (!Array.isArray(rawOptions)) return rawOptions; // Already { Title: "Value" }

            // Transforms [{ id: "...", value: "M" }] or [{ title: "Size", value: "M" }]
            return rawOptions.reduce((acc: Record<string, string>, opt: any) => {
                const key = opt.title || opt.option_id;
                if (key && opt.value) acc[key] = opt.value;
                return acc;
            }, {});
        }

        // 5. Construct Workflow Input
        const workflowInput: WorkflowInput = {
            vendor_admin_id: vendorAdminId,
            product_id,
            product_data: coreProductData,
            sales_channel_ids: req.body.sales_channel_ids,
            apparel_details: apparelData,  // ✅ Now works with undefined
            variants_to_create: req.body.variants_to_create || [],
            variants_to_update: cleanVariantsToUpdate,
            variants_to_delete: req.body.deleted_variant_ids || req.body.variants_to_delete || [],
            inventory_updates: inventoryUpdates,
            price_updates: priceUpdates,
            location_id: req.body.location_id || process.env.MEDUSA_STOCK_LOCATION_ID,
        };

        await updateVendorProductWorkflow(req.scope).run({
            input: workflowInput,
        });

        //  Hydrate the response
        const hydratedProduct = await hydrateVendorProduct(
            req.scope,
            product_id
        );
        return res.json({ product: hydratedProduct });
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

        // Returns { vendorId, resourceId, vendorAdminId }
        await validateVendorProductOwnership(
            req.scope,
            actor_id,
            product_id
        )

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