"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import type {
  StorefrontOrder,
  StoreOrderResponse,
  StoreOrderListResponse,
} from "../../types/order"

/**
 * Retrieves a single order by ID with expanded multi-vendor fulfillment,
 * shipping, and item metadata.
 */
export const retrieveOrder = async (id: string): Promise<StorefrontOrder | null> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        fields:
          "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product,*shipping_methods,*fulfillments,*fulfillments.items,*fulfillments.labels",
      },
      headers,
      next,
      cache: "no-cache", // Replaces force-cache to show instant fulfillment updates
    })
    .then(({ order }) => order)
    .catch((err) => {
      medusaError(err)
      return null
    })
}

/**
 * Lists orders for the current customer with vendor item metadata.
 */
export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, unknown>
): Promise<StorefrontOrder[]> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields:
          "*items,*items.metadata,*items.variant,*items.product,*fulfillments,*shipping_methods",
        ...filters,
      },
      headers,
      next,
      cache: "no-cache",
    })
    .then(({ orders }) => orders || [])
    .catch((err) => {
      medusaError(err)
      return []
    })
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: StorefrontOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: StorefrontOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order: order as StorefrontOrder }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}