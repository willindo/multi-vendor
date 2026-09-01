// ==== ./src/workflows / marketplace / update - vendor - product / option - resolver.ts ====
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export type VariantOptionInput = {
    options?: Record<string, string>; // e.g. { "Color": "Khaki", "Size": "S" }
};

export type ResolveOptionsInput = {
    product_id: string;
    variants: VariantOptionInput[];
};

type ResolveOptionsStepOutput = {
    success: boolean;
};

type ResolveOptionsRollbackData = {
    createdOptionIds: string[];
    createdValueIds: string[];
};

export const resolveOptionsStep = createStep(
    "resolve-options-step",
    async (
        input: ResolveOptionsInput,
        { container }
    ): Promise<StepResponse<ResolveOptionsStepOutput, ResolveOptionsRollbackData>> => {
        if (!input.variants?.length) {
            return new StepResponse({ success: true }, { createdOptionIds: [], createdValueIds: [] });
        }

        const productService = container.resolve(Modules.PRODUCT);
        const query = container.resolve(ContainerRegistrationKeys.QUERY);

        // 1. Query existing options and option values for this product
        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "options.id", "options.title", "options.values.id", "options.values.value"],
            filters: { id: input.product_id },
        });

        const existingProduct = products[0] as {
            id: string;
            options?: {
                id: string;
                title: string;
                values?: { id: string; value: string }[];
            }[];
        } | undefined;

        if (!existingProduct) {
            return new StepResponse({ success: true }, { createdOptionIds: [], createdValueIds: [] });
        }

        // Map existing options: Title (lowercase) -> { id, valuesMap: Value (lowercase) -> id }
        const optionMap = new Map<
            string,
            { id: string; values: Map<string, string> }
        >();

        for (const opt of existingProduct.options ?? []) {
            const valMap = new Map<string, string>();
            for (const val of opt.values ?? []) {
                valMap.set(val.value.toLowerCase(), val.id);
            }
            optionMap.set(opt.title.toLowerCase(), {
                id: opt.id,
                values: valMap,
            });
        }

        // 2. Extract distinct options & values from incoming variants
        const incomingOptions = new Map<string, Set<string>>();

        for (const v of input.variants) {
            if (!v.options) continue;
            for (const [title, val] of Object.entries(v.options)) {
                if (!title || !val) continue;
                const normTitle = title.trim();
                const normVal = val.trim();

                if (!incomingOptions.has(normTitle)) {
                    incomingOptions.set(normTitle, new Set());
                }
                incomingOptions.get(normTitle)!.add(normVal);
            }
        }

        const createdOptionIds: string[] = [];
        const createdValueIds: string[] = [];

        // 3. Ensure options and option values exist in database
        for (const [optTitle, valSet] of incomingOptions.entries()) {
            const normTitle = optTitle.toLowerCase();
            let existingOpt = optionMap.get(normTitle);

            // Create product_option if missing
            if (!existingOpt) {
                const [newOpt] = await productService.createProductOptions([
                    {
                        product_id: input.product_id,
                        title: optTitle,
                        values: Array.from(valSet),
                    },
                ]);

                createdOptionIds.push(newOpt.id);

                // Update local memory map
                const valMap = new Map<string, string>();
                for (const v of newOpt.values ?? []) {
                    valMap.set(v.value.toLowerCase(), v.id);
                }
                optionMap.set(normTitle, { id: newOpt.id, values: valMap });
            } else {
                // Option exists -> filter strictly for values missing in DB
                const missingValues = Array.from(valSet).filter(
                    (v) => !existingOpt!.values.has(v.toLowerCase())
                );

                if (missingValues.length > 0) {
                    const newValues = await productService.createProductOptionValues(
                        missingValues.map((v) => ({
                            option_id: existingOpt!.id,
                            value: v,
                        }))
                    );

                    for (const nv of newValues) {
                        createdValueIds.push(nv.id);
                        existingOpt.values.set(nv.value.toLowerCase(), nv.id);
                    }
                }
            }
        }

        return new StepResponse({ success: true }, { createdOptionIds, createdValueIds });
    },

    // Compensation / Rollback Logic
    async (rollbackState, { container }) => {
        if (!rollbackState) return;
        const productService = container.resolve(Modules.PRODUCT);

        // 1. Delete created option values first (child records)
        if (rollbackState.createdValueIds?.length) {
            await productService.deleteProductOptionValues(rollbackState.createdValueIds);
        }

        // 2. Delete created options (parent records)
        if (rollbackState.createdOptionIds?.length) {
            await productService.deleteProductOptions(rollbackState.createdOptionIds);
        }
    }
);