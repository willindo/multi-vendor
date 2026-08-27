// src/lib/util/cart-vendor.ts
import type { StorefrontLineItem } from "@lib/data/cart"
import { deriveAggregateFulfillmentStatus, DerivedFulfillmentStatus } from "@lib/util/fulfillment-rollup"

export type VendorPartition = {
    id: string
    name: string
    status: DerivedFulfillmentStatus
    items: StorefrontLineItem[]
    subtotal: number
}

export function groupAndSortVendorPartitions(
    items?: StorefrontLineItem[]
): VendorPartition[] {
    if (!items || items.length === 0) return []

    const grouped = items.reduce((acc, item) => {
        const vendorId = item.metadata?.vendor_id || "platform"
        const vendorName =
            item.metadata?.vendor_name ||
            (vendorId === "platform"
                ? "Direct Platform Store"
                : `Partner Vendor (${vendorId.slice(0, 8)})`)

        if (!acc[vendorId]) {
            acc[vendorId] = {
                id: vendorId,
                name: vendorName,
                status: "not_fulfilled",
                items: [],
                subtotal: 0,
            }
        }
        acc[vendorId].items.push(item)
        acc[vendorId].subtotal += (item.unit_price || 0) * (item.quantity || 1)
        return acc
    }, {} as Record<string, VendorPartition>)

    // Calculate derived vendor fulfillment status for each partition
    const partitions = Object.values(grouped).map((partition) => ({
        ...partition,
        status: deriveAggregateFulfillmentStatus(partition.items),
    }))

    // Sort Platform first, then alphabetically by vendor name
    return partitions.sort((a, b) => {
        if (a.id === "platform") return -1
        if (b.id === "platform") return 1
        return a.name.localeCompare(b.name)
    })
}