// src/scripts/debug-search.ts
import { ExecArgs } from "@medusajs/framework/types"

export default async function debugSearch({ container }: ExecArgs) {
  const { Meilisearch } = await import("meilisearch")
  const meiliClient = new Meilisearch({
    host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
  })

  try {
    console.log("📊 --- MEILISEARCH CLUSTER STATUS ---")
    
    // 1. Check all active indexes
    const indexes = await meiliClient.getIndexes()
    console.log(`Active Indexes Found: ${indexes.results.length}`)
    indexes.results.forEach(idx => console.log(`- Index UID: ${idx.uid}`))

    const index = meiliClient.index("products")

    // 2. Check total documented stats
    const stats = await index.getStats()
    console.log(`\n📈 Documents inside 'products' index: ${stats.numberOfDocuments}`)
    console.log(`Is Index Currently Indexing? ${stats.isIndexing ? "Yes ⏳" : "No ✅"}`)

    // 3. Look up processing task history safely bypassing strict typing walls
    console.log("\n📑 --- RECENT ENGINE TASK LOGS ---")
    
    // Using explicit client cast or direct multi-version method to get tasks cleanly
    const tasksResponse = await (meiliClient as any).getTasks({ limit: 3 })
    
    if (tasksResponse && tasksResponse.results) {
      tasksResponse.results.forEach((task: any) => {
        console.log(`- Task [${task.uid || task.id}] | Type: ${task.type} | Status: ${task.status} ${task.error ? `❌ Error: ${task.error.message}` : "✅"}`)
      })
    } else {
      console.log("No explicit task results returned from the queue endpoint.")
    }

    // 4. Force a raw data dump of whatever is currently readable
    console.log("\n👀 --- RAW DOCUMENTS PREVIEW ---")
    const docs = await index.getDocuments({ limit: 5 })
    console.log(`Retrieved ${docs.results.length} raw records directly:`)
    console.log(JSON.stringify(docs.results, null, 2))

  } catch (error: any) {
    console.error("❌ Diagnostic extraction failed:", error.message)
  }
}