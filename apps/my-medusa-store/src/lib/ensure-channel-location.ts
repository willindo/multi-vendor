// src/lib/ensure-channel-location.ts
import type { MedusaContainer } from "@medusajs/framework/types"
import {
    ContainerRegistrationKeys,
    Modules,
} from "@medusajs/framework/utils"
import { linkSalesChannelsToStockLocationWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Ensures a sales channel is linked to a stock location.
 *
 * Rules (multi-tenant safe):
 *  1. If the channel already has ANY linked location → no-op.
 *  2. If the channel is NOT the store's default channel → no-op.
 *  3. Otherwise link it to store.default_location_id (fallback: first location).
 *
 * Returns the linked location id, or null if nothing was done.
 */
export async function ensureChannelHasLocation(
    container: MedusaContainer,
    salesChannelId: string
): Promise<string | null> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const storeModule = container.resolve(Modules.STORE)
    const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)

    // 1. Already linked?
    const { data: channels } = await query.graph({
        entity: "sales_channel",
        fields: ["id", "stock_locations.id"],
        filters: { id: [salesChannelId] },
    })

    const existing = channels?.[0]?.stock_locations ?? []
    if (existing.length > 0) {
        return existing?.[0]?.id ?? null
    }

    // 2. Is it the store's default channel?
    const [store] = await storeModule.listStores({})
    if (!store) return null

    if (store.default_sales_channel_id !== salesChannelId) {
        // Non-default channel without a location: let the tenant configure it.
        return null
    }

    // 3. Resolve target location: prefer store.default_location_id, else first location
    let locationId = store.default_location_id ?? null

    if (!locationId) {
        const [firstLocation] = await stockLocationModule.listStockLocations({})
        locationId = firstLocation?.id ?? null
    }

    if (!locationId) {
        console.warn(
            `[marketplace] Cannot auto-link default sales channel ${salesChannelId}: no stock location exists yet`
        )
        return null
    }

    // 4. Use the official workflow — same path as Admin UI
    await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: {
            id: locationId,
            add: [salesChannelId],
        },
    })

    console.log(
        `[marketplace] ✅ Linked default sales channel ${salesChannelId} → location ${locationId}`
    )
    return locationId
}