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
    // 1. Fetch via unified remote query to locate the target line item safely
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "items.*"],
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

    // 2. Prepare our isolated metadata updates
    const existingMetadata = targetItem.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      fulfillment_status: "shipped",
      shipped_at: new Date().toISOString()
    };

    // 3. Apply the update directly to the items array inside the standard update orders wrapper array
    await orderModuleService.updateOrders([
      {
        id: orderId,
        // We cast this to 'any' to bypass strict DTO definitions if your local types don't expose deep line-item updates
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
      message: `Item ${itemId} transitioned to SHIPPED successfully.`,
      updated_status: "shipped"
    });

  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}