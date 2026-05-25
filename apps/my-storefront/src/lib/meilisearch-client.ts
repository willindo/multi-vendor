// ==== ./src/lib/meilisearch-client.ts ====
import { Meilisearch } from "meilisearch"

// Read configuration from your .env.local keys
const host = process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://127.0.0.1:7700"
const apiKey = process.env.NEXT_PUBLIC_SEARCH_API_KEY || "masterKey"
const indexName = process.env.NEXT_PUBLIC_SEARCH_INDEX_NAME || "products"

// ✅ FIX: Instantiate the missing meilisearchClient instance here using your env keys
const meilisearchClient = new Meilisearch({
  host: host,
  apiKey: apiKey,
})

/**
 * Server-side fallback or direct method to fetch items belonging to a single vendor
 */
export async function getStorefrontProductsByVendor(vendorId: string) {
  try {
    // Escape double quotes in vendorId to protect the filter string boundaries
    const sanitizedId = vendorId.replace(/"/g, '\\"')
    
    // Target the index using the correctly initialized client instance
    const index = meilisearchClient.index(indexName)
    const searchResponse = await index.search("", {
      filter: [`vendor_id = "${sanitizedId}"`],
      limit: 12,
    })

    return searchResponse.hits || []
  } catch (error) {
    console.error("Failed fetching vendor public products:", error)
    return []
  }
}

/**
 * Standard client/server utility function to search across your custom products index.
 */
export async function searchMarketplaceProducts(query: string, limit = 12) {
  try {
    // This now references the verified client initialized on line 9 safely
    const index = meilisearchClient.index(indexName)
    const searchResponse = await index.search(query, {
      limit,
      attributesToHighlight: ["title", "description"],
    })
    
    return searchResponse.hits || []
  } catch (error) {
    console.error("Meilisearch engine query execution failure:", error)
    return []
  }
}