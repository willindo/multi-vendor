import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";

export default async function productDeletedHandler({
  event: { data },
}: SubscriberArgs<{ ids: string[] }>) {
  // Medusa's delete event emits an array of deleted ID strings inside data.ids
  const productIds = data.ids;

  if (!productIds || productIds.length === 0) return;

  console.log(`🗑️ Search Index Sync triggered for Deletion: ${productIds.join(", ")}`);

  try {
    const { Meilisearch } = await import("meilisearch");

    const meiliClient = new Meilisearch({
      host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
      apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
    });

    const index = meiliClient.index("products");

    // Purge the matching documents instantly from the cluster floor index
    await index.deleteDocuments(productIds);

    console.log(`✅ Successfully removed deleted items from Meilisearch index references.`);
  } catch (error: any) {
    console.error(`❌ Failed to purge documents from Meilisearch cluster:`, error.message);
  }
}

export const config: SubscriberConfig = {
  event: ["product.deleted"],
};