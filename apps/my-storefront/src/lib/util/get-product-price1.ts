// src/lib/util/get-product-price1.ts

import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "./money"
import { getPercentageDiff } from "./get-percentage-diff"

export interface NormalizedVariantPrice {
    calculated_price_number: number
    calculated_price: string
    original_price_number: number
    original_price: string
    currency_code: string
    price_type: "default" | "sale"
    percentage_diff: number | any
}

/**
 * Safely extracts numeric price from variant across custom backend & standard Medusa schemas
 */
export function extractRawAmount(variant: any): { amount: number; currency: string } {
    if (!variant) return { amount: 0, currency: "USD" }

    // 1. Check Medusa standard calculated_price
    if (variant.calculated_price?.calculated_amount != null) {
        return {
            amount: variant.calculated_price.calculated_amount,
            currency: variant.calculated_price.currency_code || "USD",
        }
    }

    // 2. Check custom price_set structure (price_set.prices[0].amount)
    const priceSetObj = variant.price_set?.prices?.[0]
    if (priceSetObj?.amount != null) {
        const raw = Number(priceSetObj.amount)
        return {
            amount: raw > 1000 ? raw / 100 : raw, // Normalize cents to major units if needed
            currency: (priceSetObj.currency_code || "USD").toLowerCase(),
        }
    }

    // 3. Fallback to direct prices array
    const priceObj = variant.prices?.[0]
    if (priceObj?.amount != null) {
        const raw = Number(priceObj.amount)
        return {
            amount: raw > 1000 ? raw / 100 : raw,
            currency: (priceObj.currency_code || "USD").toLowerCase(),
        }
    }

    return { amount: 0, currency: "USD" }
}

/**
 * Normalizes price output for any given variant
 */
export const getPricesForVariant = (variant: any): NormalizedVariantPrice | null => {
    if (!variant) return null

    const { amount, currency } = extractRawAmount(variant)
    const originalAmount =
        variant.calculated_price?.original_amount ??
        variant.original_price ??
        amount

    const isSale = originalAmount > amount && amount > 0

    return {
        calculated_price_number: amount,
        calculated_price: convertToLocale({
            amount: amount,
            currency_code: currency,
        }),
        original_price_number: originalAmount,
        original_price: convertToLocale({
            amount: originalAmount,
            currency_code: currency,
        }),
        currency_code: currency,
        price_type: isSale ? "sale" : "default",
        percentage_diff: isSale ? getPercentageDiff(originalAmount, amount) : 0,
    }
}

/**
 * Variant-aware product price extractor
 */
export function getProductPrice({
    product,
    variantId,
}: {
    product: HttpTypes.StoreProduct | any
    variantId?: string
}) {
    if (!product || !product.id) {
        throw new Error("No product provided")
    }

    const cheapestPrice = () => {
        if (!product || !product.variants?.length) {
            return null
        }

        const sortedVariants = [...product.variants].sort((a: any, b: any) => {
            const priceA = extractRawAmount(a).amount
            const priceB = extractRawAmount(b).amount
            return priceA - priceB
        })

        return getPricesForVariant(sortedVariants[0])
    }

    const variantPrice = () => {
        if (!product || !variantId) {
            return null
        }

        const variant = product.variants?.find(
            (v: any) => v.id === variantId || v.sku === variantId
        )

        if (!variant) {
            return null
        }

        return getPricesForVariant(variant)
    }

    return {
        product,
        cheapestPrice: cheapestPrice(),
        variantPrice: variantPrice(),
    }
}