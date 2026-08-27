import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createStockLocationsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export const createVendorLocationStep = createStep(
    "create-vendor-location-step",
    async (input: { vendorId: string; vendorName: string }, { container }) => {
        const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        const link = container.resolve(ContainerRegistrationKeys.LINK)

        // 1. Get active Sales Channel
        const [defaultSc] = await salesChannelModule.listSalesChannels({ is_disabled: false })

        // 2. Create Stock Location (Pure input - no sales_channels field)
        const { result } = await createStockLocationsWorkflow(container).run({
            input: {
                locations: [
                    {
                        name: `sloc_${input.vendorId}`,
                    },
                ],
            },
        })

        const newLocation = result[0]

        // 3. Link Stock Location to Sales Channel via Remote Link
        if (defaultSc) {
            await link.create({
                [Modules.SALES_CHANNEL]: { sales_channel_id: defaultSc.id },
                [Modules.STOCK_LOCATION]: { stock_location_id: newLocation.id },
            })
        }

        return new StepResponse(newLocation, newLocation.id)
    }
)