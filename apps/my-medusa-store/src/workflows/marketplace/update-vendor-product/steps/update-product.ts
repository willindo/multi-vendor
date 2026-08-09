// src/workflows/marketplace/update-vendor-product/steps/update-product.ts
import {
    createStep,
    StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
    Modules,
    ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
type UpdateProductInput = {
    product_id: string
    updateData: Record<string, any>
}
type RollbackState = {
    previous?: Record<string, any>
}
const ALLOWED_FIELDS = [
    "title",
    "subtitle",
    "description",
    "handle",
    "thumbnail",
    "status",
    "discountable",
    "weight",
    "height",
    "length",
    "width",
    "origin_country",
    "mid_code",
    "hs_code",
    "material",
    "metadata",
] as const
export const updateProductStep = createStep(
    "update-product-step",
    async (
        input: UpdateProductInput,
        { container }
    ): Promise<StepResponse<any, RollbackState>> => {
        const productService =
            container.resolve(Modules.PRODUCT)
        const query =
            container.resolve(ContainerRegistrationKeys.QUERY)
        const {
            data: [existing],
        } = await query.graph({
            entity: "product",
            fields: ALLOWED_FIELDS as unknown as string[],
            filters: {
                id: [input.product_id],
            },
        })
        if (!existing) {
            throw new Error("Product not found.")
        }
        const updatePayload: Record<string, any> = {}
        const previous: Record<string, any> = {}
        for (const field of ALLOWED_FIELDS) {
            if (!(field in input.updateData)) {
                continue
            }
            const incoming = input.updateData[field]
            if (incoming === undefined) {
                continue
            }
            if (existing[field] === incoming) {
                continue
            }
            updatePayload[field] = incoming
            previous[field] = existing[field]
        }
        if (Object.keys(updatePayload).length === 0) {
            return new StepResponse(
                existing,
                {}
            )
        }
        const updated =
            await productService.updateProducts(
                input.product_id,
                updatePayload
            )
        return new StepResponse(
            updated,
            {
                previous,
            }
        )
    },
    async (
        rollback,
        { container }
    ) => {
        if (!rollback?.previous) {
            return
        }
        const productService =
            container.resolve(Modules.PRODUCT)
        await productService.updateProducts(
            rollback.previous.id,
            rollback.previous
        )
    }
)