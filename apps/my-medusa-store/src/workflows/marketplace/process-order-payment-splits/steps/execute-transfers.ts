// src/workflows/marketplace/process-order-payment-splits/steps/execute-transfers.ts
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  Modules,
} from "@medusajs/framework/utils"
import type {
  VendorSplit,
} from "./calculate-splits"
export interface ExecuteTransfersInput {
  orderId: string
  currency_code: string
  splits: VendorSplit[]
}
export interface VendorTransferResult {
  vendor_id: string
  status:
  | "COMPLETED"
  | "SKIPPED"
  amount: number
  currency_code: string
  settlement_id: string
  provider_transfer_id?: string | null
}
export interface ExecuteTransfersOutput {
  transferCount: number
  transfers: VendorTransferResult[]
}
export const executeTransfersStep = createStep(
  "execute-vendor-transfers",
  async (
    input: ExecuteTransfersInput,
    { container }
  ) => {
    const marketplace =
      container.resolve("marketplace")
    const transfers: VendorTransferResult[] = []
    for (const split of input.splits) {
      /**
       * ----------------------------------------------------
       * Idempotency
       * ----------------------------------------------------
       */
      const existing =
        await marketplace.listVendorSettlements({
          vendor_id: split.vendor_id,
          order_id: input.orderId,
        })
      if (existing.length) {
        transfers.push({
          vendor_id: split.vendor_id,
          settlement_id:
            existing[0].id,
          status:
            existing[0].status === "paid"
              ? "COMPLETED"
              : "SKIPPED",
          amount:
            Number(existing[0].net_amount),
          currency_code:
            existing[0].currency_code,
          provider_transfer_id:
            existing[0].transfer_id,
        })
        continue
      }
      /**
       * ----------------------------------------------------
       * Persist settlement first
       * ----------------------------------------------------
       */
      const settlement =
        await marketplace.createVendorSettlements({
          vendor_id:
            split.vendor_id,
          order_id:
            input.orderId,
          currency_code:
            split.currency_code,
          gross_amount:
            split.gross_amount,
          commission_amount:
            split.commission_amount,
          fee_amount:
            split.fee_amount,
          tax_amount:
            split.tax_amount,
          net_amount:
            split.net_amount,
          raw_gross_amount: {
            value: String(split.gross_amount),
            precision: 20,
          },
          raw_commission_amount: {
            value: String(split.commission_amount),
            precision: 20,
          },
          raw_fee_amount: {
            value: String(split.fee_amount),
            precision: 20,
          },
          raw_tax_amount: {
            value: String(split.tax_amount),
            precision: 20,
          },
          raw_net_amount: {
            value: String(split.net_amount),
            precision: 20,
          },
          status: "processing",
        })
      /**
       * ----------------------------------------------------
       * Payment Provider
       * ----------------------------------------------------
       *
       * Replace this block later with:
       *
       * Stripe Connect
       * Razorpay Route
       * Adyen Split
       * Mangopay
       *
       */
      let providerTransferId: string | undefined
      try {
        console.log(
          `[Marketplace] Transfer ${split.vendor_id} ${split.net_amount}`
        )
        providerTransferId =
          undefined
        await marketplace.updateVendorSettlements({
          id: settlement.id,
          status: "paid",
          transfer_id:
            providerTransferId,
        })
        transfers.push({
          vendor_id:
            split.vendor_id,
          settlement_id:
            settlement.id,
          status:
            "COMPLETED",
          amount:
            split.net_amount,
          currency_code:
            split.currency_code,
          provider_transfer_id:
            providerTransferId,
        })
      } catch (e: any) {
        await marketplace.updateVendorSettlements({
          id: settlement.id,
          status: "failed",
          retry_count:
            settlement.retry_count + 1,
          last_error:
            e.message,
        })
        throw e
      }
    }
    return new StepResponse({
      transferCount:
        transfers.filter(
          t => t.status === "COMPLETED"
        ).length,
      transfers,
    })
  }
)