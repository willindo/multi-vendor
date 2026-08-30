// src/lib/util/normalize-product.ts
import { HttpTypes } from "@medusajs/types"
import { extractRawAmount } from "./get-product-price1"
import { extractInventoryQuantity } from "./vendor/hydration"
/**
 * Robustly extracts inventory quantity across standard Medusa v2, 
 * inventory module relations, and custom backend tables/views.
 */

/**
 * Normalizes custom backend product variants to standard storefront shape
 */
export function normalizeProduct(product: any): HttpTypes.StoreProduct {
    if (!product || !product.variants) return product

    const normalizedVariants = product.variants.map((variant: any) => {
        const stockQty = extractInventoryQuantity(variant)
        const { amount, currency } = extractRawAmount(variant)

        return {
            ...variant,
            inventory_quantity: variant.manage_inventory === false ? 9999 : Number(stockQty),
            calculated_price: variant.calculated_price ?? {
                calculated_amount: amount,
                original_amount: amount,
                currency_code: currency,
            },
        }
    })

    return {
        ...product,
        variants: normalizedVariants,
    }
}