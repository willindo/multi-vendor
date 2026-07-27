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
                `💰 Price update detected for product: ${productId}. Re-indexing Meilisearch...`
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
        console.error(`❌ Price update subscriber failed:`, error.message);
    }
}

export const config: SubscriberConfig = {
    event: [
        "price.updated",
        "price.created",
        "price-set.updated",
        "price-list.updated"
    ],
};