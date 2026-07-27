// src/workflows/marketplace/update-vendor-product/steps/update-inventory.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

export type InventoryUpdateItem = {
    variant_id?: string;
    sku?: string;
    stocked_quantity?: number;
    inventory_quantity?: number;
};

export type UpdateInventoryInput = {
    product_id: string;
    inventoryUpdates: InventoryUpdateItem[];
    location_id?: string;
};

type UpdateInventoryOutput = {
    updated: number;
    created: number;
};

type RollbackUpdateItem = {
    id: string;
    inventory_item_id: string;
    location_id: string;
    prev_stocked_quantity: number;
};

type InventoryRollbackData = {
    createdLevelIds: string[];
    rollbackData: RollbackUpdateItem[];
};

type QueryProductVariantGraph = {
    id: string;
    sku: string;
    manage_inventory: boolean;
    inventory_items?: {
        inventory_item_id: string;
        inventory_item?: {
            location_levels?: {
                id: string;
                location_id: string;
                stocked_quantity: number;
            }[];
        };
    }[];
};

export const updateInventoryStep = createStep(
    "update-inventory-step",
    async (
        input: UpdateInventoryInput,
        { container }
    ): Promise<StepResponse<UpdateInventoryOutput, InventoryRollbackData>> => {
        const emptyRollback: InventoryRollbackData = {
            createdLevelIds: [],
            rollbackData: [],
        };

        if (!input.inventoryUpdates?.length) {
            return new StepResponse({ updated: 0, created: 0 }, emptyRollback);
        }

        const query = container.resolve("query");
        const inventoryService = container.resolve(Modules.INVENTORY);
        const locationId =
            input.location_id || process.env.MEDUSA_STOCK_LOCATION_ID;

        if (!locationId) {
            throw new Error("Missing stock location ID for inventory update.");
        }

        const { data: products } = await query.graph({
            entity: "product",
            fields: [
                "variants.id",
                "variants.sku",
                "variants.manage_inventory",
                "variants.inventory_items.inventory_item_id",
            ],
            filters: { id: input.product_id },
        });

        const product = products[0] as { variants?: QueryProductVariantGraph[] } | undefined;
        if (!product) {
            return new StepResponse({ updated: 0, created: 0 }, emptyRollback);
        }

        const levelsToCreate: {
            inventory_item_id: string;
            location_id: string;
            stocked_quantity: number;
        }[] = [];

        const levelsToUpdate: {
            id: string;
            inventory_item_id: string;
            location_id: string;
            stocked_quantity: number;
        }[] = [];

        const rollbackData: RollbackUpdateItem[] = [];
        const createdLevelIds: string[] = [];

        for (const update of input.inventoryUpdates) {
            // Support both variant_id and sku identifiers from upstream payload
            const variant = (product.variants || []).find((v) =>
                (update.variant_id && v.id === update.variant_id) ||
                (update.sku && v.sku === update.sku)
            );

            if (!variant || !variant.manage_inventory) continue;

            // const inventoryItemLink = variant.inventory_items?.[0];
            const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id;
            if (!inventoryItemId) continue;

            // const inventoryItem = inventoryItemLink.inventory_item;
            // const newQty = Number(update.inventory_quantity);
            // const existingLevel = inventoryItem?.location_levels?.find(
            //     (lvl) => lvl.location_id === locationId
            // );
            // Extract target quantity safely
            const newQty = Number(
                update.stocked_quantity ?? update.inventory_quantity ?? 0
            );
            // Directly query the current inventory level from the Inventory module
            const [existingLevel] = await inventoryService.listInventoryLevels({
                inventory_item_id: [inventoryItemId],
                location_id: [locationId],
            });

            if (existingLevel) {
                if (Number(existingLevel.stocked_quantity) !== newQty) {
                    levelsToUpdate.push({
                        id: existingLevel.id,
                        inventory_item_id: inventoryItemId,
                        location_id: locationId,
                        stocked_quantity: newQty,
                    });
                    rollbackData.push({
                        id: existingLevel.id,
                        inventory_item_id: inventoryItemId,
                        location_id: locationId,
                        prev_stocked_quantity: Number(existingLevel.stocked_quantity),
                    });
                }
            } else {
                levelsToCreate.push({
                    inventory_item_id: inventoryItemId,
                    location_id: locationId,
                    stocked_quantity: newQty,
                });
            }
        }

        if (levelsToUpdate.length) {
            await inventoryService.updateInventoryLevels(levelsToUpdate);
        }

        if (levelsToCreate.length) {
            const created = await inventoryService.createInventoryLevels(levelsToCreate);
            createdLevelIds.push(...created.map((c) => c.id));
        }

        return new StepResponse(
            { updated: levelsToUpdate.length, created: levelsToCreate.length },
            { rollbackData, createdLevelIds }
        );
    },
    async (rollbackState, { container }) => {
        if (!rollbackState) return;
        const inventoryService = container.resolve(Modules.INVENTORY);

        if (rollbackState.createdLevelIds?.length) {
            await inventoryService.deleteInventoryLevels(rollbackState.createdLevelIds);
        }

        if (rollbackState.rollbackData?.length) {
            await inventoryService.updateInventoryLevels(
                rollbackState.rollbackData.map((item) => ({
                    id: item.id,
                    inventory_item_id: item.inventory_item_id,
                    location_id: item.location_id,
                    stocked_quantity: item.prev_stocked_quantity,
                }))
            );
        }
    }
);