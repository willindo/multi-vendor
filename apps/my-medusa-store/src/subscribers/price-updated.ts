// src/subscribers/price-updated.ts
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import productUpsertHandler from "./product-upsert";

export default async function priceUpdatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const priceSetId = data.id;
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    try {
        const { data: variants } = await query.graph({
            entity: "product_variant",
            fields: ["product_id"],
            filters: {
                price_set: { id: priceSetId }
            } as any // 🟢 Cast as any to bypass Medusa's strict internal query types
        });

        const productId = (variants as any[])?.[0]?.product_id;

        if (productId) {
            console.log(`💰 Price shift detected for variant linked to product: ${productId}. Synchronizing...`);
            await productUpsertHandler({
                event: { name: "product.updated", data: { id: productId }, metadata: {} },
                container, pluginOptions: {}
            } as any);
        }
    } catch (error: any) {
        console.error(`❌ Price update sync intercept failed:`, error.message);
    }
}

export const config: SubscriberConfig = {
    event: ["price.updated", "price-set.updated"],
};