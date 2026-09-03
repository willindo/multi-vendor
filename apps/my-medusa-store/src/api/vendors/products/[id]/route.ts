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

function capitalize(str: string): string {
    if (!str) return "";
    return str
        .trim()
        .toLowerCase()
        .replace(/(?:^|\s|-|\/)\S/g, (m) => m.toUpperCase());
}

function formatAndNormalizeVariantOptions(rawOptions: any): Record<string, string> {
    if (!rawOptions) return {};

    const normalized: Record<string, string> = {};

    if (Array.isArray(rawOptions)) {
        for (const opt of rawOptions) {
            const key = opt.title || opt.option_id;
            if (key && opt.value) {
                normalized[capitalize(key)] = capitalize(opt.value);
            }
        }
    } else if (typeof rawOptions === "object") {
        for (const [key, val] of Object.entries(rawOptions)) {
            if (key && val) {
                normalized[capitalize(key)] = capitalize(val as string);
            }
        }
    }

    return normalized;
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

        //  Gather all incoming variants from supported payload locations
        const rawVariants = [
            ...(req.body.variants || []),
            ...(req.body.variants_to_update || [])
        ];

        //  Process VARIANTS TO UPDATE (must have an `id`)
        const cleanVariantsToUpdate = rawVariants
            .filter((v: any) => Boolean(v.id))
            .map((v: any) => {
                const sanitized = sanitizeVariantForUpdate(v);
                if (sanitized.options) {
                    sanitized.options = formatAndNormalizeVariantOptions(sanitized.options);
                }
                if (sanitized.title) {
                    sanitized.title = capitalize(sanitized.title);
                }
                return sanitized;
            });

        //  Process VARIANTS TO CREATE (new variants without an `id` OR explicitly passed in variants_to_create)
        const rawVariantsToCreate = [
            ...rawVariants.filter((v: any) => !v.id),
            ...(req.body.variants_to_create || [])
        ];

        const variantsToCreate = rawVariantsToCreate.map((v: any) => ({
            ...v,
            title: v.title ? capitalize(v.title) : undefined,
            options: formatAndNormalizeVariantOptions(v.options),
        }));

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

        // 5. Construct Workflow Input
        const workflowInput: WorkflowInput = {
            vendor_admin_id: vendorAdminId,
            product_id,
            product_data: coreProductData,
            sales_channel_ids: req.body.sales_channel_ids,
            apparel_details: apparelData,
            // variants_to_create: req.body.variants_to_create || [],
            variants_to_create: variantsToCreate,
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