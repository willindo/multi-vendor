// src/workflows/marketplace/process-order-payment-splits/steps/calculate-splits.ts
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  Modules,
} from "@medusajs/framework/utils"
export interface VendorSplitItem {
  item_id: string
  line_item_id: string
  quantity: number
  unit_price: number
  subtotal: number
}
export interface VendorSplit {
  vendor_id: string
  currency_code: string
  gross_amount: number
  commission_amount: number
  fee_amount: number
  tax_amount: number
  net_amount: number
  items: VendorSplitItem[]
}
export interface CalculateSplitsInput {
  orderId: string
}
export interface CalculateSplitsOutput {
  orderId: string
  currency_code: string
  splits: VendorSplit[]
}
export const calculateSplitsStep = createStep(
  "calculate-order-payment-splits",
  async (
    input: CalculateSplitsInput,
    { container }
  ) => {
    const orderModule =
      container.resolve(Modules.ORDER)
    const order =
      await orderModule.retrieveOrder(
        input.orderId,
        {
          relations: [
            "items",
          ],
        }
      )
    if (!order) {
      throw new Error("Order not found.")
    }
    if (!order.items?.length) {
      throw new Error("Order contains no items.")
    }
    const vendorMap =
      new Map<string, VendorSplit>()
    for (const item of order.items) {
      const vendorId =
        item.metadata?.vendor_id as
        | string
        | undefined
      if (!vendorId) {
        throw new Error(
          `Order item ${item.id} is missing metadata.vendor_id`
        )
      }
      const subtotal =
        Number(item.total ?? 0)
      const unitPrice =
        Number(item.unit_price ?? 0)
      let split =
        vendorMap.get(vendorId)
      if (!split) {
        split = {
          vendor_id: vendorId,
          currency_code:
            order.currency_code,
          gross_amount: 0,
          commission_amount: 0,
          fee_amount: 0,
          tax_amount: 0,
          net_amount: 0,
          items: [],
        }
        vendorMap.set(
          vendorId,
          split
        )
      }
      split.items.push({
        item_id: item.id,
        line_item_id: item.id,
        quantity:
          Number(item.quantity),
        unit_price: unitPrice,
        subtotal,
      })
      split.gross_amount += subtotal
    }
    /**
     * Marketplace policy.
     *
     * Replace these calculations later.
     */
    for (const split of vendorMap.values()) {
      split.commission_amount = 0
      split.fee_amount = 0
      split.tax_amount = 0
      split.net_amount =
        split.gross_amount -
        split.commission_amount -
        split.fee_amount -
        split.tax_amount
    }
    return new StepResponse({
      orderId: order.id,
      currency_code:
        order.currency_code,
      splits:
        [...vendorMap.values()],
    })
  }
)