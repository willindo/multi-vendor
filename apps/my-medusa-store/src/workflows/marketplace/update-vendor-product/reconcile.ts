// src/workflows/marketplace/update-vendor-product/reconcile.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export interface InventoryUpdateInput {
  inventory_item_id: string;
  stocked_quantity: number;
}

export const reconcileVariantsStep = createStep(
  "reconcile-variants-step",
  async (
    input: { product_id: string; variants: any[]; variants_to_delete?: any[]; options: any[] },
    { container },
  ) => {
    const variants = input.variants || [];
    const variantsToDelete = input.variants_to_delete || [];
    const options = input.options || [];

    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Fetch current product with all variant data
    const { data: currentProducts } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "options.id",
        "options.title",
        "options.values.id",
        "options.values.value",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.manage_inventory",
        "variants.metadata",
        "variants.options.id",
        "variants.options.value",
        "variants.price_set.id",
        "variants.price_set.prices.id",
        "variants.price_set.prices.amount",
        "variants.price_set.prices.currency_code",
        "variants.inventory_items.inventory_item.id",
        "variants.inventory_items.inventory_item_id"
      ],
      filters: { id: input.product_id }
    });

    const currentProduct = currentProducts?.[0];
    const existingVariants = currentProduct?.variants || [];

    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: string[] = [...variantsToDelete];
    const inventoryUpdates: InventoryUpdateInput[] = [];
    const missingOptionValues: Record<string, string[]> = {};

    // Build option mappings
    const optionTitleToIdMap = new Map(
      currentProduct?.options?.map((o: any) => [o.title, o.id]) || []
    );

    const optionValueToIdMap = new Map();
    currentProduct?.options?.forEach((o: any) => {
      o.values?.forEach((v: any) => {
        optionValueToIdMap.set(`${o.id}-${v.value}`, v.id);
      });
    });

    // Process each variant
    for (const v of variants) {
      // ✅ Match using internal SKU (already normalized)
      const existingVariant = existingVariants.find((ev: any) => ev.sku === v.sku);

      if (!existingVariant) {
        // CREATE new variant
        const variantOptions: Record<string, string> = {};
        if (v.options) {
          for (const [optKey, optVal] of Object.entries(v.options)) {
            const optId = optionTitleToIdMap.get(optKey);
            if (optId) {
              const valId = optionValueToIdMap.get(`${optId}-${optVal}`);
              if (valId) {
                variantOptions[optId] = valId;
              } else {
                if (!missingOptionValues[optId]) missingOptionValues[optId] = [];
                if (!missingOptionValues[optId].includes(optVal as string)) {
                  missingOptionValues[optId].push(optVal as string);
                }
              }
            }
          }
        }

        creates.push({
          title: v.title || v.sku,
          sku: v.sku, // ✅ Already internal SKU
          manage_inventory: v.manage_inventory ?? true,
          allow_backorder: v.allow_backorder ?? false,
          inventory_quantity: v.inventory_quantity ?? 0,
          options: variantOptions,
          metadata: v.metadata, // ✅ Preserves merchant_sku
          prices: v.priceAmount && v.currencyCode ? [{
            amount: Math.round(v.priceAmount * 100),
            currency_code: v.currencyCode.toLowerCase()
          }] : []
        });
      } else {
        // UPDATE existing variant
        const updatePayload: any = { id: existingVariant.id };
        let hasChanges = false;

        if (v.title && v.title !== existingVariant.title) {
          updatePayload.title = v.title;
          hasChanges = true;
        }

        // Update metadata if merchant_sku changed
        if (v.metadata?.merchant_sku &&
          v.metadata.merchant_sku !== existingVariant.metadata?.merchant_sku) {
          updatePayload.metadata = {
            ...existingVariant.metadata,
            merchant_sku: v.metadata.merchant_sku,
          };
          hasChanges = true;
        }

        if (v.priceAmount && v.currencyCode) {
          const rawPrice = v.priceAmount;
          const currency = v.currencyCode.toLowerCase();
          const existingPrice = existingVariant.price_set?.prices?.find(
            (p: any) => p.currency_code === currency
          );

          if (!existingPrice || existingPrice.amount !== Math.round(rawPrice * 100)) {
            updatePayload.prices = [{
              amount: Math.round(rawPrice * 100),
              currency_code: currency
            }];
            hasChanges = true;
          }
        }

        if (hasChanges) {
          updates.push(updatePayload);
        }

        // ✅ Handle inventory updates
        if (
          v.inventory_quantity !== undefined &&
          existingVariant.manage_inventory &&
          existingVariant.inventory_items?.length
        ) {
          // Try both possible paths for inventory_item_id
          const inventoryItemId = existingVariant.inventory_items?.[0]?.inventory_item_id;

          if (inventoryItemId) {
            inventoryUpdates.push({
              inventory_item_id: inventoryItemId,
              stocked_quantity: Number(v.inventory_quantity),
            });
          }
        }
      }
    }

    return new StepResponse({
      creates,
      updates,
      deletes,
      inventoryUpdates,
      missingOptions: options.filter((opt) => !optionTitleToIdMap.has(opt.title)),
      missingOptionValues,
    });
  },
);

export default reconcileVariantsStep; 