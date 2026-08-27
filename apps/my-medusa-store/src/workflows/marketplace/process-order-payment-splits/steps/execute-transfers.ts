// src/workflows/marketplace/process-order-payment-splits/steps/execute-transfers.ts

import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import type { VendorSplit } from "./calculate-splits"
import Razorpay from "razorpay"
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace"
import MarketplaceModuleService from "../../../../modules/marketplace/service"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export interface ExecuteTransfersInput {
  orderId: string
  currency_code: string
  splits: VendorSplit[]
}

export interface VendorTransferResult {
  vendor_id: string
  vendor_name: string
  status: "COMPLETED" | "SKIPPED" | "FAILED"
  amount: number
  currency_code: string
  settlement_id: string
  provider_transfer_id?: string | null
  error_message?: string
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
    // const marketplace = container.resolve("marketplace")
    const marketplace = container.resolve<MarketplaceModuleService>(
      MARKETPLACE_MODULE
    )
    const transfers: VendorTransferResult[] = []

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    for (const split of input.splits) {
      /**
       * 1. Idempotency Check
       */
      const existing = await marketplace.listVendorSettlements({
        vendor_id: split.vendor_id,
        order_id: input.orderId,
      })

      if (existing.length) {
        transfers.push({
          vendor_id: split.vendor_id,
          vendor_name: split.vendor_name,
          settlement_id: existing[0].id,
          status: existing[0].status === "paid" ? "COMPLETED" : "SKIPPED",
          amount: Number(existing[0].net_amount),
          currency_code: existing[0].currency_code,
          provider_transfer_id: existing[0].transfer_id,
        })
        continue
      }

      /**
   * 2. Fetch Vendor Record to retrieve Razorpay Linked Account ID
   */
      const vendor = await marketplace.retrieveVendor(split.vendor_id).catch(() => null)
      const metadata = (vendor?.metadata || {}) as Record<string, any>
      // Extract from nested payout_config or top-level fallback
      const razorpayAccountId: string | undefined =
        metadata?.payout_config?.razorpay_account_id || metadata?.razorpay_account_id
      if (!razorpayAccountId) {
        throw new Error(
          `Vendor ${split.vendor_name} (${split.vendor_id}) is missing a Razorpay Route Linked Account ID in metadata.payout_config.razorpay_account_id`
        )
      }

      console.log(
        `[Marketplace] Using vendor payout config for ${split.vendor_name}:`,
        {
          payout_enabled: metadata?.payout_enabled,
          commission_rate: metadata?.payout_config?.commission_rate,
          razorpay_account_id: razorpayAccountId,
        }
      )
      /**
       * 3. Persist settlement with status="processing"
       */
      const settlement = await marketplace.createVendorSettlements({
        vendor_id: split.vendor_id,
        order_id: input.orderId,
        currency_code: split.currency_code,
        gross_amount: split.gross_amount,
        commission_amount: split.commission_amount,
        fee_amount: split.fee_amount,
        tax_amount: split.tax_amount,
        net_amount: split.net_amount,
        raw_gross_amount: { value: String(split.gross_amount), precision: 20 },
        raw_commission_amount: { value: String(split.commission_amount), precision: 20 },
        raw_fee_amount: { value: String(split.fee_amount), precision: 20 },
        raw_tax_amount: { value: String(split.tax_amount), precision: 20 },
        raw_net_amount: { value: String(split.net_amount), precision: 20 },
        status: "processing",
        metadata: {
          vendor_name: split.vendor_name,
        },
      })

      let providerTransferId: string | undefined
      let transferError: string | undefined

      try {
        console.log(
          `[Marketplace] Starting Razorpay transfer for ${split.vendor_name} (${split.vendor_id}) - Amount: ₹${split.net_amount}`
        )

        if (!razorpayAccountId) {
          throw new Error(`Vendor ${split.vendor_id} has no linked Razorpay Route Account ID (razorpay_account_id)`)
        }

        // Execute live Razorpay Route transfer (Amount in paise)
        const transfer = await razorpay.transfers.create({
          account: razorpayAccountId as string, // e.g. "acc_Hjh839210"
          amount: Math.round(split.net_amount * 100),
          currency: split.currency_code.toUpperCase(),
          notes: {
            order_id: input.orderId,
            vendor_id: split.vendor_id,
            //  settlement_id: settlement.id,
          },
        })

        providerTransferId = transfer.id

        // Mark settlement as paid
        await marketplace.updateVendorSettlements({
          id: settlement.id,
          status: "paid",
          transfer_id: providerTransferId,
        })

        transfers.push({
          vendor_id: split.vendor_id,
          vendor_name: split.vendor_name,
          settlement_id: settlement.id,
          status: "COMPLETED",
          amount: split.net_amount,
          currency_code: split.currency_code,
          provider_transfer_id: providerTransferId,
        })

        console.log(
          `[Marketplace] ✅ Transfer completed for ${split.vendor_name} - ${providerTransferId}`
        )
      } catch (error: any) {
        transferError = error.message || "Unknown Razorpay Transfer Error"

        console.error(
          `[Marketplace] ❌ Transfer failed for vendor ${split.vendor_name} (${split.vendor_id}):`,
          transferError
        )

        await marketplace.updateVendorSettlements({
          id: settlement.id,
          status: "failed",
          transfer_id: null,
          metadata: {
            retry_count: ((settlement.metadata?.retry_count as number) ?? 0) + 1,
            last_error: transferError,
          },
        })
        const eventBus = container.resolve(Modules.EVENT_BUS)
        // Optionally enqueue retry job
        await eventBus.emit({
          name: "vendor.transfer.retry",
          data: { settlement_id: settlement.id },
        })

        transfers.push({
          vendor_id: split.vendor_id,
          vendor_name: split.vendor_name,
          settlement_id: settlement.id,
          status: "FAILED",
          amount: split.net_amount,
          currency_code: split.currency_code,
          provider_transfer_id: undefined,
          error_message: transferError,
        })

        await marketplace.updateVendorSettlements({
          id: settlement.id,
          status: "failed",
          transfer_id: null,
        })

        transfers.push({
          vendor_id: split.vendor_id,
          vendor_name: split.vendor_name,
          settlement_id: settlement.id,
          status: "FAILED",
          amount: split.net_amount,
          currency_code: split.currency_code,
          provider_transfer_id: undefined,
          error_message: transferError,
        })
      }
    }

    const successful = transfers.filter((t) => t.status === "COMPLETED").length
    const failed = transfers.filter((t) => t.status === "FAILED").length
    const skipped = transfers.filter((t) => t.status === "SKIPPED").length

    return new StepResponse({
      transferCount: successful,
      transfers,
    })
  }
)