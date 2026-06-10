import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { IOrderModuleService } from "@medusajs/framework/types";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const orderId = req.params.id;
  const itemId = req.params.item_id;
  
  // Extract authenticated vendor ID from your middleware
  const vendor_id = req.context?.auth_context?.actor_id || "vendor_mock_id";

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const orderModuleService = req.scope.resolve(Modules.ORDER) as IOrderModuleService;
  const dbConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  try {
    // 1. Multi-Tenant Guard: Enforce table-level ownership separation via raw Knex query
    const vendorOrderRelation = await dbConnection("marketplace_vendor_order_order")
      .where({ vendor_id, order_id: orderId })
      .whereNull("deleted_at")
      .first();

    if (!vendorOrderRelation) {
      res.status(432).json({ message: "Access denied. Target order layout parameters match no structural vendor rules." });
      return;
    }

    // 2. Resolve unified remote query graph tracking down line items
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "items.id", "items.metadata"],
      filters: { id: [orderId] }
    });

    if (!order) {
      res.status(404).json({ message: "Order context not found." });
      return;
    }

    const orderItems = order.items || [];
    const targetItem = orderItems.find((i: any) => i.id === itemId);

    if (!targetItem) {
      res.status(404).json({ message: "Target line item not found within this order context." });
      return;
    }

    // 3. Compute dynamic metadata configurations
    const existingMetadata = targetItem.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      fulfillment_status: "shipped",
      shipped_at: new Date().toISOString()
    };

    // 4. Calculate global operational fulfillment status balances
    let shippedCount = 0;
    orderItems.forEach((item: any) => {
      if (item.id === itemId) {
        shippedCount++;
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

    // 5. Commit atomic status update records via Module Layer
    await orderModuleService.updateOrders([
      {
        id: orderId,
        fulfillment_status: targetGlobalFulfillmentStatus,
        status: "active", // Transition state cleanly out of 'pending'
        items: [
          {
            id: itemId,
            metadata: updatedMetadata
          }
        ]
      } as any
    ]);

    res.json({
      success: true,
      message: `Item ${itemId} transitioned to SHIPPED. Global layout updated to: ${targetGlobalFulfillmentStatus}`,
      item_status: "shipped",
      global_fulfillment_status: targetGlobalFulfillmentStatus
    });
    return;

  } catch (error: any) {
    res.status(500).json({ message: error.message || "An unexpected fulfillment error occurred." });
    return;
  }
}