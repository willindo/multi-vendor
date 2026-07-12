// src/subscribers/product-deleted.ts
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { getProductsIndex } from "../lib/meilisearch";

export default async function productDeletedHandler({
  event: { data },
}: SubscriberArgs<{ ids: string[] }>) {
  const productIds = data.ids;

  if (!productIds || productIds.length === 0) return;

  console.log(`🗑️ Search Index Sync triggered for Deletion of IDs: ${productIds.join(", ")}`);

  try {
    // 🟢 Fixed: Added `await` so we are working with the real index instance, not a raw Promise
    const index = await getProductsIndex();

    // Fire batch delete invocation across the search index
    await index.deleteDocuments(productIds);

    console.log(`✅ Successfully removed ${productIds.length} deleted item(s) from Meilisearch index references.`);
  } catch (error: any) {
    console.error(`❌ Failed to purge documents from Meilisearch cluster:`, error.message);
  }
}

export const config: SubscriberConfig = {
  event: ["product.deleted"],
};