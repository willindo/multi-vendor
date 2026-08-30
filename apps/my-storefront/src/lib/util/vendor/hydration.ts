import type { ApparelDetails } from "@shared/apparel/apparel-types"
import { DEFAULT_APPAREL_DETAILS } from "@shared/apparel/apparel-defaults"
import type { VariantCombination } from "@shared/index"

// 1. Core API & Database Schemas
export interface ProductOptionValue {
    id?: string
    value: string
}

export interface ProductOption {
    id?: string
    title: string
    values?: ProductOptionValue[]
    metadata?: Record<string, any>
}

export interface ProductVariantOption {
    option_id?: string
    option_value_id?: string
    option_name?: string
    optionName?: string
    value: string
}

export interface ProductVariantOptionValue {
    option_id?: string
    option_value_id?: string
    option_name: string
    value: string
}

export interface ProductVariant {
    id?: string
    title: string
    sku?: string
    inventory_quantity?: number
    manage_inventory?: boolean
    currency_code?: string
    currencyCode?: string
    amount?: number
    price_amount?: number
    min_price?: number
    price_set?: {
        prices?: ProductPrice[]
    }
    prices?: ProductPrice[]
    options?: ProductVariantOption[]
}

export interface ProductVariantPrice {
    id?: string
    amount: number
    currency_code: string
}

export interface ProductPrice {
    id?: string
    amount: number // Minor units (paise/cents)
    currency_code: string
}

export interface Product {
    id: string
    title: string
    handle: string
    subtitle?: string
    description?: string
    material?: string
    origin_country?: string
    hs_code?: string
    status: "draft" | "proposed" | "published" | "rejected" | string
    weight?: number
    thumbnail?: string
    type_id?: string | null
    collection_id?: string | null
    metadata?: Record<string, any>
    options?: ProductOption[]
    variants?: ProductVariant[]
    apparel_details?: ApparelDetails
    apparel_detail?: ApparelDetails
}

// 2. UI Matrix Row Type Definition
export type VariantMatrixRow = VariantCombination & {
    id?: string
    enabled: boolean
    currencyCode?: string
    priceId?: string
}

// 2. Helper Utilities
function buildVariantOptions(
    product: Product,
    variant: ProductVariant
): Array<{ optionName: string; value: string }> {
    const options: Array<{ optionName: string; value: string }> = []
    const titleParts = variant.title.split(" / ")

    if (titleParts.length >= 2) {
        if (product.options && product.options.length > 0) {
            product.options.forEach((opt, index) => {
                if (index < titleParts.length) {
                    options.push({
                        optionName: opt.title,
                        value: titleParts[index]
                    })
                }
            })
        } else {
            options.push({
                optionName: `Option 1`,
                value: titleParts[0] || variant.title
            })
        }
    } else {
        options.push({
            optionName: "Variant",
            value: variant.title
        })
    }

    return options
}

export function extractPriceAmount(
    variant?: ProductVariant | any,
    targetCurrency: string = "inr"
): number {
    if (!variant) return 0

    const priceList: ProductPrice[] =
        variant.price_set?.prices || variant.prices || []

    let matchedPrice = priceList.find(
        (p) => p?.currency_code?.toLowerCase() === targetCurrency.toLowerCase()
    )

    if (!matchedPrice && priceList.length > 0) {
        matchedPrice = priceList[0]
    }

    const rawAmount =
        matchedPrice?.amount ??
        variant.amount ??
        variant.price_amount ??
        variant.min_price

    const parsed = Number(rawAmount)
    if (isNaN(parsed) || rawAmount === null || rawAmount === undefined) {
        return 0
    }

    return parsed / 100
}

export function extractCurrencyCode(variant?: ProductVariant, fallback = "INR"): string {
    if (!variant) return fallback.toUpperCase()
    const code =
        variant.currencyCode ||
        variant.currency_code ||
        variant.prices?.[0]?.currency_code ||
        variant.price_set?.prices?.[0]?.currency_code ||
        fallback
    return code.toUpperCase()
}

export function extractFormattedPrice(variant?: ProductVariant, targetCurrency = "INR"): string {
    const amount = extractPriceAmount(variant, targetCurrency)
    const symbol = getCurrencySymbol(targetCurrency)
    return `${symbol}${amount.toFixed(2)}`
}

export function getCurrencySymbol(code: string): string {
    switch (code.toUpperCase()) {
        case "INR":
            return "₹"
        case "USD":
            return "$"
        case "EUR":
            return "€"
        case "GBP":
            return "£"
        default:
            return code.toUpperCase()
    }
}

export function extractInventoryQuantity(variant: any): number {
    if (!variant) return 0

    const val =
        variant.stocked_quantity ??
        variant.inventory?.stocked_quantity ??
        variant.inventory_quantity_override ??
        variant.inventory_items?.[0]?.inventory?.location_levels?.[0]?.stocked_quantity ??
        variant.inventory_levels?.[0]?.stocked_quantity ??
        variant.inventory_quantity

    const parsed = Number(val)
    return !isNaN(parsed) && val !== null && val !== undefined ? parsed : 0
}

// 3. Form & Table Matrix Hydration
export function hydrateVariantRows(product: Product, targetCurrency = "INR"): VariantMatrixRow[] {
    if (!product.variants || product.variants.length === 0) return []

    return product.variants.map((variant) => {
        const priceAmount = extractPriceAmount(variant, targetCurrency)
        const currency = extractCurrencyCode(variant, targetCurrency)

        // Check both prices array and price_set.prices
        const priceList: ProductPrice[] = variant.prices || variant.price_set?.prices || []
        const foundPrice =
            priceList.find((p) => p.currency_code?.toLowerCase() === targetCurrency.toLowerCase()) ||
            priceList[0]

        return {
            id: variant.id,
            enabled: true,
            title: variant.title,
            sku: variant.sku || "",
            price: priceAmount,
            priceId: foundPrice?.id,
            currencyCode: currency,
            inventoryQuantity: extractInventoryQuantity(variant),
            manageInventory: variant.manage_inventory ?? true,
            options: (variant.options || []).map((o) => ({
                optionName: o.option_name || o.optionName || "Option",
                value: o.value,
            })),
        }
    })
}

export function hydrateApparelDetails(product: Product): ApparelDetails {
    if (!product.apparel_detail) {
        return { ...DEFAULT_APPAREL_DETAILS }
    }

    return {
        ...DEFAULT_APPAREL_DETAILS,
        ...product.apparel_detail,
    }
}

export function hydrateApparel(product?: Partial<Product>): ApparelDetails {
    const apparelData = product?.apparel_detail || product?.apparel_details
    return {
        ...DEFAULT_APPAREL_DETAILS,
        ...(apparelData ?? {}),
    }
}

export function extractOriginalVariantIds(variantRows: VariantMatrixRow[]): Set<string> {
    return new Set(
        variantRows
            .map((v) => v.id)
            .filter((id): id is string => Boolean(id))
    )
}

export function detectDeletedVariants(
    originalIds: Set<string>,
    currentRows: VariantMatrixRow[]
): string[] {
    const activeIds = new Set(
        currentRows
            .filter((v) => v.enabled)
            .map((v) => v.id)
            .filter((id): id is string => Boolean(id))
    )
    return Array.from(originalIds).filter((id) => !activeIds.has(id))
}

export function hydrateFormState(product: Product, targetCurrency = "INR") {
    return {
        title: product.title || "",
        handle: product.handle || "",
        description: product.description || "",
        weight: product.weight || 0,
        thumbnail: product.thumbnail || "",
        type_id: product.type_id || null,
        collection_id: product.collection_id || null,
        // apparel: hydrateApparelDetails(product),
        apparel: hydrateApparel(product),
        variants: hydrateVariantRows(product, targetCurrency),
    }
}

export function hydrateCommerceFields(product: Product, targetCurrency = "INR") {
    if (!product.variants || product.variants.length === 0) {
        return {
            sku: "",
            inventoryQuantity: 10,
            manageInventory: true,
            priceAmount: 0,
            currencyCode: targetCurrency.toUpperCase(),
        }
    }

    const firstVariant = product.variants[0]
    return {
        sku: firstVariant.sku || "",
        inventoryQuantity: extractInventoryQuantity(firstVariant),
        manageInventory: firstVariant.manage_inventory !== undefined ? firstVariant.manage_inventory : true,
        priceAmount: extractPriceAmount(firstVariant, targetCurrency),
        currencyCode: extractCurrencyCode(firstVariant, targetCurrency),
    }
}