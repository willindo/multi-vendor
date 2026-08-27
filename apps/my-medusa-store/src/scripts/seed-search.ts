import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import setupMeilisearch from "./setup-meilisearch";
import { buildProductDocument } from "@/lib/search/build-product-document";

export default async function seedSearch({ container }: ExecArgs) {
  console.log("🚀 Starting fresh search index reset and seed...");

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const inventoryService = container.resolve(Modules.INVENTORY);

  const { Meilisearch } = await import("meilisearch");
  const meiliClient = new Meilisearch({
    host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700" || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
  });

  try {
    try {
      console.log("🗑️ Clearing old 'products' index structure...");
      await meiliClient.deleteIndex("products");
    } catch (e) {
      // Safely ignore if index doesn't exist
    }

    console.log("🆕 Creating fresh 'products' index with strict primary key...");
    await meiliClient.createIndex("products", { primaryKey: "id" });

    console.log("⚙️ Applying full clothing catalog configurations...");
    await setupMeilisearch();

    const index = meiliClient.index("products");

    // Fetch products from Medusa
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "handle",
        "thumbnail",
        "options.id",
        "options.title",
        "options.values.id",
        "options.values.value",
        "variants.*",
        "variants.options.id",
        "variants.options.value",
        // "variants.options.option_value_id",
        // "variants.options.option_value.id",
        // "variants.options.option_value.value",
        // "variants.options.option_value.option_id",
        "variants.price_set.prices.*",
        "variants.metadata",
        "variants.inventory_items.*",
        "vendor.id",
        "vendor.name",
        "vendor.handle",
        "apparel_detail.id",
        "apparel_detail.*",
      ],
    });

    if (!products || products.length === 0) {
      console.log("⚠️ No products found in Postgres to sync.");
      return;
    }

    // Build search documents
    const searchDocuments = await Promise.all(
      products.map((product) =>
        buildProductDocument(
          product,
          inventoryService
        )
      )
    );

    console.log(`📦 Shipping ${searchDocuments.length} products to Meilisearch...`);

    await index.addDocuments(searchDocuments);

    console.log("⏳ Waiting 2 seconds for processing queue to catch up...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const stats = await index.getStats();
    console.log(`\n📈 Success! Documents live inside Meilisearch: ${stats.numberOfDocuments}`);
  } catch (error: any) {
    console.error("❌ Seeding operation aborted:", error.message);
  }
}