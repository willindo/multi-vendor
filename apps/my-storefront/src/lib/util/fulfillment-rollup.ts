// src/lib/util/fulfillment-rollup.ts
import type { StorefrontLineItem } from "@lib/data/cart"

export type DerivedFulfillmentStatus = "not_fulfilled" | "processing" | "shipped" | "delivered" | "partially_fulfilled"

/**
 * Derives aggregate status from an array of item fulfillment statuses.
 */
export function deriveAggregateFulfillmentStatus(
    items: StorefrontLineItem[]
): DerivedFulfillmentStatus {
    if (!items || items.length === 0) return "not_fulfilled"

    const statuses = items.map(
        (item) => item.metadata?.fulfillment_status || "not_fulfilled"
    )

    const allDelivered = statuses.every((s) => s === "delivered")
    if (allDelivered) return "delivered"

    const allShippedOrDelivered = statuses.every((s) => s === "shipped" || s === "delivered")
    if (allShippedOrDelivered) return "shipped"

    const allUnfulfilled = statuses.every((s) => s === "not_fulfilled")
    if (allUnfulfilled) return "not_fulfilled"

    const hasAnyProgress = statuses.some(
        (s) => s === "processing" || s === "shipped" || s === "delivered"
    )
    if (hasAnyProgress) return "partially_fulfilled"

    return "processing"
}