import { HttpTypes } from "@medusajs/types"

// 1. Multi-Vendor Metadata Interface
export interface VendorItemMetadata {
    vendor_id?: string
    vendor_name?: string
    fulfillment_status?: "not_fulfilled" | "processing" | "shipped" | "delivered"
    shipped_at?: string | null
    tracking_number?: string | null
    [key: string]: unknown
}

// 2. Modified Store Line Item using HttpTypes
export type StorefrontOrderLineItem = Omit<HttpTypes.StoreOrderLineItem, "metadata"> & {
    metadata?: VendorItemMetadata | null
}

// 3. Extended Fulfillment details
export type StorefrontOrderFulfillment = HttpTypes.AdminOrderFulfillment & {
    items?: Array<{
        id: string
        fulfillment_id: string
        order_item_id: string
        quantity: number
    }>
    labels?: Array<{
        id: string
        tracking_number: string
        tracking_url: string
    }>
}

// 4. Fully Typed Storefront Order matching HttpTypes
export type StorefrontOrder = Omit<HttpTypes.StoreOrder, "items" | "fulfillments" | "shipping_methods"> & {
    items?: StorefrontOrderLineItem[]
    fulfillments?: StorefrontOrderFulfillment[]
    shipping_methods?: HttpTypes.StoreOrderShippingMethod[]
}

// 5. Response Wrappers matching Medusa SDK
export interface StoreOrderResponse {
    order: StorefrontOrder
}

export interface StoreOrderListResponse {
    orders: StorefrontOrder[]
    count?: number
    offset?: number
    limit?: number
}