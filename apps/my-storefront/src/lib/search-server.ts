import { Meilisearch } from "meilisearch"

const client = new Meilisearch({
  host:
    process.env.NEXT_PUBLIC_MEILISEARCH_HOST!,
  apiKey:
    process.env.NEXT_PUBLIC_SEARCH_API_KEY!,
})

const index = client.index(
  process.env.NEXT_PUBLIC_SEARCH_INDEX_NAME ||
    "products"
)

export async function searchSuggestions(
  query: string,
  limit = 8
) {
  if (!query.trim()) {
    return []
  }

  const response = await index.search(query, {
    limit,
  })

  return response.hits
}

export async function searchHandles(
  query: string,
  limit = 48
) {
  if (!query.trim()) {
    return []
  }

  const response = await index.search(query, {
    limit,
    attributesToRetrieve: [
      "handle",
    ],
  })

  return response.hits
    .map(
      (hit: any) => hit.handle
    )
    .filter(Boolean)
}