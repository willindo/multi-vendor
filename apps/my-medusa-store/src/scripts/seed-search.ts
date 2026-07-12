// src/scripts/seed-search.ts
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import setupMeilisearch from "./setup-meilisearch"


export default async function seedSearch({ container }: ExecArgs) {
  console.log("🚀 Starting fresh search index reset and seed...")

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const inventoryService = container.resolve(Modules.INVENTORY);

  const { Meilisearch } = await import("meilisearch")
  const meiliClient = new Meilisearch({
    host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
  })

  try {
    try {
      console.log("🗑️ Clearing old 'products' index structure...")
      await meiliClient.deleteIndex("products")
    } catch (e) {
      // Index might not exist yet, ignore error safely
    }

    console.log("🆕 Creating fresh 'products' index with strict primary key...")
    await meiliClient.createIndex("products", { primaryKey: "id" })

    // 🟢 Inject structural configurations right away to prevent broken states
    console.log("⚙️ Applying full clothing catalog configurations...")
    await setupMeilisearch();

    const index = meiliClient.index("products")

    // Fetch products from Medusa with identical fields mapped inside subscriber graph
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "handle",
        "thumbnail",
        "variants.*",
        "variants.options.*",
        "variants.options.option.*",
        "variants.price_set.prices.*",
        "variants.inventory_items.inventory_item.*",
        "vendor.id",
        "vendor.name",
        "vendor.handle",
        "apparel_detail.id",
        "apparel_detail.*",
      ],
    })

    if (!products || products.length === 0) {
      console.log("⚠️ No products found in Postgres to sync.")
      return
    }

    for (const product of products) {
      // 1 & 2. Collect unique inventory item IDs associated with this product's variants
      const inventoryItemIds: string[] = (product.variants as any[])?.flatMap(
        (v) => v.inventory_items?.map((inv: any) => inv.inventory_item_id || inv.id) || []
      ).filter(Boolean) || [];

      const inventoryMap = new Map<string, number>();

      if (inventoryItemIds.length > 0) {
        // 3. Query the inventory service directly (returns InventoryLevelDTO[])
        const levels = await inventoryService.listInventoryLevels({
          inventory_item_id: inventoryItemIds,
        });

        // 4. Aggregate quantities across warehouse locations into the lookup map
        levels.forEach((lvl) => {
          const currentStock = inventoryMap.get(lvl.inventory_item_id) || 0;
          inventoryMap.set(lvl.inventory_item_id, currentStock + (lvl.stocked_quantity || 0));
        });
      }
      // 5. Compute total product inventory matching the product-upsert layout
      const calculatedInventoryQuantity = (product.variants as any[])?.reduce((acc: number, v: any) => {
        const variantStock = v.inventory_items?.reduce((invAcc: number, inv: any) => {
          const itemId = inv.inventory_item_id || inv.id;
          return invAcc + (inventoryMap.get(itemId) || 0);
        }, 0) || 0;
        return acc + variantStock;
      }, 0) || 0;

      const searchDocuments = products.map((product: any) => {
        const vendorData = Array.isArray(product.vendor) ? product.vendor[0] : product.vendor;
        const apparelData = Array.isArray(product.apparel_detail) ? product.apparel_detail[0] : product.apparel_detail;

        const extractOptionValues = (title: string): string[] => {
          if (!product.variants) return [];
          const values = product.variants.map((v: any) =>
            v.options?.find((o: any) => o.option?.title?.toLowerCase() === title.toLowerCase())?.value
          );
          return Array.from(new Set(values.filter((val): val is string => !!val)));
        };

        return {
          id: product.id,
          title: product.title,
          description: product.description || "Premium clothing wear item.",
          handle: product.handle,
          thumbnail: product.thumbnail || "",

          // ✅  Show both SKU types
          variants: product.variants?.map((v: any) => ({
            id: v.id,
            internal_sku: v.sku,                           // ✅ Internal SKU
            merchant_sku: v.metadata?.merchant_sku || v.sku, // ✅ Merchant SKU
          })),

          // ✅ Searchable by merchant SKU
          merchant_skus: (product.variants ?? [])
            .map((v: any) => v.metadata?.merchant_sku || v.sku)
            .filter(Boolean),

          sizes: extractOptionValues("Size"),
          colors: extractOptionValues("Color"),

          vendor_id: vendorData?.id || "platform",
          vendor_name: vendorData?.name || "Platform Store",
          vendor_handle: vendorData?.handle ?? null,

          gender: apparelData?.gender || "UNISEX",
          age_group: apparelData?.age_group || null,
          sizing_group: apparelData?.sizing_group || null,
          garment_category: apparelData?.garment_category || null,
          garment_subcategory: apparelData?.garment_subcategory || null,
          fit: apparelData?.fit || "REGULAR",
          pattern: apparelData?.pattern || "SOLID",
          style_type: apparelData?.style_type || "CASUAL",
          occasion: apparelData?.occasion || null,
          sleeve_type: apparelData?.sleeve_type || null,
          neck_type: apparelData?.neck_type || null,
          material_type: apparelData?.material_type || "NATURAL",
          material_composition: apparelData?.material_composition || null,
          season: apparelData?.season || "ALL_SEASON",
          condition: apparelData?.condition || "NEW",

          price: Math.min(...(product.variants?.flatMap((v: any) =>
            v.price_set?.prices?.map((p: any) => p.amount) || []
          ) || [0])),

          inventory_quantity: calculatedInventoryQuantity,
        }
      })
      console.log(`📦 Shipping ${searchDocuments.length} cloth items directly to Meilisearch...`)
      await index.addDocuments(searchDocuments)
    }

    console.log("⏳ Waiting 2 seconds for processing queue to catch up...")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const stats = await index.getStats()
    console.log(`\n📈 Success! Documents now live inside Meilisearch: ${stats.numberOfDocuments}`)

  } catch (error: any) {
    console.error("❌ Seeding operation aborted:", error.message)
  }
}