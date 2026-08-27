// src/scripts/seed-sales-channel-stock-location.ts
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function seedSalesChannelStockLocation({ container }: ExecArgs) {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
    const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)

    // 1. Get default sales channel
    const [defaultSc] = await salesChannelModule.listSalesChannels({ is_disabled: false })
    if (!defaultSc) {
        console.error("❌ No active default sales channel found.")
        return
    }

    // 2. Fetch all stock locations
    const locations = await stockLocationModule.listStockLocations({})

    for (const location of locations) {
        try {
            await link.create({
                [Modules.SALES_CHANNEL]: {
                    sales_channel_id: defaultSc.id,
                },
                [Modules.STOCK_LOCATION]: {
                    stock_location_id: location.id,
                },
            })
            console.log(`✅ Successfully linked Stock Location (${location.id}) ──► Sales Channel (${defaultSc.id})`)
        } catch (error) {
            // Ignore if link already exists
            console.log(`ℹ️ Link already exists for location ${location.id}`)
        }
    }
}