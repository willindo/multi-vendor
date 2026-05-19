// src/scripts/test-search-query.ts
import { ExecArgs } from "@medusajs/framework/types"

export default async function testSearchQuery({ container }: ExecArgs) {
  const { Meilisearch } = await import("meilisearch")
  const meiliClient = new Meilisearch({
    host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
  })

  const index = meiliClient.index("products")

  console.log("\n🔎 --- TEST 1: General Typo-Tolerant Search ('Updatd') ---")
  const res1 = await index.search("Updatd")
  console.log(`Hits Found: ${res1.hits.length}`)
  res1.hits.forEach((hit: any) => {
    console.log(`- [${hit.id}] ${hit.title} (Vendor: ${hit.vendor_name})`)
  })

  // 🎯 REAL MULTI-VENDOR ID FROM YOUR DATABASE OUTPUT
  const TARGET_VENDOR_ID = "01KRY62HXCT7RZE88QHGHC9136"
  // console.log("\n🎯 --- TEST 2: Multi-Vendor Filter Simulation ---")
  // const res2 = await index.search("", {
  //   filter: ["vendor_id = platform"]
  // })
  console.log(`\n🎯 --- TEST 2: Targeted Vendor Filter Execution ---`)
  console.log(`Filtering specifically for Vendor ID: ${TARGET_VENDOR_ID}`)
  
  const filterRes = await index.search("Test Product", {
    filter: [`vendor_id = ${TARGET_VENDOR_ID}`],
  })
  console.log(`Filter Hits Found: ${filterRes.hits.length}`)
  filterRes.hits.forEach((hit: any) => {
    console.log(`- Filtered: ${hit.title} | Vendor ID: ${hit.vendor_id}`)
  })
}