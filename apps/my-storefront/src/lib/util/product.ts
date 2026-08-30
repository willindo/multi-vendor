// src/lib/util/product.ts

import { HttpTypes } from "@medusajs/types"

export const isSimpleProduct = (
    product: HttpTypes.StoreProduct
): boolean => {
    return (
        product.options?.length === 1 &&
        product.options[0].values?.length === 1
    )
}

/**
 * A product is the catalog/commerce root.
 *
 * A variant is the actual sellable unit.
 */
export interface SellableProductVariant {
    id: string
    productId: string
    title?: string | null
    sku?: string | null
    barcode?: string | null
    options: Record<string, string>
    price?: HttpTypes.StoreProductVariant["calculated_price"]
    inventoryQuantity?: number | null
    manageInventory?: boolean
    allowBackorder?: boolean
    thumbnail?: string | null
    images: HttpTypes.StoreProductImage[]
}

export function toSellableVariant(
    variant: HttpTypes.StoreProductVariant
): SellableProductVariant {
    return {
        id: variant.id,
        productId: variant.product_id ?? "",
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        options: (variant.options ?? []).reduce((acc, opt) => {
            if (opt.option?.title) {
                acc[opt.option.title] = opt.value
            }
            return acc
        }, {} as Record<string, string>),
        price: variant.calculated_price,
        inventoryQuantity: variant.inventory_quantity,
        // manageInventory: variant.manage_inventory,
        // allowBackorder: variant.allow_backorder,
        thumbnail: variant.thumbnail,
        images: variant.images ?? [],
    }
}
/**
 * Converts a Medusa StoreProductVariant into the
 * storefront's sellable-unit representation.
 *
 * This does NOT copy product-level information such as
 * title, description, handle, collection, etc.
 */

export interface CatalogProduct {
    id: string
    title: string
    subtitle?: string | null
    description?: string | null
    handle: string

    thumbnail?: string | null
    images: HttpTypes.StoreProductImage[]

    variants: SellableProductVariant[]

    options: HttpTypes.StoreProductOption[]

    collection?: HttpTypes.StoreCollection | null
    tags: HttpTypes.StoreProductTag[]

    metadata?: Record<string, unknown> | null
}

export const toCatalogProduct = (
    product: HttpTypes.StoreProduct
): CatalogProduct => {
    return {
        id: product.id,

        title: product.title,
        subtitle: product.subtitle,
        description: product.description,
        handle: product.handle,

        thumbnail: product.thumbnail,
        images: product.images ?? [],

        variants: (product.variants ?? []).map(toSellableVariant),

        options: product.options ?? [],

        collection: product.collection,
        tags: product.tags ?? [],

        metadata: product.metadata,
    }
}