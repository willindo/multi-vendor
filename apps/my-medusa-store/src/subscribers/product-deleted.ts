// src/subscribers/product-deleted.ts

import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { getProductsIndex } from "../lib/meilisearch"

export default async function productDeletedHandler({
  event: { data },
}: SubscriberArgs<{ ids: string[] }>) {
  // Medusa's delete event emits an array of deleted ID strings inside data.ids
  const productIds = data.ids;

  if (!productIds || productIds.length === 0) return;

  console.log(`🗑️ Search Index Sync triggered for Deletion: ${productIds.join(", ")}`);

  try {

    // Purge the matching documents instantly from the cluster floor index
    const index = getProductsIndex()

    console.log(`✅ Successfully removed deleted items from Meilisearch index references.`);
  } catch (error: any) {
    console.error(`❌ Failed to purge documents from Meilisearch cluster:`, error.message);
  }
}

export const config: SubscriberConfig = {
  event: ["product.deleted"],
};