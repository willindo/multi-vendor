// src/utils/resolve-vendor-stock-location.ts
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export async function resolveVendorStockLocation(
    container: MedusaContainer,
    vendorId?: string
): Promise<string> {
    const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
    const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
    const link = container.resolve(ContainerRegistrationKeys.LINK)

    // 1. Resolve default Sales Channel
    const [defaultSc] = await salesChannelModule.listSalesChannels({ is_disabled: false })
    if (!defaultSc) {
        throw new Error("No active sales channel found.")
    }

    let targetLocationId: string | null = null

    // 2. Production Path: Try to find Vendor-Specific Stock Location
    if (vendorId) {
        const locations = await stockLocationModule.listStockLocations({
            name: `sloc_${vendorId}`,
        })
        if (locations.length > 0) {
            targetLocationId = locations[0].id
        }
    }

    // 3. Dev / Trial Fallback Path: Use default location
    if (!targetLocationId) {
        const [defaultLoc] = await stockLocationModule.listStockLocations({})
        targetLocationId = defaultLoc?.id || "default_location"
    }

    // 4. Guarantee Bridge: Auto-link target location to Sales Channel if missing
    try {
        await link.create({
            [Modules.SALES_CHANNEL]: { sales_channel_id: defaultSc.id },
            [Modules.STOCK_LOCATION]: { stock_location_id: targetLocationId },
        })
    } catch (e) {
        // Already linked - safe to ignore
    }

    return targetLocationId
}