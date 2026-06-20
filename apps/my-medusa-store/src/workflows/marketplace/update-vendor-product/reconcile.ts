import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export const reconcileVariantsStep = createStep(
  "reconcile-variants-step",
  async (
    input: { product_id: string; variants: any[]; options: any[] },
    { container },
  ) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    // const missingOptions = input.options.filter(
    //   (opt) => !optionTitleToIdMap.has(opt.title),
    // );
    // const normalizedMissingOptions = missingOptions.map((opt) => ({
    //   title: opt.title,
    //   values: (opt.values || []).map((v: any) =>
    //     typeof v === "string" ? v : v.value,
    //   ),
    // }));

    // 1. Fetch current live structural snapshot from the database graph
    const { data: currentProducts } = await query.graph({
      entity: "product",
      fields: ["id", "options.*", "variants.*", "variants.options.*"],
      filters: { id: [input.product_id] },
    });

    const dbProduct = currentProducts[0];
    if (!dbProduct) {
      throw new Error(
        `Product ${input.product_id} not found during reconciliation.`,
      );
    }

    const dbOptions = dbProduct.options || [];
    const optionTitleToIdMap = new Map<string, string>(
      dbOptions.map((o: any) => [o.title, o.id]),
    );

    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: string[] = [];

    // 2. Compute state-based difference matrix buckets
    for (const v of input.variants) {
      const rawPrice = v.price ?? 0;
      const currency = (v.currencyCode ?? "usd").toLowerCase();

      // --- LANE 1: CREATE ---
      if (!v.id && v.enabled === true) {
        const optionValuesRecord: Record<string, string> = {};
        if (Array.isArray(v.options)) {
          v.options.forEach((opt: any) => {
            if (opt.optionName && opt.value) {
              optionValuesRecord[opt.optionName] = opt.value;
            }
          });
        }

        creates.push({
          title: v.title,
          sku: v.sku,
          // inventory_items: v.inventoryQuantity !== undefined ? [{
          //   inventory_item_id: null,
          //   required_quantity: 1,
          // }] : [],
          prices: [
            {
              amount: Math.round(rawPrice * 100),
              currency_code: currency,
            },
          ],
          options: optionValuesRecord,
        });
      }
      // --- LANE 2: UPDATE ---
      else if (v.id && v.enabled === true) {
        const existingVariant = (dbProduct.variants || []).find(
          (dv: any) => dv.id === v.id,
        );
        if (existingVariant) {
          updates.push({
            id: v.id,
            title: v.title,
            sku: v.sku,
            prices: [
              {
                amount: Math.round(rawPrice * 100),
                currency_code: currency,
              },
            ],
            // inventory_quantity: v.inventoryQuantity
          });
        }
      }
      // --- LANE 3: DELETE ---
      else if (v.id && v.enabled === false) {
        deletes.push(v.id);
      }
    }

    console.log("📊 State Reconciliation Computation Target Complete:", {
      createsCount: creates.length,
      updatesCount: updates.length,
      deletesCount: deletes.length,
    });

    return new StepResponse({
      creates,
      updates,
      deletes,
      missingOptions: input.options.filter(
        (opt) => !optionTitleToIdMap.has(opt.title),
      ),
    });
  },
);
