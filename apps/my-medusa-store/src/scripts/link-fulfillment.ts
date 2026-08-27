// src/scripts/link-fulfillment.ts
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function fixFulfillmentLinks({ container }: ExecArgs) {
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    const stockLocationId = "sl_default"
    const fulfillmentSetId = "fuset_01KRCV475V48QZ5W8K7KYHAAP9"

    console.log("🔗 Linking Stock Location to Fulfillment Set...")

    try {
        // Link Stock Location -> Fulfillment Set
        await remoteLink.create({
            [Modules.STOCK_LOCATION]: {
                stock_location_id: stockLocationId,
            },
            [Modules.FULFILLMENT]: {
                fulfillment_set_id: fulfillmentSetId,
            },
        })

        console.log("✅ Remote link successfully established between Stock Location and Fulfillment Set.")
    } catch (error) {
        console.error("❌ Failed to create link:", error)
    }
}