// src/workflows/marketplace/process-order-payment-splits/index.ts
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { calculateSplitsStep } from "./steps/calculate-splits";
import { executeTransfersStep } from "./steps/execute-transfers";

interface WorkflowInput {
  orderId: string;
}

export const processOrderPaymentSplitsWorkflow = createWorkflow(
  "process-order-payment-splits",
  (input: WorkflowInput) => {
    // 1. Calculate the values
    const splitCalculations = calculateSplitsStep({ orderId: input.orderId });

    // 2. Fixes TS2554 by providing the explicit signature payload
    const executionReport = executeTransfersStep({
      orderId: splitCalculations.orderId,
      currencyCode: splitCalculations.currencyCode,
      totalOrderAmount: splitCalculations.totalOrderAmount,
      splits: splitCalculations.splits,
    });

    return new WorkflowResponse(executionReport);
  }
);