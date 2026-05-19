// src/subscribers/product-upsert.ts
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function productUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  console.log(`🔍 Search Index Sync triggered for Product: ${productId}`)

  try {
    // 1. Resolve the ESM/CommonJS boundary at runtime using dynamic import()
    // Note: The named export uses a capital 'S' -> MeiliSearch
    const { Meilisearch } = await import("meilisearch")
    
    const meiliClient = new Meilisearch({
      host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
      apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
    })

    // 2. Fetch product data along with linked vendor data using the Remote Query graph
    const { data: [product] } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "handle",
        "thumbnail",
        "vendor.*" 
      ],
      filters: {
        id: [productId],
      },
    })

    if (!product) {
      console.log(`⚠️ Product ${productId} not found. Skipping indexing.`)
      return
    }

    // 3. Format a flat document specifically optimized for your cloth wear storefront
    const searchDocument = {
      id: product.id,
      title: product.title,
      description: product.description,
      handle: product.handle,
      thumbnail: product.thumbnail,
      vendor_id: product.vendor?.id || "platform",
      vendor_name: product.vendor?.name || "Platform Store",
    }

    // 4. Push data straight to your "products" index
    const index = meiliClient.index("products")
    await index.addDocuments([searchDocument])

    console.log(`✅ Successfully synced cloth item "${product.title}" to Meilisearch under Vendor: ${searchDocument.vendor_name}`)

  } catch (error: any) {
    console.error(`❌ Failed to sync product ${productId} to Meilisearch:`, error.message)
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}