// src/lib/util/normalize-product.ts
import { HttpTypes } from "@medusajs/types"
import { extractRawAmount } from "./get-product-price1"

/**
 * Robustly extracts inventory quantity across standard Medusa v2, 
 * inventory module relations, and custom backend tables/views.
 */
export function extractInventoryQuantity(variant: any): number {
    if (!variant) return 0

    // Check direct properties or relations passed from custom backend
    const val =
        variant.stocked_quantity ??
        variant.inventory?.stocked_quantity ??
        variant.inventory_quantity_override ??
        // Standard Medusa v2 Inventory Module expansion path
        variant.inventory_items?.[0]?.inventory?.location_levels?.[0]?.stocked_quantity ??
        variant.inventory_levels?.[0]?.stocked_quantity ??
        // Direct value fallback
        variant.inventory_quantity

    const parsed = Number(val)
    return !isNaN(parsed) && val !== null && val !== undefined ? parsed : 0
}

/**
 * Normalizes custom backend product variants to standard storefront shape
 */
export function normalizeProduct(product: any): HttpTypes.StoreProduct {
    if (!product || !product.variants) return product

    const normalizedVariants = product.variants.map((variant: any) => {
        // 1. Extract true stock quantity
        const stockQty = extractInventoryQuantity(variant)

        // 2. Extract pricing
        const { amount, currency } = extractRawAmount(variant)

        return {
            ...variant,
            // If variant has manage_inventory = false, set stock to infinity / available
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