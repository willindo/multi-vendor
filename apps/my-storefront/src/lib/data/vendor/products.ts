"use server"

import { revalidatePath } from "next/cache"

import {
    getBackendUrl,
    getVendorHeaders,
} from "./session"
import { buildVariantPayload, ProductOptionPayload } from "@/lib/util/vendor/product"
import { ApparelDetails } from "@shared/index"

const BACKEND_URL = getBackendUrl()

export interface CreateVendorProductPayload {
    title: string
    handle: string
    description?: string
    status?: string
    thumbnail?: string

    weight?: number

    type_id?: string | null
    collection_id?: string | null

    metadata?: Record<string, unknown>

    options?: ProductOptionPayload[]

    variants?: ReturnType<typeof buildVariantPayload>

    apparel_detail?: Partial<ApparelDetails>
}

export async function getVendorProducts() {
    if (!BACKEND_URL) return []

    try {
        const headers = await getVendorHeaders()

        const response = await fetch(
            `${BACKEND_URL}/vendors/products`,
            {
                headers,
                cache: "no-store",
            }
        )

        if (!response.ok) {
            return []
        }

        const data = await response.json()

        return data.products ?? []
    } catch (error) {
        console.error("Error loading vendor products:", error)
        return []
    }
}

export async function getVendorProduct(productId: string) {
    if (!BACKEND_URL) return null

    try {
        const headers = await getVendorHeaders()

        const response = await fetch(
            `${BACKEND_URL}/vendors/products/${productId}`,
            {
                headers,
                cache: "no-store",
            }
        )

        if (!response.ok) {
            return null
        }

        const data = await response.json()

        return data.product ?? data
    } catch (error) {
        console.error("Error loading vendor product:", error)
        return null
    }
}


export async function createVendorProduct(
    payload: CreateVendorProductPayload
) {
    try {
        const headers = await getVendorHeaders()

        const response = await fetch(
            `${BACKEND_URL}/vendors/products`,
            {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            }
        )

        let body: any = {}

        try {
            body = await response.json()
        } catch { }

        if (!response.ok) {
            return {
                success: false,
                error:
                    body.message ??
                    body.error ??
                    "Unable to create product.",
            }
        }

        revalidatePath("/vendor/dashboard/products")

        return {
            success: true,
            product: body.product,
        }
    } catch (e: any) {
        return {
            success: false,
            error:
                e.message ??
                "Unexpected error creating product.",
        }
    }
}

export async function updateVendorProduct(
    productId: string,
    payload: any
) {
    try {
        const headers = await getVendorHeaders()

        const response = await fetch(
            `${BACKEND_URL}/vendors/products/${productId}`,
            {
                method: "PATCH",
                headers,
                body: JSON.stringify(payload),
            }
        )

        let body: any = {}

        try {
            body = await response.json()
        } catch { }

        if (!response.ok) {
            return {
                success: false,
                error:
                    body.message ??
                    body.error ??
                    "Unable to update product.",
            }
        }

        revalidatePath("/vendor/dashboard/products")

        return {
            success: true,
            product: body.product,
        }
    } catch (e: any) {
        return {
            success: false,
            error:
                e.message ??
                "Unexpected update error.",
        }
    }
}

export async function deleteVendorProduct(
    productId: string
) {
    try {
        const headers = await getVendorHeaders()

        const response = await fetch(
            `${BACKEND_URL}/vendors/products/${productId}`,
            {
                method: "DELETE",
                headers,
            }
        )

        let body: any = {}

        try {
            body = await response.json()
        } catch { }

        if (!response.ok) {
            return {
                success: false,
                error:
                    body.message ??
                    body.error ??
                    "Unable to delete product.",
            }
        }

        revalidatePath("/vendor/dashboard/products")

        return {
            success: true,
        }
    } catch (e: any) {
        return {
            success: false,
            error:
                e.message ??
                "Unexpected delete error.",
        }
    }
}