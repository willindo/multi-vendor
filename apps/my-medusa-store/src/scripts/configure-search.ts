// src/scripts/configure-search.ts
import { ExecArgs } from "@medusajs/framework/types"

export default async function configureSearch({ container }: ExecArgs) {
  console.log("⚙️ Setting up Meilisearch index filters...")
  
  // Dynamic runtime resolution to bypass CommonJS/ESM errors
  const { Meilisearch } = await import("meilisearch")
  
  const meiliClient = new Meilisearch({
    host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
  })

  const index = meiliClient.index("products")

  await index.updateSettings({
    searchableAttributes: ["title", "description", "vendor_name"],
    filterableAttributes: ["vendor_id"],
  })

  console.log("🚀 Meilisearch configurations optimized for clothing filters!")
}