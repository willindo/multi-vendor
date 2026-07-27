// workflows/marketplace/update-vendor-product/steps/get-product.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export const getUpdatedProductStep = createStep(
    "get-updated-product-step",
    async (input: { product_id: string }, { container }) => {
        const query = container.resolve("query");

        const { data: products } = await query.graph({
            entity: "product",
            fields: [
                "id",
                "title",
                "handle",
                "description",
                "status",
                "thumbnail",
                "weight",
                "metadata",
                "options.*",
                "options.values.*",
                "variants.*",
                "variants.options.*",
                "variants.inventory_items.*",
                "variants.price_set.*",
                "variants.price_set.prices.*",
                "sales_channels.*",
                "categories.*",
            ],
            filters: { id: [input.product_id] },
        });

        return new StepResponse(products[0]);
    }
);