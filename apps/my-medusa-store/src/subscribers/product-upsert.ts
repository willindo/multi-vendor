// src/subscribers/product-upsert.ts
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { getProductsIndex } from "../lib/meilisearch";

export default async function productUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  console.log(`🔍 Search Index Sync triggered for Product: ${productId}`);

  try {
    const index = await getProductsIndex();
    // 2. Fetch product data along with linked metadata via Remote Query Graph
    const {
      data: [product],
    } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "handle",
        "thumbnail",
        "variants.*",
        "variants.options.*",
        "variants.options.option.*",
        "deleted_at", // ⚡ CRITICAL: Fetch timestamp to catch soft-deletes
        "vendor.*",
        "apparel_detail.*",
      ],
      filters: {
        id: [productId],
      },
    });

    // 3. Handle Soft-Deletes: If the product has a timestamp or is gone, remove it from storefront search
    if (!product || product.deleted_at) {
      console.log(
        `🗑️ Product ${productId} is soft-deleted or missing. Purging from search index.`,
      );
      await index.deleteDocument(productId);
      return;
    }
    // 4. Safely unwrap data relations whether they return as arrays or distinct objects
    const vendorData = Array.isArray(product.vendor)
      ? product.vendor[0]
      : product.vendor;

    const apparelData = Array.isArray(product.apparel_detail)
      ? product.apparel_detail[0]
      : product.apparel_detail;

    // 5. Build an optimized flat document structure matching your database columns
    const searchDocument = {
      id: product.id,

      title: product.title,
      description: product.description,
      handle: product.handle,
      thumbnail: product.thumbnail,

      sizes:
        product.variants?.map(
          (v) => v.options?.find((o) => o.option?.title === "Size")?.value,
        ) ?? [],

      colors:
        product.variants?.map(
          (v) => v.options?.find((o) => o.option?.title === "Color")?.value,
        ) ?? [],

      vendor_id: vendorData?.id || "platform",
      vendor_name: vendorData?.name || "Platform Store",

      gender: apparelData?.gender || "UNISEX",
      age_group: apparelData?.age_group || null,
      sizing_group: apparelData?.sizing_group || null,

      garment_category: apparelData?.garment_category || null,

      garment_subcategory: apparelData?.garment_subcategory || null,

      fit: apparelData?.fit || "REGULAR",

      pattern: apparelData?.pattern || "SOLID",

      style_type: apparelData?.style_type || "CASUAL",

      occasion: apparelData?.occasion || null,

      sleeve_type: apparelData?.sleeve_type || null,

      neck_type: apparelData?.neck_type || null,

      material_type: apparelData?.material_type || "NATURAL",

      material_composition: apparelData?.material_composition || null,

      season: apparelData?.season || "ALL_SEASON",

      condition: apparelData?.condition || "NEW",
    };
    // 6. Push verified dataset payload directly to Meilisearch

    await index.addDocuments([searchDocument]);

    console.log(
      `✅ Successfully synced cloth item "${product.title}" to Meilisearch under Vendor: ${searchDocument.vendor_name}`,
    );
  } catch (error: any) {
    console.error(
      `❌ Failed to sync product ${productId} to Meilisearch:`,
      error.message,
    );
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
