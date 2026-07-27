import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export const syncApparelDetailStep = createStep(
    "sync-apparel-detail-step",
    async (input: { product_id: string; apparel_detail: any }, { container }) => {
        const marketplaceService = container.resolve("marketplace");
        const query = container.resolve("query");

        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "apparel_detail.id"],
            filters: { id: input.product_id }
        });

        const existingApparelId = products[0]?.apparel_detail?.id;

        if (existingApparelId) {
            await marketplaceService.updateApparelDetails([
                {
                    id: existingApparelId,
                    ...input.apparel_detail,
                },
            ]);
            return new StepResponse({ apparel_detail_id: existingApparelId, isNew: false });
        } else {
            const newDetail = await marketplaceService.createApparelDetails({
                product_id: input.product_id,
                ...input.apparel_detail,
            });
            return new StepResponse({ apparel_detail_id: newDetail.id, isNew: true });
        }
    }
);