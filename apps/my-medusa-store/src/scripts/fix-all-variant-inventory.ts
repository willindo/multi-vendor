// src/scripts/fix-all-variant-inventory.ts
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function fixAllVariantInventory({ container }: ExecArgs) {
    const inventoryModule = container.resolve(Modules.INVENTORY)
    const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)

    // 1. Get default stock location
    const [location] = await stockLocationModule.listStockLocations({})
    if (!location) {
        console.error("❌ No stock location found!")
        return
    }

    // 2. Fetch all inventory items
    const inventoryItems = await inventoryModule.listInventoryItems({})

    for (const item of inventoryItems) {
        const [existingLevel] = await inventoryModule.listInventoryLevels({
            inventory_item_id: item.id,
            location_id: location.id,
        })

        if (!existingLevel) {
            await inventoryModule.createInventoryLevels({
                inventory_item_id: item.id,
                location_id: location.id,
                stocked_quantity: 100, // Default stock for testing
            })
            console.log(`✅ Created inventory level for item ${item.id} at ${location.id}`)
        }
    }

    console.log("🚀 All variants now have inventory levels at the stock location!")
}