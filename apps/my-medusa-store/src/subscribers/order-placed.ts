// src/subscribers/order-placed.ts
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../modules/marketplace";
// 💡 Import our brand new payment split automation workflow
import { processOrderPaymentSplitsWorkflow } from "../workflows/marketplace/process-order-payment-splits";

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModuleService = container.resolve(Modules.ORDER);
  const link = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
  const orderId = data.id;

  const order = await orderModuleService.retrieveOrder(orderId, {
    relations: ["items"],
  });
  console.log(`🔔 Subscriber received Order: ${orderId}`);

  if (!order?.items?.length) {
    console.log("⚠️ No items found in order. Relation might be missing.");
    return;
  }

  const vendorIds = new Set<string>();
  for (const item of order.items) {
    const vendorId = item.metadata?.vendor_id as string | undefined;
    if (vendorId) vendorIds.add(vendorId);
  }

  const links: any[] = [];
  for (const vendorId of vendorIds) {
    links.push({
      [MARKETPLACE_MODULE]: { vendor_id: vendorId },
      [Modules.ORDER]: { order_id: orderId },
    });
  }

  if (links.length > 0) {
    try {
      await link.create(links);
      console.log(`✅ Linked Order ${orderId} to Vendors: ${Array.from(vendorIds).join(", ")}`);
      
      // 🚀 THE CRITICAL ADDITION: Trigger the platform split automation workflow asynchronously
      console.log(`⚡ Orchestrating Razorpay Route distribution calculations for Order ${orderId}...`);
      await processOrderPaymentSplitsWorkflow(container).run({
        input: { orderId: orderId }
      });
      
    } catch (error: any) {
      console.error(`❌ Failed to complete order-placed processing stack: ${error.message}`);
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};