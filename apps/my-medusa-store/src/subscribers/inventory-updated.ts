// src/subscribers/inventory-updated.ts
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import productUpsertHandler from "./product-upsert";

export default async function inventoryUpdatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const inventoryItemId = data.id;
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    try {
        // Traverse up the graph: Inventory Item ID -> Product Variant -> Product ID
        const { data: variants } = await query.graph({
            entity: "product_variant",
            fields: ["product_id"],
            filters: {
                inventory_items: { inventory_item_id: inventoryItemId }
            } as any
        });

        const productId = variants[0]?.product_id;

        if (productId) {
            console.log(`📦 Stock variation detected for item linked to product: ${productId}. Synchronizing...`);

            // Forward the execution to your main search document builder
            await productUpsertHandler({
                event: { name: "product.updated", data: { id: productId }, metadata: {} },
                container, pluginOptions: {},
            } as any);
        }
    } catch (error: any) {
        console.error(`❌ Inventory updates sync tracking failed:`, error.message);
    }
}

export const config: SubscriberConfig = {
    event: ["inventory-item.updated"],
};