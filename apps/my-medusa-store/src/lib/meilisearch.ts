// src/lib/meilisearch.ts
let client: any = null
let productsIndex: any = null

export async function getMeilisearchClient() {
  if (!client) {
    const { Meilisearch } = await import("meilisearch")

    client = new Meilisearch({
      host:
        process.env.MEILISEARCH_HOST
        ?? "http://127.0.0.1:7700",
      // ?? "http://localhost:7700",

      apiKey:
        process.env.MEILISEARCH_API_KEY
        ?? "masterKey",
    })

    console.log("🔌 Meilisearch client initialized")
  }

  return client
}

export async function getProductsIndex() {
  if (!productsIndex) {
    const meiliClient =
      await getMeilisearchClient()

    productsIndex =
      meiliClient.index("products")

    console.log("📦 Products index initialized")
  }

  return productsIndex
}