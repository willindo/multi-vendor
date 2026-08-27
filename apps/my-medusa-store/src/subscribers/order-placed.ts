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

  // Retrieve order with items
  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items"],
  })

  // ------------------------------------------------------------------
  // Collect vendor ids AND names from item metadata
  // ------------------------------------------------------------------
  const vendorMap = new Map<string, { vendor_id: string; vendor_name: string }>()

  for (const item of order.items as any) {
    const vendorId = item.metadata?.vendor_id as string | undefined
    const vendorName = item.metadata?.vendor_name as string | undefined

    if (vendorId && vendorName && !vendorMap.has(vendorId)) {
      vendorMap.set(vendorId, {
        vendor_id: vendorId,
        vendor_name: vendorName
      })
    }
  }

  if (!vendorMap.size) {
    console.warn(
      `⚠️ Order ${orderId} contains no vendor-owned items.`
    )
    return
  }

  // ------------------------------------------------------------------
  // Create vendor-order links
  // ------------------------------------------------------------------
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

  for (const [vendorId, vendorData] of vendorMap) {
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
  } else {
    try {
      await link.create(newLinks)
      console.log(
        `✅ Linked Order ${orderId} to ${newLinks.length} vendor(s).`
      )
    } catch (error) {
      console.error(
        `❌ Failed to link vendors to order ${orderId}:`,
        error
      )
    }
  }

  // ------------------------------------------------------------------
  // Update order line items with vendor_name (if missing)
  // ------------------------------------------------------------------
  try {
    for (const item of order.items as any) {
      const vendorId = item.metadata?.vendor_id as string | undefined

      // Only update if vendor_id exists but vendor_name is missing
      if (vendorId && !item.metadata?.vendor_name) {
        const vendorData = vendorMap.get(vendorId)

        if (vendorData) {
          // Update the order line item with vendor_name
          await pg("order_line_item")
            .where({ id: item.id })
            .update({
              metadata: {
                ...item.metadata,
                vendor_name: vendorData.vendor_name
              }
            })
        } else {
          // Fallback: fetch vendor name from database
          const vendor = await pg("vendor")
            .select("name")
            .where({ id: vendorId })
            .first()

          if (vendor) {
            await pg("order_line_item")
              .where({ id: item.id })
              .update({
                metadata: {
                  ...item.metadata,
                  vendor_name: vendor.name
                }
              })
          }
        }
      }
    }
    console.log(`✅ Updated order line items with vendor names for order ${orderId}`)
  } catch (error) {
    console.error(
      `❌ Failed to update vendor names on order line items:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}