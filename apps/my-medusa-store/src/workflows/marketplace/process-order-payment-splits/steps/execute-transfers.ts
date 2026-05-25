// src/workflows/marketplace/process-order-payment-splits/steps/execute-transfers.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { UnifiedSplitPayload } from "./calculate-splits";
import * as nodeCrypto from "crypto";

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
  async (payload: UnifiedSplitPayload, context): Promise<StepResponse<StepOutput>> => {
    const { container } = context;
    
    // 1. Safe guard against empty payloads
    if (!payload.splits || payload.splits.length === 0) {
      return new StepResponse({ 
        status: "skipped", 
        message: "No splits generated.", 
        transactions: [] 
      });
    }

    // 2. Fetch the payment collection records to determine the payment provider
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "payment_collections.payments.provider_id"],
      filters: { id: payload.orderId }
    });

    // Grab the actual primary payment provider string used by the customer
    const activeProvider = orders[0]?.payment_collections?.[0]?.payments?.[0]?.provider_id;

    // 🚀 3. CASH ON DELIVERY (COD) / MANUAL PAYMENT INTERCEPTOR
    if (activeProvider === "pp_manual_manual" || activeProvider === "manual") {
      console.log(`\n📦 ======= COD ACCOUNTING LEDGER ENTRY =======`);
      console.log(`Order ${payload.orderId} was checked out using open-source Manual/COD provider.`);
      console.log(`Bypassing live payment gateways. Committing amounts directly to internal vendor escrows.`);
      
      const codTransactions = payload.splits.map(split => {
        console.log(`-> Logged Owed Amount: [₹${(split.vendorNetPayout / 100).toFixed(2)}] to Vendor [${split.vendorId}] (Pending courier remittance)`);
        
        return {
          vendorId: split.vendorId,
          transferId: `cod_ledger_${nodeCrypto.randomBytes(4).toString("hex")}`,
          status: "pending_courier_remittance"
        };
      });
      console.log(`============================================\n`);

      return new StepResponse({
        status: "cod_escrow_logged",
        message: `Bypassed payment processing. Virtual ledger entries set for ${codTransactions.length} vendors.`,
        transactions: codTransactions
      });
    }

    // --- Electronic Processing Layer (Cards, UPI, Netbanking via Razorpay) ---
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // 💡 4. SANDBOX MODE: Runs if electronic route keys are missing during development testing
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

    // 🔥 5. LIVE ROUTE EXECUTION: Runs when keys are present in production environment
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const executionResults = [];

    for (const split of payload.splits) {
      try {
        // Generate deterministic idempotency key to completely prevent double-payouts
        const idempotencyKey = nodeCrypto
          .createHash("sha256")
          .update(`${payload.orderId}:${split.vendorId}`)
          .digest("hex");

        const response = await fetch("https://api.razorpay.com/v1/transfers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
            "X-Razorpay-Idempotency-Key": idempotencyKey,
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

        executionResults.push({ 
          vendorId: split.vendorId, 
          transferId: String(data.id), 
          status: "success" 
        });
      } catch (err: any) {
        executionResults.push({ 
          vendorId: split.vendorId, 
          status: "failed", 
          error: String(err.message) 
        });
      }
    }

    return new StepResponse({ 
      status: "completed", 
      message: `Processed ${executionResults.length} live electronic marketplace payments.`, 
      transactions: executionResults 
    });
  }
);