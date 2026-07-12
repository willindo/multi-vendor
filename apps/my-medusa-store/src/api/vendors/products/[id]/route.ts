// /src/api/vendors/products/[id]/route.ts
import {
    AuthenticatedMedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http";
import { validateAndCleanApparelInput } from "@/utils/apparel-guard";
import { validateVendorProductOwnership } from "@/utils/validate-vendor-ownership";
import deleteVendorProductWorkflow from "@/workflows/marketplace/delete-vendor-product";
import updateVendorProductWorkflow from "@/workflows/marketplace/update-vendor-product/index ";
// ✅ Make sure this import works

export const GET = async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
) => {
    try {
        const product_id = req.params.id;
        const actor_id = req.auth_context.actor_id;

        await validateVendorProductOwnership(req.scope, actor_id, product_id);

        const query = req.scope.resolve("query");

        const { data: [product] } = await query.graph({
            entity: "product",
            fields: [
                "id", "title", "handle", "subtitle", "description", "status",
                "thumbnail", "weight", "length", "height", "width",
                "origin_country", "material", "metadata",
                "options.id",
                "options.title",
                "options.values.id",
                "options.values.value",
                "variants.id",
                "variants.title",
                "variants.sku",
                "variants.manage_inventory",
                "variants.options.id",
                "variants.options.value",
                "variants.price_set.id",
                "variants.price_set.prices.id",
                "variants.price_set.prices.amount",
                "variants.price_set.prices.currency_code",
                // "variants.inventory_items.*",
                "variants.price_set.prices.amount", "variants.price_set.prices.currency_code",
                // "variants.inventory_items.inventory_item.inventory_levels.stocked_quantity",
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
            filters: { id: product_id }
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // 🔄 Enrich variants (Updated for Medusa v2 structural layout)
        const enrichedVariants = product.variants?.map((variant: any) => {
            const price = variant.price_set?.prices?.[0] || null;

            // Compute total stock across inventory item variants
            const inventoryQuantity = variant.inventory_items?.reduce((invAcc: number, inv: any) => {
                const item = inv?.inventory_item;
                const quantity = item?.inventory_levels?.[0]?.stocked_quantity ?? 0;
                return invAcc + quantity;
            }, 0) ?? 0;

            return {
                ...variant,
                price_amount: price?.amount || 0,
                currency_code: price?.currency_code || "USD",
                inventory_quantity: inventoryQuantity,
                price_id: price?.id || null,
            };
        }) || [];

        return res.json({
            product: {
                ...product,
                variants: enrichedVariants,
            }
        });

    } catch (error) {
        console.error("GET SINGLE PRODUCT ROUTE ERROR:", error);
        throw error;
    }
};

export const PATCH = async (
    req: AuthenticatedMedusaRequest<any>,
    res: MedusaResponse,
) => {
    try {
        console.log("================================");
        console.log("PATCH PRODUCT");
        console.log("params:", req.params);
        console.log("body:", JSON.stringify(req.body, null, 2));
        console.log("================================");

        const product_id = req.params.id;
        const actor_id = req.auth_context.actor_id;

        await validateVendorProductOwnership(req.scope, actor_id, product_id);

        const apparelData = req.body.apparel_detail
            ? validateAndCleanApparelInput(req.body)
            : undefined;

        const updateData: any = {};
        const coreFields = ["title", "handle", "description", "status", "subtitle", "weight"];
        for (const field of coreFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        // ✅ Execute workflow
        const { result } = await updateVendorProductWorkflow(req.scope).run({
            input: {
                product_id,
                product: updateData,
                variants: req.body.variants || [],
                variants_to_delete: req.body.variants_to_delete || [],
                options: req.body.options || [],
                vendor_admin_id: actor_id,
                apparel_detail: apparelData,
                location_id: req.body.location_id || process.env.MEDUSA_STOCK_LOCATION_ID,
            },
        });

        return res.json({
            product: result.product
        });

    } catch (error) {
        console.error("PATCH ROUTE ERROR:", error);
        throw error;
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
            deleted: true
        });

    } catch (error) {
        console.error("DELETE ROUTE ERROR:", error);
        throw error;
    }
};