// src/subscribers/order-placed.ts
import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import {
  Modules,
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import { MARKETPLACE_MODULE } from "../modules/marketplace"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModule = container.resolve(Modules.ORDER)
  const link = container.resolve(
    ContainerRegistrationKeys.LINK
  )
  const pg = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION
  )
  const orderId = data.id
  console.log(
    `📦 Processing marketplace links for Order ${orderId}`
  )
  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items"],
  })
  if (!order?.items?.length) {
    console.log(
      `⚠️ Order ${orderId} contains no items.`
    )
    return
  }
  /*
  ------------------------------------------------------------------
  Collect vendor ids from immutable item metadata
  ------------------------------------------------------------------
  */
  const vendorIds = new Set<string>()
  for (const item of order.items) {
    const vendorId = item.metadata?.vendor_id as string | undefined
    if (!vendorId) {
      console.warn(
        `⚠️ Order ${orderId}, item ${item.id} has no vendor_id metadata.`
      )
      continue
    }
    vendorIds.add(vendorId)
  }
  if (!vendorIds.size) {
    console.warn(
      `⚠️ Order ${orderId} contains no vendor-owned items.`
    )
    return
  }
  /*
  ------------------------------------------------------------------
  Prevent duplicate links
  ------------------------------------------------------------------
  */
  const newLinks: any[] = []
  const existing = await pg("marketplace_vendor_order_order")
    .select("vendor_id")
    .where({
      order_id: orderId,
    })
    .whereNull("deleted_at")
  const existingVendorIds = new Set(
    existing.map(x => x.vendor_id)
  )
  for (const vendorId of vendorIds) {
    if (existingVendorIds.has(vendorId)) {
      continue
    }
    newLinks.push({
      [MARKETPLACE_MODULE]: {
        vendor_id: vendorId,
      },
      [Modules.ORDER]: {
        order_id: orderId,
      },
    })
  }
  if (!newLinks.length) {
    console.log(
      `✓ Vendor links already exist for Order ${orderId}`
    )
    return
  }
  try {
    await link.create(newLinks)
    console.log(
      `✅ Linked Order ${orderId} to ${newLinks.length} vendor(s).`
    )
  } catch (error: any) {
    console.error(
      `❌ Failed creating vendor links for Order ${orderId}:`,
      error.message
    )
    throw error
  }
}
export const config: SubscriberConfig = {
  event: "order.placed",
}