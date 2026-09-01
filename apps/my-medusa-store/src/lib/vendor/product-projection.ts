// src/lib/vendor/product-projection.ts
import type { InventoryTypes } from "@medusajs/framework/types"
export interface VendorPriceProjection {
    id?: string
    currency_code: string
    amount: number
    min_quantity?: number | null
    max_quantity?: number | null
}
export interface VendorInventoryProjection {
    inventory_item_id: string
    stocked_quantity: number
    reserved_quantity: number
    available_quantity: number
    location_id?: string
}
export interface VendorVariantProjection {
    id: string
    title: string
    sku: string | null
    barcode?: string | null
    ean?: string | null
    upc?: string | null
    allow_backorder: boolean
    manage_inventory: boolean
    options: Record<string, string>
    inventory: VendorInventoryProjection[]
    prices: VendorPriceProjection[]
    metadata?: Record<string, any>
}
export interface VendorProjection {
    id: string
    name: string
    handle: string
    logo?: string | null
}
export interface VendorProductProjection {
    id: string
    title: string
    subtitle?: string | null
    handle: string
    description?: string | null
    thumbnail?: string | null
    status: string
    weight?: number | null
    metadata?: Record<string, any>
    vendor?: VendorProjection
    apparel_detail?: any
    categories: {
        id: string
        name: string
        handle: string
    }[]
    sales_channels: {
        id: string
        name: string
    }[]
    options: {
        id: string
        title: string
        values: {
            id: string
            value: string
        }[]
    }[]
    variants: VendorVariantProjection[]
}
export interface VendorProductProjectionInput {
    product: any
    inventoryLevels?: Record<string, InventoryTypes.InventoryLevelDTO[]>
}
export function buildVendorProductProjection(
    input: VendorProductProjectionInput
) {
    const product = input.product
    return {
        id: product.id,
        title: product.title,
        subtitle: product.subtitle,
        handle: product.handle,
        description: product.description,
        status: product.status,
        thumbnail: product.thumbnail,
        weight: product.weight,
        discountable: product.discountable,
        metadata: product.metadata ?? {},
        vendor: product.vendor
            ? {
                id: product.vendor.id,
                name: product.vendor.name,
                handle: product.vendor.handle,
            }
            : null,
        apparel_detail: product.apparel_detail ?? null,
        categories: (product.categories ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            handle: c.handle,
        })),
        sales_channels: (product.sales_channels ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description,
        })),
        options: (product.options ?? []).map((o: any) => ({
            id: o.id,
            title: o.title,
            values: (o.values ?? []).map((v: any) => ({
                id: v.id,
                value: v.value,
            })),
        })),
        variants: (product.variants ?? []).map((variant: any) => {
            const inventoryItemId =
                variant.inventory_items?.[0]?.inventory_item_id
            const levels =
                input.inventoryLevels?.[inventoryItemId] ?? []
            // Deduplicate levels by location_id (taking the highest/newest updated quantity)
            const uniqueLocationLevels = Object.values(
                levels.reduce((acc: Record<string, any>, level: any) => {
                    acc[level.location_id] = level;
                    return acc;
                }, {})
            );
            const { stocked_quantity, reserved_quantity, available_quantity } =
                uniqueLocationLevels.reduce(
                    (acc, level) => {
                        acc.stocked_quantity += Number(level.stocked_quantity ?? 0);
                        acc.reserved_quantity += Number(level.reserved_quantity ?? 0);
                        acc.available_quantity += Number(level.available_quantity ?? 0);
                        return acc;
                    },
                    { stocked_quantity: 0, reserved_quantity: 0, available_quantity: 0 }
                );
            return {
                id: variant.id,
                title: variant.title,
                sku: variant.sku,
                barcode: variant.barcode,
                ean: variant.ean,
                upc: variant.upc,
                allow_backorder: variant.allow_backorder,
                manage_inventory: variant.manage_inventory,
                metadata: variant.metadata ?? {},
                options: (variant.options ?? []).map((o: any) => ({
                    id: o.id,
                    value: o.value,
                })),
                inventory: {
                    inventory_item_id: inventoryItemId,
                    stocked_quantity,
                },
                price_set: variant.price_set
                    ? {
                        id: variant.price_set.id,
                        prices: (variant.price_set.prices ?? []).map((price: any) => ({
                            id: price.id,
                            currency_code: price.currency_code,
                            amount: Number(price.amount),
                            min_quantity: price.min_quantity,
                            max_quantity: price.max_quantity,
                        })),
                    }
                    : null,
            }
        }),
    }
}