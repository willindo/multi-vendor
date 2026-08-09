// src/workflows/marketplace/update-vendor-product/steps/sync-apparel.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

type SyncApparelInput = {
    product_id: string;
    apparel_detail: any | null | undefined;
};

type SyncApparelOutput = {
    apparel_detail_id: string;
    isNew: boolean;
};

type SyncApparelRollbackState = {
    isNew: boolean;
    apparel_detail_id: string;
    previousData: any | null;
    previousId: string | null;
    product_id: string; // ✅ Store product_id for rollback
};

export const syncApparelDetailStep = createStep(
    "sync-apparel-detail-step",
    async (
        input: SyncApparelInput,
        { container }
    ): Promise<StepResponse<SyncApparelOutput, SyncApparelRollbackState>> => {
        // If no apparel detail provided, skip
        if (!input.apparel_detail || Object.keys(input.apparel_detail).length === 0) {
            return new StepResponse(
                { apparel_detail_id: "", isNew: false },
                {
                    isNew: false,
                    apparel_detail_id: "",
                    previousData: null,
                    previousId: null,
                    product_id: input.product_id,
                }
            );
        }

        const marketplaceService = container.resolve("marketplace");
        const query = container.resolve(ContainerRegistrationKeys.QUERY);

        // 1. Fetch existing apparel detail
        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "apparel_detail.id", "apparel_detail.*"],
            filters: { id: input.product_id },
        });

        const product = products[0] as {
            id: string;
            apparel_detail?: any;
        } | undefined;

        const existingApparelId = product?.apparel_detail?.id;
        const existingApparelData = product?.apparel_detail || null;

        // 2. Store rollback state BEFORE mutation
        const rollbackState: SyncApparelRollbackState = {
            isNew: !existingApparelId,
            apparel_detail_id: existingApparelId || "",
            previousData: existingApparelData,
            previousId: existingApparelId || null,
            product_id: input.product_id,
        };

        // 3. Perform mutation
        if (existingApparelId) {
            // Update existing
            await marketplaceService.updateApparelDetails([
                {
                    id: existingApparelId,
                    ...input.apparel_detail,
                },
            ]);

            return new StepResponse(
                {
                    apparel_detail_id: existingApparelId,
                    isNew: false
                },
                rollbackState
            );
        } else {
            // Create new
            const newDetail = await marketplaceService.createApparelDetails({
                product_id: input.product_id,
                ...input.apparel_detail,
            });

            rollbackState.apparel_detail_id = newDetail.id;
            rollbackState.isNew = true;

            return new StepResponse(
                {
                    apparel_detail_id: newDetail.id,
                    isNew: true
                },
                rollbackState
            );
        }
    },
    // ✅ COMPENSATION FUNCTION
    async (
        rollbackState: SyncApparelRollbackState | undefined,
        { container }
    ) => {
        if (!rollbackState) {
            return;
        }

        const marketplaceService = container.resolve("marketplace");
        // ✅ Use ContainerRegistrationKeys.PG_CONNECTION for proper typing
        const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);

        // Case 1: We created a new apparel detail → DELETE it
        if (rollbackState.isNew && rollbackState.apparel_detail_id) {
            try {
                // First, remove the link
                await pgConnection("product_product_marketplace_apparel_detail")
                    .where({
                        product_id: rollbackState.product_id,
                        apparel_detail_id: rollbackState.apparel_detail_id
                    })
                    .del();
            } catch (error) {
                // Link might not exist, continue with deletion
            }

            // Delete the apparel detail
            await marketplaceService.deleteApparelDetails([
                rollbackState.apparel_detail_id
            ]);

            return;
        }

        // Case 2: We updated an existing apparel detail → RESTORE previous state
        if (!rollbackState.isNew && rollbackState.previousId && rollbackState.previousData) {
            // Remove fields that shouldn't be updated
            const { id, product_id, created_at, updated_at, deleted_at, ...restorableData } =
                rollbackState.previousData;

            if (Object.keys(restorableData).length > 0) {
                await marketplaceService.updateApparelDetails([
                    {
                        id: rollbackState.previousId,
                        ...restorableData,
                    },
                ]);
            }

            return;
        }

        // Case 3: No apparel detail existed before, and we didn't create one
        if (!rollbackState.isNew && !rollbackState.previousId) {
            // Nothing to rollback
            return;
        }
    }
);