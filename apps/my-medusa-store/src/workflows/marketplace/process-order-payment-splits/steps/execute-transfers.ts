// src/workflows/marketplace/process-order-payment-splits/steps/execute-transfers.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { UnifiedSplitPayload } from "./calculate-splits";

interface StepOutput {
  status: string;
  message: string;
  transactions: {
    vendorId: string;
    transferId?: string;
    status: string;
    error?: string;
  }[];
}

export const executeTransfersStep = createStep(
  "execute-transfers-step",
  async (payload: UnifiedSplitPayload): Promise<StepResponse<StepOutput>> => {
    if (!payload.splits || payload.splits.length === 0) {
      return new StepResponse({ 
        status: "skipped", 
        message: "No splits generated.", 
        transactions: [] 
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // 💡 SANDBOX MODE: If keys are missing, simulate a perfect run and log the payload
    if (!keyId || !keySecret) {
      console.log("\n🧪 ======= RAZORPAY ROUTE SANDBOX SIMULATION =======");
      console.log(`📦 Order ID: ${payload.orderId}`);
      console.log(`💱 Currency: ${payload.currencyCode.toUpperCase()}`);
      
      const simulatedTransactions = payload.splits.map(split => {
        const payloadToReceive = {
          account: split.razorpayAccountId,
          amount: split.vendorNetPayout,
          currency: payload.currencyCode.toUpperCase(),
          notes: {
            medusa_order_id: payload.orderId,
            vendor_id: split.vendorId,
          }
        };

        console.log(`\n➡️ Simulated REST Payload for Vendor [${split.vendorId}]:`);
        console.log(JSON.stringify(payloadToReceive, null, 2));
        
        return {
          vendorId: split.vendorId,
          transferId: `mock_trf_${Math.random().toString(36).substring(7)}`,
          status: "simulated_success"
        };
      });
      console.log("===================================================\n");

      return new StepResponse({
        status: "sandbox_completed",
        message: `Simulated ${simulatedTransactions.length} transfers in sandbox mode.`,
        transactions: simulatedTransactions
      });
    }

    // --- Live Execution Block (Runs only when keys are present) ---
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const executionResults = [];

    for (const split of payload.splits) {
      try {
        const response = await fetch("https://api.razorpay.com/v1/transfers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify({
            account: split.razorpayAccountId,
            amount: split.vendorNetPayout, 
            currency: payload.currencyCode.toUpperCase(),
            notes: {
              medusa_order_id: payload.orderId,
              vendor_id: split.vendorId,
            },
          }),
        });

        const data: any = await response.json();
        if (!response.ok) throw new Error(data.error?.description || `HTTP Error ${response.status}`);

        executionResults.push({ vendorId: split.vendorId, transferId: String(data.id), status: "success" });
      } catch (err: any) {
        executionResults.push({ vendorId: split.vendorId, status: "failed", error: String(err.message) });
      }
    }

    return new StepResponse({ 
      status: "completed", 
      message: `Processed ${executionResults.length} live payments.`, 
      transactions: executionResults 
    });
  }
);