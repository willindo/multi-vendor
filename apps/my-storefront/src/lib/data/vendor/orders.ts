"use server"

import { getBackendUrl, getVendorHeaders } from "./session"

/**
 * Retrieves all marketplace orders assigned
 * to the authenticated vendor.
 */
export async function getVendorOrders() {
    const BACKEND_URL = getBackendUrl()

    if (!BACKEND_URL) return []

    try {
        const headers = await getVendorHeaders()

        const response = await fetch(
            `${BACKEND_URL}/vendors/orders`,
            {
                method: "GET",
                headers,
                next: {
                    revalidate: 0,
                    tags: ["vendor_orders"],
                },
            }
        )

        if (!response.ok) {
            return []
        }

        const data = await response.json()

        return data.orders || []
    } catch (error) {
        console.error(
            "Error fetching vendor split orders:",
            error
        )

        return []
    }
}
/**
 * Retrieves detailed information for
 * a single vendor order.
 */
export async function getVendorOrderDetails(
    orderId: string
) {
    const BACKEND_URL = getBackendUrl()

    if (!BACKEND_URL) return null

    try {
        const headers = await getVendorHeaders()

        const response = await fetch(
            `${BACKEND_URL}/vendors/orders/${orderId}`,
            {
                method: "GET",
                headers,
                next: {
                    revalidate: 0,
                    tags: [`vendor_order_${orderId}`],
                },
            }
        )

        if (!response.ok) {
            return null
        }

        const data = await response.json()

        return data.order || null
    } catch (error) {
        console.error(
            `Error fetching detailed analytics for order ${orderId}:`,
            error
        )

        return null
    }
}