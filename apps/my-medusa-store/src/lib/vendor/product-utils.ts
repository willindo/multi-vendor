// src/lib/vendor/product-utils.ts
import type {
    VendorInventoryProjection,
    VendorPriceProjection,
} from "./product-projection"
/*
|--------------------------------------------------------------------------
| Inventory
|--------------------------------------------------------------------------
*/
export function mergeInventoryLevels(
    inventoryItems: {
        inventory_item_id: string
    }[],
    levels: any[]
): VendorInventoryProjection[] {
    const result: VendorInventoryProjection[] = []
    for (const item of inventoryItems ?? []) {
        const itemLevels = levels.filter(
            (l) => l.inventory_item_id === item.inventory_item_id
        )
        for (const level of itemLevels) {
            result.push({
                inventory_item_id: item.inventory_item_id,
                stocked_quantity: Number(level.stocked_quantity ?? 0),
                reserved_quantity: Number(level.reserved_quantity ?? 0),
                available_quantity:
                    Number(level.stocked_quantity ?? 0) -
                    Number(level.reserved_quantity ?? 0),
                location_id: level.location_id,
            })
        }
    }
    return result
}
/*
|--------------------------------------------------------------------------
| Prices
|--------------------------------------------------------------------------
*/
export function flattenPrices(priceSet: any): VendorPriceProjection[] {
    if (!priceSet?.prices) {
        return []
    }
    return priceSet.prices.map((price: any) => ({
        id: price.id,
        currency_code: price.currency_code,
        amount: Number(price.amount),
        min_quantity: price.min_quantity ?? null,
        max_quantity: price.max_quantity ?? null,
    }))
}
/*
|--------------------------------------------------------------------------
| Variant Options
|--------------------------------------------------------------------------
*/
export function mapVariantOptions(
    variantOptions: any[]
): Record<string, string> {
    const result: Record<string, string> = {}
    for (const option of variantOptions ?? []) {
        const title =
            option.option?.title ??
            option.option_title ??
            option.title
        const value =
            option.option_value?.value ??
            option.value
        if (!title || !value) {
            continue
        }
        result[title] = value
    }
    return result
}
/*
|--------------------------------------------------------------------------
| Collections
|--------------------------------------------------------------------------
*/
export function uniqueInventoryItemIds(product: any): string[] {
    const ids = new Set<string>()
    for (const variant of product?.variants ?? []) {
        for (const item of variant.inventory_items ?? []) {
            if (item.inventory_item_id) {
                ids.add(item.inventory_item_id)
            }
        }
    }
    return [...ids]
}
export function uniquePriceSetIds(product: any): string[] {
    const ids = new Set<string>()
    for (const variant of product?.variants ?? []) {
        if (variant.price_set?.id) {
            ids.add(variant.price_set.id)
        }
    }
    return [...ids]
}
/*
|--------------------------------------------------------------------------
| Generic Helpers
|--------------------------------------------------------------------------
*/
export function indexBy<T extends Record<string, any>>(
    collection: T[],
    key: keyof T
): Map<any, T> {
    const map = new Map<any, T>()
    for (const item of collection ?? []) {
        map.set(item[key], item)
    }
    return map
}
export function groupBy<T extends Record<string, any>>(
    collection: T[],
    key: keyof T
): Map<any, T[]> {
    const map = new Map<any, T[]>()
    for (const item of collection ?? []) {
        const value = item[key]
        const arr = map.get(value) ?? []
        arr.push(item)
        map.set(value, arr)
    }
    return map
}