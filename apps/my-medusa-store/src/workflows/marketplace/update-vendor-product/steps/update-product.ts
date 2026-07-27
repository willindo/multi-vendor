// workflows/marketplace/update-vendor-product/steps/update-product.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

export const updateProductStep = createStep(
    "update-product-step",
    async (input: { product_id: string; updateData: any }, { container }) => {
        const productService = container.resolve(Modules.PRODUCT);
        const updated = await productService.updateProducts(
            input.product_id,
            input.updateData
        );
        return new StepResponse(updated);
    }
);