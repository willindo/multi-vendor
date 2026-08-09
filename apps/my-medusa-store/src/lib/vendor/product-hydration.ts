// src/lib/vendor/product-hydration.ts

import {
    ContainerRegistrationKeys,
    Modules,
} from "@medusajs/framework/utils"

import { buildVendorProductProjection } from "./product-projection"

export async function hydrateVendorProduct(
    container: any,
    productId: string
) {
    const query = container.resolve(
        ContainerRegistrationKeys.QUERY
    )

    const inventoryService = container.resolve(
        Modules.INVENTORY
    )

    const {
        data: [product],
    } = await query.graph({
        entity: "product",

        fields: [
            "id",
            "title",
            "subtitle",
            "handle",
            "description",
            "status",
            "thumbnail",
            "weight",
            "discountable",
            "metadata",
            "vendor.id",
            "vendor.name",
            "vendor.handle",
            "apparel_detail.*",
            "categories.*",
            "sales_channels.*",
            "options.*",
            "options.values.*",
            "variants.*",
            "variants.options.*",
            "variants.metadata",
            "variants.inventory_items.inventory_item_id",
            "variants.price_set.id",
            "variants.price_set.prices.*",
        ],

        filters: {
            id: [productId],
        },
    })

    if (!product) {
        throw new Error("Product not found.")
    }

    const inventoryLevels: Record<string, any[]> = {}

    for (const variant of product.variants ?? []) {
        const inventoryItemId =
            variant.inventory_items?.[0]?.inventory_item_id

        if (!inventoryItemId) {
            continue
        }

        inventoryLevels[inventoryItemId] =
            await inventoryService.listInventoryLevels({
                inventory_item_id: [inventoryItemId],
            })
    }

    return buildVendorProductProjection({
        product,
        inventoryLevels,
    })
}