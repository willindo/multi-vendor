// src/workflows/marketplace/process-order-payment-splits/steps/calculate-splits.ts
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  Modules,
  ContainerRegistrationKeys,
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
  vendor_name: string
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
    const orderModule = container.resolve(Modules.ORDER)
    const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const order = await orderModule.retrieveOrder(
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

    const vendorMap = new Map<string, VendorSplit>()

    for (const item of order.items) {
      const vendorId = item.metadata?.vendor_id as string | undefined
      let vendorName = item.metadata?.vendor_name as string | undefined

      if (!vendorId) {
        throw new Error(
          `Order item ${item.id} is missing metadata.vendor_id`
        )
      }

      // If vendor_name is missing from metadata, fetch from vendor table
      if (!vendorName) {
        const vendor = await pg("vendor")
          .select("name")
          .where({ id: vendorId })
          .first()
        vendorName = vendor?.name || vendorId
      }

      const subtotal = Number(item.total ?? 0)
      const unitPrice = Number(item.unit_price ?? 0)

      let split = vendorMap.get(vendorId) as any

      if (!split) {
        split = {
          vendor_id: vendorId,
          vendor_name: vendorName,
          currency_code: order.currency_code,
          gross_amount: 0,
          commission_amount: 0,
          fee_amount: 0,
          tax_amount: 0,
          net_amount: 0,
          items: [],
        }
        vendorMap.set(vendorId, split)
      }

      split.items.push({
        item_id: item.id,
        line_item_id: item.id,
        quantity: Number(item.quantity),
        unit_price: unitPrice,
        subtotal,
      })

      split.gross_amount += subtotal
    }

    /**
     * Marketplace policy calculations.
     *
     * Replace these calculations with your actual business logic:
     * - Commission rates per vendor/category
     * - Platform fees
     * - Tax calculations
     * - Shipping costs allocation
     */
    for (const split of vendorMap.values()) {
      // After first pass, fetch all vendor rates in one query
      const vendorIds = Array.from(vendorMap.keys())
      const vendorRates = await pg("vendor")
        .select("id", "commission_rate", "tax_rate", "fee_rate")
        .whereIn("id", vendorIds)

      // Create a map for quick lookup
      const vendorRateMap = new Map(
        vendorRates.map(v => [v.id, v])
      )

      // Second pass: Calculate commissions, fees, taxes for each vendor
      for (const [vendorId, split] of vendorMap.entries()) {
        const rates = vendorRateMap.get(vendorId)

        const commissionRate = rates?.commission_rate ?? 0.10
        split.commission_amount = split.gross_amount * commissionRate

        split.fee_amount = rates?.fee_rate
          ? split.gross_amount * rates.fee_rate
          : 50

        const taxRate = rates?.tax_rate ?? 0.18
        split.tax_amount = split.gross_amount * taxRate

        split.net_amount =
          split.gross_amount -
          split.commission_amount -
          split.fee_amount -
          split.tax_amount
      }
    }

    return new StepResponse({
      orderId: order.id,
      currency_code: order.currency_code,
      splits: [...vendorMap.values()],
    })
  }
)