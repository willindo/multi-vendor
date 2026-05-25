// ==== Optional Manual Retry Admin Override Endpoint: ./src/api/admin/vendor-settlements/route.ts ====
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { processOrderPaymentSplitsWorkflow } from "../../workflows/marketplace/process-order-payment-splits";


export async function POST(
  req: MedusaRequest<{ order_id: string }>,
  res: MedusaResponse
): Promise<void> {
  const { order_id } = req.body;

  try {
    const { result } = await processOrderPaymentSplitsWorkflow(req.scope).run({
      input: { orderId: order_id },
    });

    res.status(200).json({ success: true, summary: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}