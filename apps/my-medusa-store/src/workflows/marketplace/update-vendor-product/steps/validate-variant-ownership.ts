// src/workflows/marketplace/update-vendor-product/steps/validate-variant-ownership.ts
import {
    createStep,
    StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type {
    InventoryUpdateItem,
} from "./update-inventory"
import type {
    VariantPriceUpdate,
} from "./update-prices"

// ✅ Remove 'scope' from input - it will be resolved inside the step
export interface ValidateVariantOwnershipInput {
    product_id: string
    variants_to_update?: {
        id: string
    }[]
    variants_to_delete?: string[]
    inventory_updates?: InventoryUpdateItem[]
    price_updates?: VariantPriceUpdate[]
}

export interface ValidateVariantOwnershipOutput {
    variant_ids: string[]
}

export const validateVariantOwnershipStep = createStep(
    "validate-variant-ownership-step",
    async (
        input: ValidateVariantOwnershipInput,
        { container } // ✅ Get container here
    ): Promise<StepResponse<ValidateVariantOwnershipOutput>> => {
        // ✅ Resolve query from container
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const { data } = await query.graph({
            entity: "product",
            fields: [
                "variants.id",
                "variants.sku",
            ],
            filters: {
                id: input.product_id,
            },
        })

        if (!data.length) {
            throw new Error("Product not found.")
        }

        const product = data[0]
        const variants = product.variants ?? []
        const validVariantIds = new Set<string>()
        const validSkus = new Set<string>()

        for (const variant of variants) {
            validVariantIds.add(variant.id)
            if (variant.sku) {
                validSkus.add(variant.sku.toLowerCase())
            }
        }

        // Update Validation
        for (const variant of input.variants_to_update ?? []) {
            if (!validVariantIds.has(variant.id)) {
                throw new Error(
                    `Variant ${variant.id} does not belong to product ${input.product_id}.`
                )
            }
        }

        // Delete Validation
        for (const id of input.variants_to_delete ?? []) {
            if (!validVariantIds.has(id)) {
                throw new Error(
                    `Variant ${id} does not belong to product ${input.product_id}.`
                )
            }
        }

        // Inventory Validation
        for (const inventory of input.inventory_updates ?? []) {
            if (inventory.variant_id) {
                if (!validVariantIds.has(inventory.variant_id)) {
                    throw new Error(
                        `Inventory update references invalid variant ${inventory.variant_id}.`
                    )
                }
            }
            if (inventory.sku) {
                if (!validSkus.has(inventory.sku.toLowerCase())) {
                    throw new Error(
                        `Inventory update references invalid SKU ${inventory.sku}.`
                    )
                }
            }
        }

        // Price Validation
        for (const price of input.price_updates ?? []) {
            if (!validVariantIds.has(price.variant_id)) {
                throw new Error(
                    `Price update references invalid variant ${price.variant_id}.`
                )
            }
        }

        return new StepResponse({
            variant_ids: [...validVariantIds],
        })
    }
)