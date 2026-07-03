import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export const reconcileVariantsStep = createStep(
  "reconcile-variants-step",
  async (
    input: { product_id: string; variants: any[]; variants_to_delete?: any[]; options: any[] },
    { container },
  ) => {
    console.log("🔍 reconcileVariantsStep - START");
    console.log("Input variants count:", input.variants?.length || 0);
    const variants = input.variants || [];
    const variantsToDelete = input.variants_to_delete || [];
    const options = input.options || [];

    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    console.log("🔍 Querying product in reconcile...");

    // ✅ FIX: Use query.graph() properly with GraphQL query syntax
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
        "variants.options.id",
        "variants.options.value",
        "variants.price_set.id",
        "variants.price_set.prices.id",
        "variants.price_set.prices.amount",
        "variants.price_set.prices.currency_code",
        "variants.inventory_items.*",
      ],
      filters: { id: [input.product_id] },
    });

    console.log("✅ reconcile query completed. Products:", currentProducts?.length || 0);
    console.log("🔍 reconcileVariantsStep - END");
    const dbProduct = currentProducts?.[0] || {};
    const dbOptions = dbProduct.options || [];
    const dbVariants = dbProduct.variants || [];

    // 2. Build variant map
    const variantMap = new Map();
    for (const variant of dbVariants) {
      variantMap.set(variant.id, variant);
    }

    // 3. Build lookups for options and option-value collections
    const dbOptionValuesMap = new Map<string, Set<string>>();
    const optionTitleToIdMap = new Map<string, string>();

    for (const option of dbOptions) {
      optionTitleToIdMap.set(option.title, option.id);
      const values = (option.values || []).map((v: any) => v.value);
      dbOptionValuesMap.set(option.title, new Set(values));
    }

    // 4. Trace variant configurations for missing properties
    const missingOptionValues: Record<string, string[]> = {};
    for (const variant of variants) {
      if (Array.isArray(variant.options)) {
        variant.options.forEach((opt: any) => {
          if (!opt.optionName || !opt.value) return;

          const existingValues = dbOptionValuesMap.get(opt.optionName);
          if (!existingValues) return;

          if (!existingValues.has(opt.value)) {
            if (!missingOptionValues[opt.optionName]) {
              missingOptionValues[opt.optionName] = [];
            }
            if (!missingOptionValues[opt.optionName].includes(opt.value)) {
              missingOptionValues[opt.optionName].push(opt.value);
            }
          }
        });
      }
    }

    const creates: any[] = [];
    const updates: any[] = [];
    const inventoryUpdates: any[] = [];

    const deletes: string[] = variantsToDelete
      .map((v: any) => (typeof v === "object" ? v.id : v))
      .filter(Boolean);

    // 5. Group operations
    for (const v of variants) {
      const rawPrice = v.price ?? 0;
      const currency = (v.currencyCode ?? "usd").toLowerCase();
      const inventoryQuantity = v.inventory_quantity ?? 0;

      // CREATE
      if (!v.id) {
        const optionValuesRecord: Record<string, string> = {};
        if (Array.isArray(v.options)) {
          v.options.forEach((opt: any) => {
            if (opt.optionName && opt.value) {
              optionValuesRecord[opt.optionName] = opt.value;
            }
          });
        }

        creates.push({
          title: v.title || "Untitled Variant",
          sku: v.sku || `SKU-${Date.now()}`,
          manage_inventory: v.manage_inventory ?? true,
          initial_inventory_quantity: inventoryQuantity,
          prices: [
            {
              amount: Math.round(rawPrice * 100),
              currency_code: currency,
            },
          ],
          options: optionValuesRecord,
        });
      }
      // UPDATE
      else if (v.id) {
        const existingVariant = variantMap.get(v.id);

        if (existingVariant) {
          const existingPrice = existingVariant.price_set?.prices?.[0];

          const updatePayload: any = {
            id: v.id,
            title: v.title || existingVariant.title,
            sku: v.sku || existingVariant.sku,
            manage_inventory: v.manage_inventory ?? true,
          };

          if (existingPrice) {
            updatePayload.prices = [
              {
                id: existingPrice.id,
                amount: Math.round(rawPrice * 100),
                currency_code: currency,
              },
            ];
          } else {
            updatePayload.prices = [
              {
                amount: Math.round(rawPrice * 100),
                currency_code: currency,
              },
            ];
          }

          updates.push(updatePayload);

          if (existingVariant.inventory_items?.[0]) {
            const inventoryItem = existingVariant.inventory_items[0];
            inventoryUpdates.push({
              inventory_item_id: inventoryItem.inventory_item_id || inventoryItem.id,
              stocked_quantity: inventoryQuantity,
            });
          }
        }
      }
    }

    const result = {
      creates,
      updates,
      deletes,
      inventoryUpdates,
      missingOptions: options.filter((opt) => !optionTitleToIdMap.has(opt.title)),
      missingOptionValues,
    };

    console.log("📊 State Reconciliation Complete:", {
      createsCount: result.creates.length,
      updatesCount: result.updates.length,
      inventoryUpdatesCount: result.inventoryUpdates.length,
      deletesCount: result.deletes.length,
    });

    return new StepResponse(result);
  },
);

export default reconcileVariantsStep;