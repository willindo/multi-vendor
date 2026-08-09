// src/api/vendors/orders/route.ts
import {
    AuthenticatedMedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { validateVendorOrderListAccess } from "@/utils/validate-vendor-ownership";

export async function GET(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const actorId = req.auth_context?.actor_id;
    console.log("🔍 actorId:", actorId);
    console.log("🔍 auth_context:", JSON.stringify(req.auth_context, null, 2));
    if (!actorId) {
        return res.status(401).json({
            message: "Unauthorized: Missing authentication context.",
        });
    }

    const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    try {
        // ✅ Use the list-specific validator
        const { vendorId } = await validateVendorOrderListAccess(
            req.scope,
            actorId
        );

        // 2. Find all orders owned by this vendor
        const vendorOrders = await db("marketplace_vendor_order_order")
            .where({
                vendor_id: vendorId,
            })
            .whereNull("deleted_at");

        const ids = vendorOrders.map((x: any) => x.order_id);

        if (!ids.length) {
            return res.json({
                orders: [],
            });
        }

        // 3. Query the order graph
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "status",
                "email",
                "shipping_address.first_name",
                "shipping_address.last_name",
                "created_at",
                "summary",
                "items.id",
                "items.title",
                "items.quantity",
                "items.thumbnail",
                "items.metadata",
            ],
            filters: {
                id: ids,
            },
        });

        // 4. Filter items scoped specifically to this vendor
        const result = orders.map((order: any) => ({
            ...order,
            items:
                order.items?.filter(
                    (item: any) => item.metadata?.vendor_id === vendorId
                ) ?? [],
        }));

        return res.json({
            orders: result,
        });
    } catch (error: any) {
        const isUnauthorized = error.message?.includes("Unauthorized");
        if (isUnauthorized) {
            return res.status(403).json({ message: error.message });
        }

        console.error("[API VENDOR ORDERS GET ERROR]", error);
        return res.status(500).json({
            message: error.message || "Failed to fetch vendor orders.",
        });
    }
}