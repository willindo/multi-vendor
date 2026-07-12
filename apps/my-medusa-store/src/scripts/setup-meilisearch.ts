// src/scripts/setup-meilisearch.ts
import { getProductsIndex } from "../lib/meilisearch";

export default async function setupMeilisearch() {
  const index = await getProductsIndex();

  await index.updateFilterableAttributes([
    "vendor_id",
    "sizes",
    "colors",
    "gender",
    "age_group",
    "sizing_group",
    "garment_category",
    "garment_subcategory",
    "fit",
    "pattern",
    "style_type",
    "occasion",
    "sleeve_type",
    "neck_type",
    "material_type",
    "season",
    "condition",
    "price",               // 🟢 Enabled for filter matching (e.g. price between x and y)
    "inventory_quantity"   // 🟢 Enabled to hide out of stock items
  ]);

  await index.updateSortableAttributes([
    "price",               // 🟢 Registered for sorting features
    "inventory_quantity"
  ]);

  await index.updateDistinctAttribute("id");

  await index.updateSearchableAttributes([
    "title",
    "description",
    "vendor_name",
    "vendor_handle",
    "garment_category",
    "garment_subcategory",
    "pattern",
    "material_composition",
    "merchant_skus",
  ]);

  await index.updateFaceting({
    maxValuesPerFacet: 100,
  });

  console.log("✅ Meilisearch configuration updated successfully");
}