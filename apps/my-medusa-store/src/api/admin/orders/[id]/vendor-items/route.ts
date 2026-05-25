// src/api/admin/orders/[id]/vendor-items/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  try {
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "items.id",
        "items.title",
        "items.quantity",
        "items.thumbnail",
        "items.metadata"
      ],
      filters: { id: [orderId] }
    });

    if (!order) {
      return res.status(404).json({ message: "Master order entity not found." });
    }

    // Safely treat items as an empty collection if unpopulated or missing
    const orderItems = order.items || [];

    const vendorGroupedLayout = orderItems.reduce((acc: any, item: any) => {
      const vendorId = item.metadata?.vendor_id || "platform";
      const itemFulfillmentStatus = item.metadata?.fulfillment_status || "pending";

      if (!acc[vendorId]) {
        acc[vendorId] = [];
      }

      acc[vendorId].push({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        thumbnail: item.thumbnail,
        status: itemFulfillmentStatus,
        shipped_at: item.metadata?.shipped_at || null
      });

      return acc;
    }, {});

    return res.json({
      order_id: order.id,
      global_order_status: order.status,
      vendor_shipments: vendorGroupedLayout
    });

  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}