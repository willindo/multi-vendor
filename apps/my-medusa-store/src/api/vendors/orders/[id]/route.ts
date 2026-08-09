// /src/api/vendors/orders/[id]/route.ts
import {
    AuthenticatedMedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http"

import {
    ContainerRegistrationKeys,
} from "@medusajs/framework/utils"

import { validateVendorOrderOwnership } from "@/utils/validate-vendor-ownership"

export async function GET(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const actorId = req.auth_context?.actor_id

    if (!actorId) {
        return res.status(401).json({
            message: "Unauthorized",
        })
    }

    const orderId = req.params.id

    const { vendorId } = await validateVendorOrderOwnership(
        req.scope,
        actorId,
        orderId
    )

    if (!vendorId) {
        return res.status(401).json({
            message: "Vendor authentication required.",
        })
    }


    const db = req.scope.resolve(
        ContainerRegistrationKeys.PG_CONNECTION
    )

    const query = req.scope.resolve(
        ContainerRegistrationKeys.QUERY
    )

    try {
        //
        // verify ownership
        //

        const relation = await db(
            "marketplace_vendor_order_order"
        )
            .where({
                vendor_id: vendorId,
                order_id: orderId,
            })
            .whereNull("deleted_at")
            .orderBy("created_at", "desc")
        // .first()

        if (!relation) {
            return res.status(404).json({
                message: "Order not found.",
            })
        }

        const { data: [order] } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "status",
                "email",

                "shipping_address.first_name",
                "shipping_address.last_name",
                "shipping_address.address_1",
                "shipping_address.city",
                "shipping_address.postal_code",

                "created_at",
                // "summary",

                "items.id",
                "items.title",
                "items.quantity",
                "items.thumbnail",
                "items.metadata",
            ],
            filters: {
                id: [orderId],
            },
        })

        if (!order) {
            return res.status(404).json({
                message: "Order not found.",
            })
        }

        order.items =
            order.items?.filter(
                (item: any) =>
                    item.metadata?.vendor_id === vendorId
            ) ?? []

        res.json({
            order,
        })
    } catch (e: any) {
        res.status(500).json({
            message: e.message,
        })
    }
}