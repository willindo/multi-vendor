// src/subscribers/inventory-updated.ts
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import productUpsertHandler from "./product-upsert";

export default async function inventoryUpdatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string; inventory_item_id?: string }>) {
    // If the event is inventory-level.updated, data.inventory_item_id is provided
    const inventoryItemId = data.inventory_item_id || data.id;
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    try {
        const { data: variants } = await query.graph({
            entity: "product_variant",
            fields: ["product_id"],
            filters: {
                inventory_items: { inventory_item_id: inventoryItemId }
            } as any
        });

        const productIds = [
            ...new Set(
                (variants as any[])
                    .map((v: any) => v.product_id)
                    .filter(Boolean)
            ),
        ];
        if (!productIds.length) {
            return;
        }
        for (const productId of productIds) {
            console.log(
                `📦 Inventory update detected for product: ${productId}. Re-indexing Meilisearch...`
            );

            await productUpsertHandler({
                event: {
                    name: "product.updated",
                    data: { id: productId },
                    metadata: {},
                },
                container,
                pluginOptions: {},
            } as any);
        }
    } catch (error: any) {
        console.error(`❌ Inventory update subscriber failed:`, error.message);
    }
}

export const config: SubscriberConfig = {
    event: [
        "inventory-item.updated",
        "inventory-level.updated",
        "inventory-level.created",
        "inventory-level.deleted"
    ],
};