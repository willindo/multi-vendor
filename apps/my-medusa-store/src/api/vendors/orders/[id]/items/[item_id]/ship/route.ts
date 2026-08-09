// api/vendors/orders/[id]/items/[item_id]/ship/route.ts
import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { IOrderModuleService } from "@medusajs/framework/types";
import { validateVendorOrderOwnership } from "@/utils/validate-vendor-ownership";

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const orderId = req.params.id;
  const itemId = req.params.item_id;
  const actorId = req.auth_context?.actor_id;
  console.log("🔍 actorId:", actorId);
  console.log("🔍 auth_context:", JSON.stringify(req.auth_context, null, 2));

  if (!actorId) {
    res.status(401).json({
      message: "Unauthorized: Missing authentication context.",
    });
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const orderModuleService = req.scope.resolve(
    Modules.ORDER
  ) as IOrderModuleService;

  try {
    // 1. Validate vendor context & order ownership
    const { vendorId, vendorAdminId } = await validateVendorOrderOwnership(
      req.scope,
      actorId,
      orderId
    );

    // 2. Fetch order with line items
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "items.id", "items.metadata"],
      filters: { id: [orderId] },
    });

    if (!order) {
      res.status(404).json({ message: "Order context not found." });
      return;
    }

    const orderItems = order.items || [];
    const targetItem = orderItems.find((i: any) => i.id === itemId);

    if (!targetItem) {
      res.status(404).json({
        message: "Target line item not found within this order context.",
      });
      return;
    }

    // ✅ NEW: Verify the item belongs to this vendor
    if (targetItem.metadata?.vendor_id !== vendorId) {
      res.status(403).json({
        message: "Forbidden: This line item does not belong to your vendor.",
      });
      return;
    }

    // ✅ NEW: Check if already shipped
    if (targetItem.metadata?.fulfillment_status === "shipped") {
      res.status(400).json({
        message: "Bad Request: This item has already been marked as shipped.",
      });
      return;
    }

    // 3. Update metadata for this item
    const existingMetadata = targetItem.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      fulfillment_status: "shipped",
      shipped_at: new Date().toISOString(),
      shipped_by: vendorAdminId, // Optional: track who shipped it
    };

    // 4. ✅ FIXED: Calculate vendor-specific fulfillment status
    // Only count items belonging to this vendor
    const vendorItems = orderItems.filter(
      (item: any) => item.metadata?.vendor_id === vendorId
    );

    // Count how many vendor items are already shipped
    const alreadyShippedCount = vendorItems.filter(
      (item: any) => item.metadata?.fulfillment_status === "shipped"
    ).length;

    // Add this item (which is being shipped now)
    const shippedCount = alreadyShippedCount + 1;
    const totalVendorItems = vendorItems.length;

    // Determine global fulfillment status for this vendor's items
    let vendorFulfillmentStatus:
      | "not_fulfilled"
      | "partially_fulfilled"
      | "fulfilled" = "partially_fulfilled";

    if (shippedCount === totalVendorItems) {
      vendorFulfillmentStatus = "fulfilled";
    } else if (shippedCount === 0) {
      vendorFulfillmentStatus = "not_fulfilled";
    }

    // 5. ✅ FIXED: Only update fulfillment_status, not main order status
    await orderModuleService.updateOrders([
      {
        id: orderId,
        fulfillment_status: vendorFulfillmentStatus,
        items: [
          {
            id: itemId,
            metadata: updatedMetadata,
          },
        ],
      } as any,
    ]);

    res.json({
      success: true,
      message: `Item ${itemId} marked as SHIPPED. Vendor fulfillment status: ${vendorFulfillmentStatus}`,
      vendor_id: vendorId,
      item_id: itemId,
      item_status: "shipped",
      vendor_fulfillment_status: vendorFulfillmentStatus,
      total_vendor_items: totalVendorItems,
      shipped_vendor_items: shippedCount,
    });
    return;
  } catch (error: any) {
    const isUnauthorized = error.message?.includes("Unauthorized");
    const statusCode = isUnauthorized ? 403 : 500;

    console.error("[API VENDOR SHIP ITEM ERROR]", error);
    res.status(statusCode).json({
      message: error.message || "An unexpected fulfillment error occurred.",
    });
    return;
  }
}