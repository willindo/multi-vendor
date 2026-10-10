// src/lib/search-server.ts
import { meilisearchClient } from "@lib/meilisearch-client"

const indexName = process.env.NEXT_PUBLIC_SEARCH_INDEX_NAME || "products"

export interface StoreFilterParams {
  id?: string | string[]
  q?: string
  query?: string
  page?: number
  limit?: number
  category_id?: string | string[]
  category?: string
  subcategory?: string
  collection_id?: string | string[]
  tag_id?: string | string[]
  tags?: string | string[]
  material?: string[]
  fit?: string[]
  sizes?: string[]
  colors?: string[]
  gender?: string
  minPrice?: number
  maxPrice?: number
  inStockOnly?: boolean
  sort?: string[]
  sortBy?: "price_asc" | "price_desc" | "created_at_desc"
}

export async function queryStorefrontCatalog(params: StoreFilterParams) {
  const {
    id,
    q,
    query,
    page = 1,
    limit = 12,
    category_id,
    category,
    subcategory,
    collection_id,
    tag_id,
    tags,
    material,
    fit,
    sizes,
    colors,
    gender,
    inStockOnly,
    minPrice,
    maxPrice,
    sort,
    sortBy,
  } = params

  const offset = (page - 1) * limit
  const searchTerm = q || query || ""
  const filters: string[] = []

  // Helpers
  const addEqualityFilter = (field: string, value?: string | string[]) => {
    if (!value) return
    if (Array.isArray(value) && value.length > 0) {
      const conditions = value.map((v) => `${field} = "${v.replace(/"/g, '\\"')}"`).join(" OR ")
      filters.push(`(${conditions})`)
    } else if (typeof value === "string") {
      filters.push(`${field} = "${value.replace(/"/g, '\\"')}"`)
    }
  }

  // ID & Handle Filters
  addEqualityFilter("id", id)
  // addEqualityFilter("handle", handle)

  // Taxonomy Filters
  addEqualityFilter("categories.id", category_id)
  addEqualityFilter("garment_category", category)
  addEqualityFilter("garment_subcategory", subcategory)
  addEqualityFilter("collection_id", collection_id)
  addEqualityFilter("tags.id", tag_id)
  addEqualityFilter("tags.value", tags)
  addEqualityFilter("gender", gender)

  // addEqualityFilter("id", (params as any).id)

  // Array Attribute Filters
  addEqualityFilter("material_type", material)
  addEqualityFilter("fit", fit)
  addEqualityFilter("sizes", sizes)
  addEqualityFilter("colors", colors)

  // Stock & Price Filters
  if (inStockOnly) {
    filters.push("inventory_quantity > 0")
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    const min = minPrice ?? 0
    const max = maxPrice ?? 1000000
    filters.push(`price ${min} TO ${max}`)
  }

  // Sort Resolution
  let sortOption: string[] = sort || []
  if (!sortOption.length && sortBy) {
    if (sortBy === "price_asc") sortOption = ["price:asc"]
    if (sortBy === "price_desc") sortOption = ["price:desc"]
    // if (sortBy === "created_at") sortOption = ["created_at:desc"]
    if (sortBy === "created_at_desc") sortOption = ["created_at:desc"]
  }

  try {
    const index = meilisearchClient.index(indexName)
    const response = await index.search(searchTerm, {
      offset,
      limit,
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      sort: sortOption,
      facets: [
        "garment_category",
        "garment_subcategory",
        "material_type",
        "fit",
        "sizes",
        "colors",
        "gender",
      ],
    })

    const totalHits = response.estimatedTotalHits || response.hits.length

    return {
      hits: response.hits || [],
      totalHits,
      facetDistribution: response.facetDistribution || {},
      page,
      totalPages: Math.ceil(totalHits / limit),
    }
  } catch (error) {
    console.error("[queryStorefrontCatalog] Search engine failure:", error)
    return { hits: [], totalHits: 0, facetDistribution: {}, page: 1, totalPages: 0 }
  }
}

export async function searchSuggestions(query: string, limit = 8) {
  if (!query.trim()) return []
  try {
    const index = meilisearchClient.index(indexName)
    const response = await index.search(query, { limit })
    return response.hits || []
  } catch (error) {
    console.error("[searchSuggestions] Error:", error)
    return []
  }
}

export async function searchHandles(query: string, limit = 48) {
  if (!query.trim()) return []
  try {
    const index = meilisearchClient.index(indexName)
    const response = await index.search(query, {
      limit,
      attributesToRetrieve: ["handle"],
    })
    return (response.hits || []).map((hit: any) => hit.handle).filter(Boolean)
  } catch (error) {
    console.error("[searchHandles] Error:", error)
    return []
  }
}