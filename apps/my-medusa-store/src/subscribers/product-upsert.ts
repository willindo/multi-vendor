// src/subscribers/product-upsert.ts

import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { getProductsIndex } from "../lib/meilisearch";

export default async function productUpsertHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {

  const productId = data.id;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const inventoryService = container.resolve(Modules.INVENTORY);
  const logger = container.resolve("logger");

  console.log(`🔍 Search Index Sync triggered for Product: ${productId}`);

  try {
    const index = await getProductsIndex();

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
        "variants.price_set.prices.*",
        "variants.metadata",
        "variants.inventory_items.*",
        "variants.inventory_items.inventory_item_id",
        "deleted_at",
        "vendor.id",
        "vendor.name",
        "vendor.handle",
        "apparel_detail.*",
      ],
      filters: {
        id: [productId],
      },
    });

    if (!product || product.deleted_at) {
      console.log(`🗑️ Product ${productId} removed from search index.`);
      await index.deleteDocument(productId);
      return;
    }

    if (!product) {
      logger.warn(`⚠️ Search synchronization skipped: Product ${productId} not found.`);
      return;
    }

    const vendor = Array.isArray(product.vendor) ? product.vendor[0] : product.vendor;
    const apparel = Array.isArray(product.apparel_detail) ? product.apparel_detail[0] : product.apparel_detail;

    const extractOptionValues = (optionName: string): string[] => {
      return Array.from(
        new Set(
          (product.variants ?? [])
            .map((variant: any) =>
              variant.options?.find(
                (o: any) =>
                  o.option?.title?.toLowerCase() === optionName.toLowerCase()
              )?.value
            )
            .filter(Boolean)
        )
      );
    };

    const prices = (product.variants ?? []).flatMap(
      (variant: any) => variant.price_set?.prices?.map((price: any) => price.amount) ?? []
    );

    // Collect inventory item IDs
    const inventoryItemIds: string[] = (product.variants as any[])?.flatMap(
      (v) => v.inventory_items?.map((inv: any) => inv.inventory_item_id || inv.id) || []
    ).filter(Boolean) || [];

    const inventoryMap = new Map<string, number>();

    if (inventoryItemIds.length > 0) {
      const levels = await inventoryService.listInventoryLevels({
        inventory_item_id: inventoryItemIds,
      });

      levels.forEach((lvl) => {
        const currentStock = inventoryMap.get(lvl.inventory_item_id) || 0;
        inventoryMap.set(lvl.inventory_item_id, currentStock + (lvl.stocked_quantity || 0));
      });
    }

    const calculatedInventoryQuantity = (product.variants as any[])?.reduce((acc: number, v: any) => {
      const variantStock = v.inventory_items?.reduce((invAcc: number, inv: any) => {
        const itemId = inv.inventory_item_id || inv.id;
        return invAcc + (inventoryMap.get(itemId) || 0);
      }, 0) || 0;
      return acc + variantStock;
    }, 0) || 0;

    const searchDocument = {
      id: product.id,

      // ✅ Fix: Show both SKU types clearly
      variants: product.variants?.map((v: any) => ({
        id: v.id,
        internal_sku: v.sku,                           // ✅ Internal SKU (vendor_01-CCT-L-WHT)
        merchant_sku: v.metadata?.merchant_sku || v.sku, // ✅ Merchant SKU (CCT-L-WHT)
      })),

      title: product.title,
      description: product.description ?? "Premium clothing wear item.",
      handle: product.handle,
      thumbnail: product.thumbnail ?? "",

      // ✅ Searchable by merchant SKU for vendor convenience
      merchant_skus: (product.variants ?? [])
        .map((v: any) => v.metadata?.merchant_sku || v.sku)
        .filter(Boolean),

      sizes: extractOptionValues("Size"),
      colors: extractOptionValues("Color"),

      vendor_id: vendor?.id ?? "platform",
      vendor_name: vendor?.name ?? "Platform Store",
      vendor_handle: vendor?.handle ?? null,

      // Apparel fields...
      gender: apparel?.gender ?? "UNISEX",
      age_group: apparel?.age_group ?? null,
      sizing_group: apparel?.sizing_group ?? null,
      garment_category: apparel?.garment_category ?? null,
      garment_subcategory: apparel?.garment_subcategory ?? null,
      fit: apparel?.fit ?? "REGULAR",
      pattern: apparel?.pattern ?? "SOLID",
      style_type: apparel?.style_type ?? "CASUAL",
      occasion: apparel?.occasion ?? null,
      sleeve_type: apparel?.sleeve_type ?? null,
      neck_type: apparel?.neck_type ?? null,
      material_type: apparel?.material_type ?? "NATURAL",
      material_composition: apparel?.material_composition ?? null,
      season: apparel?.season ?? "ALL_SEASON",
      condition: apparel?.condition ?? "NEW",

      price: prices.length > 0 ? Math.min(...prices) : 0,
      inventory_quantity: calculatedInventoryQuantity,
    };

    await index.addDocuments([searchDocument]);

    console.log(`✅ Synced "${product.title}" to Meilisearch.`);
  } catch (err: any) {
    console.error(`❌ Failed syncing product ${productId}:`, err.message);
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};