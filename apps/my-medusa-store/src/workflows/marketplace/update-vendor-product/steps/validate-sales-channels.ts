// src/workflows/marketplace/update-vendor-product/steps/validate-sales-channels.ts
import {
    createStep,
    StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
    ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
export type ValidateSalesChannelsInput = {
    vendor_id: string
    sales_channel_ids?: string[]
}
export const validateSalesChannelsStep = createStep(
    "validate-sales-channels-step",
    async (
        input: ValidateSalesChannelsInput,
        { container }
    ) => {
        if (
            !input.sales_channel_ids ||
            input.sales_channel_ids.length === 0
        ) {
            return new StepResponse(true)
        }
        const query = container.resolve(
            ContainerRegistrationKeys.QUERY
        )
        /**
         * Replace "vendor_sales_channel"
         * with whatever relation you already expose.
         *
         * Example:
         *
         * marketplace_vendor_sales_channel
         * vendor.sales_channels
         * vendor_channel
         */
        const { data } = await query.graph({
            entity: "vendor_sales_channel",
            fields: [
                "vendor_id",
                "sales_channel_id",
            ],
            filters: {
                vendor_id: input.vendor_id,
            },
        })
        const allowed = new Set(
            data.map((x: any) => x.sales_channel_id)
        )
        for (const id of input.sales_channel_ids) {
            if (!allowed.has(id)) {
                throw new Error(
                    `Vendor cannot assign Sales Channel ${id}`
                )
            }
        }
        return new StepResponse(true)
    }
)