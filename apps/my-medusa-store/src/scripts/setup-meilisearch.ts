// src/scripts/setup-meilisearch.ts
import { getProductsIndex } from "../lib/meilisearch"

export default async function setupMeilisearch() {
 const index = await getProductsIndex()

  await index.updateFilterableAttributes([
    "vendor_id",

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
  ]);

  await index.updateSortableAttributes([]);

  await index.updateSearchableAttributes([
    "title",
    "description",

    "vendor_name",

    "garment_category",
    "garment_subcategory",

    "pattern",

    "material_composition",
  ]);

  console.log("✅ Meilisearch configured");
}
