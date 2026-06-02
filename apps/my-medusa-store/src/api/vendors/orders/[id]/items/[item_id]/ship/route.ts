// src/api/vendors/orders/[id]/items/[item_id]/ship/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { IOrderModuleService } from "@medusajs/framework/types";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id;
  const itemId = req.params.item_id;
  
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const orderModuleService = req.scope.resolve(Modules.ORDER) as IOrderModuleService;

  try {
    // 1. Resolve unified remote query graph data tracking down all line items
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "items.id", "items.metadata"],
      filters: { id: [orderId] }
    });

    if (!order) {
      return res.status(404).json({ message: "Order context not found." });
    }

    const orderItems = order.items || [];
    const targetItem = orderItems.find((i: any) => i.id === itemId);

    if (!targetItem) {
      return res.status(404).json({ message: "Target line item not found within this order context." });
    }

    // 2. Compute updated metadata block for our target item
    const existingMetadata = targetItem.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      fulfillment_status: "shipped",
      shipped_at: new Date().toISOString()
    };

    // 3. Pre-calculate global operational fulfillment statuses across the marketplace split
    let shippedCount = 0;
    
    orderItems.forEach((item: any) => {
      if (item.id === itemId) {
        shippedCount++; // This item is shifting to shipped right now
      } else if (item.metadata?.fulfillment_status === "shipped") {
        shippedCount++;
      }
    });

    let targetGlobalFulfillmentStatus: "not_fulfilled" | "partially_fulfilled" | "fulfilled" = "partially_fulfilled";
    if (shippedCount === orderItems.length) {
      targetGlobalFulfillmentStatus = "fulfilled";
    } else if (shippedCount === 0) {
      targetGlobalFulfillmentStatus = "not_fulfilled";
    }

    // 4. Update both the targeted sub-line metadata AND the master order tracking flags
    await orderModuleService.updateOrders([
      {
        id: orderId,
        fulfillment_status: targetGlobalFulfillmentStatus,
        status: "active", // Promotes state out of 'pending' once operational fulfillment kicks off
        items: [
          {
            id: itemId,
            metadata: updatedMetadata
          }
        ]
      } as any
    ]);

    return res.json({
      success: true,
      message: `Item ${itemId} transitioned to SHIPPED. Global layout updated to: ${targetGlobalFulfillmentStatus}`,
      item_status: "shipped",
      global_fulfillment_status: targetGlobalFulfillmentStatus
    });

  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}