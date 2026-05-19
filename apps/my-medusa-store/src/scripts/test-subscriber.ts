import { ExecArgs } from "@medusajs/framework/types"
import orderPlacedHandler from "../subscribers/order-placed"

export default async function testSubscriber({ container }: ExecArgs) {
  console.log("🧪 Simulating order.placed event...")
  
  const testOrderId = "order_01KRD8X59DV4CVSVFQ8DPYSDSC"

  // We add the missing 'pluginOptions' and cast to any/SubscriberArgs
  await orderPlacedHandler({
    event: {
      id: "test-event",
      name: "order.placed",
      data: { id: testOrderId },
      timestamp: new Date().toISOString(),
    },
    container,
    pluginOptions: {}, // 👈 This satisfies the missing property error
  } as any)

  console.log("🏁 Simulation finished. Check SQL for new rows.")
}