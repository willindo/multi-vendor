// src/workflows/marketplace/process-order-payment-splits/steps/calculate-splits.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export interface SplitTransferItem {
  vendorId: string;
  razorpayAccountId: string;
  rawAmount: number;
  platformCommission: number;
  vendorNetPayout: number;
}

export interface UnifiedSplitPayload {
  orderId: string;
  currencyCode: string;
  totalOrderAmount: number;
  splits: SplitTransferItem[];
}

export const calculateSplitsStep = createStep(
  "calculate-splits-step",
  async (input: { orderId: string }, context) => {
    const { container } = context;
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    
    // Use raw query.graph inside an active step execution frame
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "total", "currency_code", "items.*"],
      filters: { id: input.orderId }
    });

    const order = orders[0];
    if (!order || !order.items?.length) {
      throw new Error(`[SplitEngine] Order ${input.orderId} has no processable items.`);
    }

    // Explicitly typed filter/map chain to avoid implicit 'any' warnings
    const vendorIdsInOrder = [
      ...new Set(
        order.items
          .filter((item: any): item is any => !!item && !!item.metadata?.vendor_id)
          .map((item: any) => item.metadata.vendor_id as string)
      )
    ] as string[];
    
    if (vendorIdsInOrder.length === 0) {
      return new StepResponse({ 
        orderId: order.id, 
        currencyCode: order.currency_code, 
        totalOrderAmount: order.total, 
        splits: [] 
      });
    }

    // Query your vendor custom data rows cleanly
    const { data: vendors } = await query.graph({
      entity: "vendor",
      fields: ["id", "name", "metadata"],
      filters: { id: vendorIdsInOrder }
    });

    const vendorTotalsMap: Record<string, number> = {};
    
    for (const item of order.items) {
      if (!item || !item.metadata?.vendor_id) continue;
      const vId = item.metadata.vendor_id as string;
      vendorTotalsMap[vId] = (vendorTotalsMap[vId] || 0) + (item.subtotal || 0);
    }

    const splits: SplitTransferItem[] = [];

    for (const [vendorId, rawAmount] of Object.entries(vendorTotalsMap)) {
      const vendorEntity = vendors.find((v: any) => v.id === vendorId);
      const payoutConfig = (vendorEntity?.metadata as any)?.payout_config || {};
      const razorpayAccountId = payoutConfig.razorpay_account_id;
      const commissionRate = payoutConfig.commission_rate !== undefined ? payoutConfig.commission_rate : 0.10;

      if (!razorpayAccountId) {
        console.warn(`⚠️ Vendor ${vendorId} missing payment routing configurations. Skipping split transaction payload layout.`);
        continue;
      }

      const platformCommission = Math.round(rawAmount * commissionRate);
      const vendorNetPayout = rawAmount - platformCommission;

      splits.push({
        vendorId,
        razorpayAccountId,
        rawAmount,
        platformCommission,
        vendorNetPayout
      });
    }

    return new StepResponse({
      orderId: order.id,
      currencyCode: order.currency_code,
      totalOrderAmount: order.total,
      splits
    });
  }
);