// src/lib/util/vendor/hydration.ts

import type { ApparelDetails } from "@shared/apparel/apparel-types"
import { DEFAULT_APPAREL_DETAILS } from "@shared/apparel/apparel-defaults"

import type { VariantMatrixRow } from "@/components/vendor/products/VariantMatrixTable"

export interface VendorProduct {
    id: string
    title: string
    handle: string
    description?: string
    status: string

    weight?: number
    thumbnail?: string

    type_id?: string | null
    collection_id?: string | null

    apparel_detail?: ApparelDetails

    variants?: any[]
    options?: any[]
}
export interface Product {
    id: string
    title: string
    handle: string
    description?: string
    status: string
    weight?: number
    thumbnail?: string
    type_id?: string | null
    collection_id?: string | null
    metadata?: Record<string, any>
    options?: ProductOption[]
    variants?: ProductVariant[]
    apparel_detail?: ApparelDetails
}

interface ProductOption {
    id: string
    title: string
    values?: ProductOptionValue[]
    metadata?: any
}

interface ProductOptionValue {
    id: string
    value: string
}

interface ProductVariant {

    title: string
    sku: string
    inventory_quantity: number
    manage_inventory: boolean
    currency_code?: string
    prices?: Array<{
        id: string
        amount: number
        currency_code: string
    }>
    options?: Array<{
        option_id: string
        option_value_id: string
        option_name: string
        value: string
    }>
}

// Build variant options from product options and variant
function buildVariantOptions(
    product: Product,
    variant: ProductVariant
): Array<{ optionName: string; value: string }> {
    const options: Array<{ optionName: string; value: string }> = []

    // Parse variant title to extract option values
    // Title format: "S / White" or "M / Black"
    const titleParts = variant.title.split(" / ")

    if (titleParts.length >= 2) {
        // If product has options, map them
        if (product.options && product.options.length > 0) {
            // Try to match options by title parts
            product.options.forEach((opt, index) => {
                if (index < titleParts.length) {
                    options.push({
                        optionName: opt.title,
                        value: titleParts[index]
                    })
                }
            })
        } else {
            // Fallback: use generic option names
            options.push({
                optionName: `Option ${titleParts.length > 0 ? 1 : 0}`,
                value: titleParts[0] || variant.title
            })
        }
    } else {
        // Single value or no slash
        options.push({
            optionName: "Variant",
            value: variant.title
        })
    }

    return options
}

function extractPriceAmount(variant: any): number {
    if (!variant) return 0;

    // 1. Direct price_set array in payload: variant.price_set.prices[0].amount
    const rawAmount =
        variant.price_set?.prices?.[0]?.amount ??
        variant.prices?.[0]?.amount ??
        variant.amount ??
        variant.price_amount ??
        variant.min_price;

    const parsed = Number(rawAmount);
    if (isNaN(parsed) || rawAmount === null || rawAmount === undefined) {
        return 0;
    }
    return parsed / 100;
}

function extractInventoryQuantity(variant: any): number {
    if (!variant) return 0;

    // 1. Direct object property in payload: variant.inventory.stocked_quantity
    const val =
        variant.inventory?.stocked_quantity ??
        variant.stocked_quantity ??
        variant.inventory_quantity ??
        variant.inventory_levels?.[0]?.stocked_quantity ??
        variant.inventory_items?.[0]?.inventory?.location_levels?.[0]?.stocked_quantity;

    const parsed = Number(val);
    return !isNaN(parsed) && val !== null && val !== undefined ? parsed : 0;
}

// Hydrate variant rows from product data
export function hydrateVariantRows(product: Product): VariantMatrixRow[] {
    if (!product.variants || product.variants.length === 0) {
        return []
    }

    return product.variants.map((variant: any) => {
        // Build options array from variant options
        // Note: Medusa doesn't return options in the variant by default
        // We need to build them from the product options and variant values
        const options = buildVariantOptions(product, variant)

        const currencyCode = (
            variant.currency_code ??
            variant.prices?.[0]?.currency_code ??
            "USD"
        ).toUpperCase();

        const priceId = variant.price_id ?? variant.prices?.[0]?.id;

        return {
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            price: extractPriceAmount(variant),
            currencyCode: currencyCode,
            inventoryQuantity: extractInventoryQuantity(variant),
            manageInventory: variant.manage_inventory !== undefined ? variant.manage_inventory : true,
            options: options,
            enabled: true,
            priceId: priceId,
        }
    })
}
// Hydrate apparel details
export function hydrateApparelDetails(product: Product): ApparelDetails {
    if (!product.apparel_detail) {
        return { ...DEFAULT_APPAREL_DETAILS }
    }

    // Ensure all fields from DEFAULT_APPAREL_DETAILS are present
    return {
        ...DEFAULT_APPAREL_DETAILS,
        ...product.apparel_detail,
    }
}

//  Extract original variant IDs
export function extractOriginalVariantIds(variantRows: VariantMatrixRow[]): Set<string> {
    return new Set(
        variantRows
            .map(v => v.id)
            .filter((id): id is string => Boolean(id))
    )
}

// Detect deleted variants
export function detectDeletedVariants(
    originalIds: Set<string>,
    currentRows: VariantMatrixRow[]
): string[] {
    const currentIds = new Set(
        currentRows
            .map(v => v.id)
            .filter((id): id is string => Boolean(id))
    )
    return Array.from(originalIds).filter(id => !currentIds.has(id))
}
// Hydrate form state
export function hydrateFormState(product: Product) {
    return {
        title: product.title || "",
        handle: product.handle || "",
        description: product.description || "",
        weight: product.weight || 0,
        thumbnail: product.thumbnail || "",
        type_id: product.type_id || null,
        collection_id: product.collection_id || null,
        apparel: hydrateApparelDetails(product),
        variants: hydrateVariantRows(product) || [],
    }
}
// Hydrate commerce fields from first variant
export function hydrateCommerceFields(product: Product) {
    if (!product.variants || product.variants.length === 0) {
        return {
            sku: "",
            inventoryQuantity: 10,
            manageInventory: true,
            priceAmount: 0,
            currencyCode: "USD",
        }
    }

    const firstVariant = product.variants[0] as any;

    const currencyCode = (
        firstVariant.currency_code ??
        firstVariant.prices?.[0]?.currency_code ??
        "USD"
    ).toUpperCase();

    return {
        sku: firstVariant.sku || "",
        // inventoryQuantity: firstVariant.stocked_quantity ?? firstVariant.inventory_quantity ?? 10,
        inventoryQuantity: extractInventoryQuantity(firstVariant),
        manageInventory: firstVariant.manage_inventory !== undefined ? firstVariant.manage_inventory : true,
        priceAmount: extractPriceAmount(firstVariant),
        currencyCode: currencyCode,
    }
}
