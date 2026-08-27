import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function linkProductsToShippingProfile({ container }: ExecArgs) {
    const productModule = container.resolve(Modules.PRODUCT)
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    // 1. Get the Default Shipping Profile
    const [defaultProfile] = await fulfillmentModule.listShippingProfiles({
        type: "default",
    })

    if (!defaultProfile) {
        console.error("❌ No default shipping profile found!")
        return
    }

    // 2. Get all products
    const products = await productModule.listProducts({}, { select: ["id", "title"] })
    console.log(`🔍 Found ${products.length} products. Linking to Shipping Profile ${defaultProfile.id}...`)

    // 3. Create remote links between Product and Shipping Profile
    const links = products.map((product) => ({
        [Modules.PRODUCT]: {
            product_id: product.id,
        },
        [Modules.FULFILLMENT]: {
            shipping_profile_id: defaultProfile.id,
        },
    }))

    try {
        await remoteLink.create(links)
        console.log("✅ Successfully linked all products to the default shipping profile.")
    } catch (err) {
        console.error("❌ Failed to link products:", err)
    }
}