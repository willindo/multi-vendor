// src/lib/util/normalize-product.ts
import { HttpTypes } from "@medusajs/types"
import { extractRawAmount } from "./get-product-price1"
import { extractInventoryQuantity } from "./vendor/hydration"

/**
 * Normalizes any product shape (Medusa SDK response, Meili hit) into
 * HttpTypes.StoreProduct with:
 *  - variants[].options[].option_id guaranteed at top level
 *  - variants[].calculated_price and inventory_quantity filled
 *  - top-level options[] present in Medusa-native shape
 */
export function normalizeProduct(product: any): HttpTypes.StoreProduct {
    if (!product || !product.variants) return product

    // ── Build optionValueId → { optionId, optionTitle, value } ──
    const valueLookup = new Map<
        string,
        { optionId: string; optionTitle: string; value: string }
    >()

    for (const opt of product.options ?? []) {
        for (const val of opt.values ?? []) {
            if (val?.id) {
                valueLookup.set(val.id, {
                    optionId: opt.id,
                    optionTitle: opt.title,
                    value: val.value,
                })
            }
        }
    }

    // ── Normalize variants ──
    const normalizedVariants = product.variants.map((variant: any) => {
        const stockQty = extractInventoryQuantity(variant)
        const { amount, currency } = extractRawAmount(variant)

        const normalizedOptions = (variant.options ?? []).map((vo: any) => {
            const optionValueId =
                vo.option_value_id ??
                vo.option_value?.id ??
                vo.id ??  // fallback: some shapes put the value id in `id`
                null

            const resolved = optionValueId ? valueLookup.get(optionValueId) : undefined

            return {
                id: vo.id ?? null,
                value: vo.value ?? resolved?.value ?? null,
                option_value_id: optionValueId,
                // ✅ top-level option_id, resolved three ways
                option_id:
                    vo.option_id ??
                    vo.option_value?.option_id ??
                    resolved?.optionId ??
                    null,
            }
        })

        return {
            ...variant,
            manage_inventory: variant.manage_inventory ?? false,
            allow_backorder: variant.allow_backorder ?? false,
            inventory_quantity:
                variant.manage_inventory === false
                    ? 9999
                    : Number(stockQty ?? 0),
            calculated_price:
                variant.calculated_price ?? {
                    calculated_amount: amount,
                    original_amount: amount,
                    currency_code: currency,
                },
            options: normalizedOptions,
        }
    })

    // ── Normalize top-level options[] to Medusa-native shape ──
    const normalizedOptions = (product.options ?? []).map((opt: any) => ({
        id: opt.id,
        title: opt.title,
        values: (opt.values ?? []).map((v: any) => ({
            id: v.id,
            value: v.value,
        })),
    }))

    return {
        ...product,
        options: normalizedOptions,
        variants: normalizedVariants,
    } as HttpTypes.StoreProduct
}