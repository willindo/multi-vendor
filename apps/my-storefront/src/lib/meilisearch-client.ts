// ==== ./src/lib/meilisearch-client.ts ====
import { Meilisearch } from "meilisearch"

// Read configuration from your .env.local keys
const host = process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://127.0.0.1:7700"
// const host = process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://localhost:7700"
const apiKey = process.env.NEXT_PUBLIC_SEARCH_API_KEY || "masterKey"
const indexName = process.env.NEXT_PUBLIC_SEARCH_INDEX_NAME || "products"

// ✅ FIX: Instantiate the missing meilisearchClient instance here using your env keys
const meilisearchClient = new Meilisearch({
  host: host,
  apiKey: apiKey,
})
/**
 * Resolves vendor metadata and product list by scanning the index for a matching handle.
 */
export async function getStorefrontDataByVendorHandle(
  handle: string,
  limit = 12
) {
  try {
    const index = meilisearchClient.index(indexName)
    const searchResponse = await index.search("", {
      filter: [`vendor_handle = "${handle.replace(/"/g, '\\"')}"`],
      limit,
    })

    const hits = searchResponse.hits || []

    // Extract vendor profile attributes from the first hit found
    const sampleProduct = hits[0]
    const vendorMeta = sampleProduct
      ? {
        id: sampleProduct.vendor_id,
        name:
          sampleProduct.vendor_name ||
          sampleProduct.vendor_handle ||
          "Artisan Merchant",
        handle: sampleProduct.vendor_handle,
      }
      : null

    return {
      vendor: vendorMeta,
      hits: hits,
    }
  } catch (error) {
    console.error("Failed extracting store page assets from engine:", error)
    return { vendor: null, hits: [] }
  }
}
/**
 * Resolves vendor metadata and product hits using the raw vendor UUID index field.
 */
export async function getStorefrontDataByVendorId(
  vendorId: string,
  limit = 12
) {
  try {
    const index = meilisearchClient.index(indexName)
    const sanitizedId = vendorId.replace(/"/g, '\\"')

    const searchResponse = await index.search("", {
      filter: [`vendor_id = "${sanitizedId}"`],
      limit,
    })

    const hits = searchResponse.hits || []

    // Fallback info parsed safely from indexed item fields
    const sampleProduct = hits[0]
    const vendorMeta = sampleProduct
      ? {
        id: sampleProduct.vendor_id,
        name: sampleProduct.vendor_name || "Featured Artisan",
      }
      : null

    return {
      vendor: vendorMeta,
      hits: hits,
    }
  } catch (error) {
    console.error("Failed extracting store page assets by vendor ID:", error)
    return { vendor: null, hits: [] }
  }
}
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
