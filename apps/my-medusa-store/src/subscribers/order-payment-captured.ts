// src/subscribers/order-payment-captured.ts

import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

import {
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"

import {
  processOrderPaymentSplitsWorkflow,
} from "../workflows/marketplace/process-order-payment-splits"

export default async function orderPaymentCapturedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const paymentCollectionId = event.data.id

  if (!paymentCollectionId) {
    return
  }

  const pg = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION
  )

  /**
   * ------------------------------------------------------------
   * Resolve Order from Payment Collection
   *
   * payment_collection
   *          │
   *          ▼
   * order_payment_collection
   *          │
   *          ▼
   * order_id
   * ------------------------------------------------------------
   */
  const orderLink = await pg("order_payment_collection")
    .select("order_id")
    .where({
      payment_collection_id: paymentCollectionId,
    })
    .whereNull("deleted_at")
    .first()

  if (!orderLink?.order_id) {
    console.warn(
      `[Marketplace] No order found for payment collection ${paymentCollectionId}`
    )
    return
  }

  /**
   * ------------------------------------------------------------
   * Execute marketplace payout workflow.
   *
   * execute-transfers.ts is responsible for idempotency by
   * checking VendorSettlement records before creating new ones.
   * ------------------------------------------------------------
   */
  await processOrderPaymentSplitsWorkflow(container).run({
    input: {
      orderId: orderLink.order_id,
    },
  })

  console.log(
    `[Marketplace] Vendor settlements processed for Order ${orderLink.order_id}`
  )
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}