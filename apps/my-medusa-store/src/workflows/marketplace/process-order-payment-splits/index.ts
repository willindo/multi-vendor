// src/workflows/marketplace/process-order-payment-splits/index.ts
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  calculateSplitsStep,
} from "./steps/calculate-splits"
import {
  executeTransfersStep,
} from "./steps/execute-transfers"
export interface ProcessOrderPaymentSplitsInput {
  orderId: string
}
export interface ProcessOrderPaymentSplitsResult {
  orderId: string
  transferCount: number
  status:
  | "COMPLETED"
}
export const processOrderPaymentSplitsWorkflow =
  createWorkflow(
    "process-order-payment-splits",
    function (
      input: ProcessOrderPaymentSplitsInput
    ) {
      /**
       * ----------------------------------------------------
       * Build vendor allocations
       * ----------------------------------------------------
       */
      const splitResult =
        calculateSplitsStep({
          orderId:
            input.orderId,
        })
      /**
       * ----------------------------------------------------
       * Persist settlements
       * Execute provider transfers
       * ----------------------------------------------------
       */
      const transferResult =
        executeTransfersStep({
          orderId:
            input.orderId,
          currency_code:
            splitResult.currency_code,
          splits:
            splitResult.splits,
        })
      return new WorkflowResponse({
        orderId:
          input.orderId,
        transferCount:
          transferResult.transferCount,
        status:
          "COMPLETED",
      })
    }
  )