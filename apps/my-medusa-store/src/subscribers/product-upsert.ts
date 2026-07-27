// src/subscribers/product-upsert.ts
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { getProductsIndex } from "../lib/meilisearch";
import { buildProductDocument } from "@/lib/search/build-product-document";

export default async function productUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const inventoryService = container.resolve(Modules.INVENTORY);
  const logger = container.resolve("logger");

  console.log(`🔍 Search Index Sync triggered for Product: ${productId}`);

  try {
    const index = await getProductsIndex();

    const {
      data: [product],
    } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "handle",
        "thumbnail",
        // ✅ Product options and their values
        "options.id",
        "options.title",
        "options.values.id",
        "options.values.value",
        // ✅ Variant data
        "variants.*",
        // ✅ Junction table (product_variant_option) - CORRECT FIELDS
        "variants.options.id",
        "variants.options.value", // This is the option value text
        // "variants.options.option_value_id", // This links to product_option_value
        // "variants.options.option_value.id",
        // "variants.options.option_value.value",
        // "variants.options.option_value.option_id",
        // ✅ Prices
        "variants.price_set.prices.*",
        "variants.metadata",
        // ✅ Inventory
        "variants.inventory_items.*",
        "variants.inventory_items.inventory_item_id",
        "deleted_at",
        // ✅ Vendor and apparel
        "vendor.id",
        "vendor.name",
        "vendor.handle",
        "apparel_detail.*",
      ],
      filters: {
        id: [productId],
      },
    });

    if (!product || product.deleted_at) {
      console.log(`🗑️ Product ${productId} removed from search index.`);
      await index.deleteDocument(productId);
      return;
    }

    if (!product) {
      logger.warn(`⚠️ Search synchronization skipped: Product ${productId} not found.`);
      return;
    }

    const searchDocument =
      await buildProductDocument(
        product,
        inventoryService
      );

    await index.addDocuments([
      searchDocument,
    ]);

    console.log(`✅ Synced "${product.title}" to Meilisearch.`);
  } catch (err: any) {
    console.error(`❌ Failed syncing product ${productId}:`, err.message);
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};