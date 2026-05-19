// src/scripts/seed-search.ts
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function seedSearch({ container }: ExecArgs) {
  console.log("🚀 Starting fresh search index reset and seed...")
  
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  const { Meilisearch } = await import("meilisearch")
  const meiliClient = new Meilisearch({
    host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
  })

  try {
    // 1. Delete the old empty index to clear any structural conflicts
    try {
      console.log("🗑️ Clearing old 'products' index structure...")
      await meiliClient.deleteIndex("products")
    } catch (e) {
      // Index might not exist yet, ignore error safely
    }

    // 2. Create the index cleanly, explicitly defining 'id' as the primary key
    console.log("🆕 Creating fresh 'products' index with strict primary key...")
    await meiliClient.createIndex("products", { primaryKey: "id" })
    const index = meiliClient.index("products")

    // 3. Configure settings instantly
    console.log("⚙️ Restoring filter rules...")
    await index.updateSettings({
      searchableAttributes: ["title", "description", "vendor_name"],
      filterableAttributes: ["vendor_id"],
    })

    // 4. Fetch the 3 products from your Medusa Postgres module
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "handle",
        "thumbnail",
        "vendor.*"
      ]
    })

    if (!products || products.length === 0) {
      console.log("⚠️ No products found in Postgres to sync.")
      return
    }

    // 5. Structure fields cleanly for your clothing catalog
    const searchDocuments = products.map((product: any) => ({
      id: product.id,
      title: product.title,
      description: product.description || "Premium clothing wear item.",
      handle: product.handle,
      thumbnail: product.thumbnail || "",
      vendor_id: product.vendor?.id || "platform",
      vendor_name: product.vendor?.name || "Platform Store",
    }))

    console.log(`📦 Shipping ${searchDocuments.length} cloth items directly to Meilisearch...`)
    
    // 6. Push and block until the execution completes synchronously
    await index.addDocuments(searchDocuments)
    
    console.log("⏳ Waiting 2 seconds for Docker processing queue to catch up...")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 7. Verify the output directly
    const stats = await index.getStats()
    console.log(`\n📈 Success! Documents now live inside Meilisearch: ${stats.numberOfDocuments}`)

  } catch (error: any) {
    console.error("❌ Seeding operation aborted:", error.message)
  }
}