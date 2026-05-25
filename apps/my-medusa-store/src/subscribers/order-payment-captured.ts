// src/subscribers/order-payment-captured.ts
import { SubscriberConfig, SubscriberArgs } from "@medusajs/framework/subscribers";
import { processOrderPaymentSplitsWorkflow } from "../workflows/marketplace/process-order-payment-splits";

export default async function paymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log(`\n⚡ [Subscriber] Payment Capture verified for Order: ${data.id}`);
  
  try {
    // Invoke your payment splitting workflow engine atomatically
    const { result } = await processOrderPaymentSplitsWorkflow(container).run({
      input: {
        orderId: data.id,
      },
    });

    console.log(`✅ [Subscriber] Split automation finalized with status: ${result.status}`);
  } catch (error) {
    console.error(`❌ [Subscriber] Critical failure during split transfer execution:`, error);
  }
}

export const config: SubscriberConfig = {
  event: "order.payment_captured",
};