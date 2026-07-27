import { getProductsIndex } from "../lib/meilisearch";

export default async function setupMeilisearch() {
  const index = await getProductsIndex();

  // 1. Filterable Attributes (Used in sidebar filters)
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
    "price",               // Price filtering (e.g., price >= 10 AND price <= 50)
    "inventory_quantity"   // Stock filtering (e.g., inventory_quantity > 0)
  ]);

  // 2. Sortable Attributes (Used for storefront sorting dropdowns)
  await index.updateSortableAttributes([
    "price",
    "inventory_quantity"
  ]);

  // 3. Distinct Attribute (Ensures unique products)
  await index.updateDistinctAttribute("id");

  // 4. Searchable Attributes (Ordered by priority top-to-bottom)
  await index.updateSearchableAttributes([
    "title",
    "merchant_skus",         // SKU matches prioritized early
    "colors",                // 🟢 Added so queries like "navy shirt" match
    "sizes",                 // 🟢 Added so queries like "XL hoodie" match
    "garment_category",
    "garment_subcategory",
    "vendor_name",
    "vendor_handle",
    "pattern",
    "material_composition",
    "description"
  ]);

  // 5. Ranking Rules (Prioritizes in-stock items & relevance)
  await index.updateRankingRules([
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
    "inventory_quantity:desc" // 🟢 Shows available stock higher in results
  ]);

  // 6. Faceting Configuration
  await index.updateFaceting({
    maxValuesPerFacet: 100,
  });

  console.log("✅ Meilisearch configuration updated successfully");
}