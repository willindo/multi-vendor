// src/workflows/marketplace/update-vendor-product/steps/update-prices.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

export type PriceInput = {
    id?: string;
    currency_code: string;
    amount: number;
    min_quantity?: number;
    max_quantity?: number;
};

export type VariantPriceUpdate = {
    variant_id: string;
    prices: PriceInput[];
};

export type UpdatePricesStepInput = {
    product_id: string;
    variantPrices: VariantPriceUpdate[];
};

type UpdatePricesOutput = {
    updated: number;
    added: number;
};

type PriceRollbackItem = {
    price_set_id: string;
    prices: {
        id?: string;
        amount: number;
        currency_code: string; // Required string, not string | undefined
    }[];
};

export const updatePricesStep = createStep(
    "update-prices-step",
    async (
        input: UpdatePricesStepInput,
        { container }
    ): Promise<StepResponse<UpdatePricesOutput, PriceRollbackItem[]>> => {
        if (!input.variantPrices?.length) {
            return new StepResponse({ updated: 0, added: 0 }, []);
        }

        const query = container.resolve("query");
        const pricingModuleService = container.resolve(Modules.PRICING);

        const { data: variants } = await query.graph({
            entity: "product_variant",
            fields: [
                "id",
                "price_set.id",
                "price_set.prices.id",
                "price_set.prices.currency_code",
                "price_set.prices.amount",
            ],
            filters: {
                product_id: input.product_id,
            },
        });

        const rollbackData: PriceRollbackItem[] = [];
        const priceSetUpdates: {
            id: string;
            prices: { id: string; currency_code: string; amount: number }[];
        }[] = [];

        const priceSetsToAdd: {
            priceSetId: string;
            prices: { currency_code: string; amount: number }[];
        }[] = [];

        const typedVariants = variants as {
            id: string;
            price_set?: {
                id: string;
                prices?: { id: string; currency_code: string; amount: number }[];
            };
        }[];

        for (const vUpdate of input.variantPrices) {
            const variant = typedVariants.find((v) => v.id === vUpdate.variant_id);
            const priceSetId = variant?.price_set?.id;

            if (!priceSetId) continue;

            const existingPrices = variant.price_set?.prices || [];
            const pricesToUpdateInSet: { id: string; currency_code: string; amount: number }[] = [];
            const rollbackPricesForSet: { id: string; currency_code: string; amount: number }[] = [];
            const newPricesForSet: { currency_code: string; amount: number }[] = [];

            for (const newPrice of vUpdate.prices) {
                const existingPrice = existingPrices.find(
                    (p) => p.currency_code.toLowerCase() === newPrice.currency_code.toLowerCase()
                );

                if (existingPrice) {
                    if (Number(existingPrice.amount) !== Number(newPrice.amount)) {
                        pricesToUpdateInSet.push({
                            id: existingPrice.id,
                            currency_code: existingPrice.currency_code,
                            amount: newPrice.amount,
                        });

                        rollbackPricesForSet.push({
                            id: existingPrice.id,
                            currency_code: existingPrice.currency_code,
                            amount: Number(existingPrice.amount),
                        });
                    }
                } else {
                    newPricesForSet.push({
                        currency_code: newPrice.currency_code.toLowerCase(),
                        amount: newPrice.amount,
                    });
                }
            }

            if (pricesToUpdateInSet.length > 0) {
                priceSetUpdates.push({
                    id: priceSetId,
                    prices: pricesToUpdateInSet,
                });

                rollbackData.push({
                    price_set_id: priceSetId,
                    prices: rollbackPricesForSet,
                });
            }

            if (newPricesForSet.length > 0) {
                priceSetsToAdd.push({
                    priceSetId,
                    prices: newPricesForSet,
                });
            }
        }

        // 1. Update Existing Price Sets using (id, { prices })
        if (priceSetUpdates.length > 0) {
            for (const update of priceSetUpdates) {
                await pricingModuleService.updatePriceSets(update.id, {
                    prices: update.prices,
                });
            }
        }

        // 2. Add New Prices
        if (priceSetsToAdd.length > 0) {
            await pricingModuleService.addPrices(priceSetsToAdd);
        }

        const totalUpdated = priceSetUpdates.reduce((acc, set) => acc + set.prices.length, 0);
        const totalAdded = priceSetsToAdd.reduce((acc, set) => acc + set.prices.length, 0);

        return new StepResponse({ updated: totalUpdated, added: totalAdded }, rollbackData);
    },
    async (rollbackData, { container }) => {
        if (!rollbackData?.length) return;
        const pricingModuleService = container.resolve(Modules.PRICING);

        // Compensation step ensuring currency_code satisfies CreatePricesDTO
        for (const rollbackItem of rollbackData) {
            await pricingModuleService.updatePriceSets(rollbackItem.price_set_id, {
                prices: rollbackItem.prices.map((price) => ({
                    id: price.id,
                    amount: price.amount,
                    currency_code: price.currency_code,
                })),
            });
        }
    }
);