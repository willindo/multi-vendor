"use server"

import { revalidatePath } from "next/cache"
import { getBackendUrl, getVendorHeaders } from "./session"
import { buildVariantPayload, ProductOptionPayload } from "@/lib/util/vendor/product"
import { ApparelDetails } from "@shared/index"
import { meilisearchClient } from "@/lib/meilisearch-client"

const BACKEND_URL = getBackendUrl()
const INDEX_NAME = process.env.NEXT_PUBLIC_SEARCH_INDEX_NAME || "products"

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
        const response = await fetch(`${BACKEND_URL}/vendors/products`, {
            headers,
            cache: "no-store",
        })
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
        const response = await fetch(`${BACKEND_URL}/vendors/products/${productId}`, {
            headers,
            cache: "no-store",
        })
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

export async function createVendorProduct(payload: CreateVendorProductPayload) {
    try {
        const headers = await getVendorHeaders()
        const response = await fetch(`${BACKEND_URL}/vendors/products`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        })

        let body: any = {}
        try {
            body = await response.json()
        } catch { }

        if (!response.ok) {
            return {
                success: false,
                error: body.message ?? body.error ?? "Unable to create product.",
            }
        }

        const createdProduct = body.product

        // Sync to Meilisearch Index
        if (createdProduct && createdProduct.id) {
            try {
                const index = meilisearchClient.index(INDEX_NAME)
                await index.addDocuments([
                    {
                        id: createdProduct.id,
                        title: createdProduct.title,
                        handle: createdProduct.handle,
                        description: createdProduct.description,
                        thumbnail: createdProduct.thumbnail,
                        status: createdProduct.status,
                        vendor_id: createdProduct.vendor_id,
                        vendor_name: createdProduct.vendor?.name,
                        vendor_handle: createdProduct.vendor?.handle,
                        created_at: createdProduct.created_at,
                    },
                ])
            } catch (searchError) {
                console.error("[Meilisearch Sync Error] Document insertion failed:", searchError)
            }
        }

        revalidatePath("/vendor/dashboard/products")
        return {
            success: true,
            product: createdProduct,
        }
    } catch (e: any) {
        return {
            success: false,
            error: e.message ?? "Unexpected error creating product.",
        }
    }
}

export async function updateVendorProduct(productId: string, payload: any) {
    try {
        const headers = await getVendorHeaders()
        const response = await fetch(`${BACKEND_URL}/vendors/products/${productId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload),
        })

        let body: any = {}
        try {
            body = await response.json()
        } catch { }

        if (!response.ok) {
            return {
                success: false,
                error: body.message ?? body.error ?? "Unable to update product.",
            }
        }

        const updatedProduct = body.product

        // Update document in Meilisearch Index
        if (updatedProduct && updatedProduct.id) {
            try {
                const index = meilisearchClient.index(INDEX_NAME)
                await index.updateDocuments([
                    {
                        id: updatedProduct.id,
                        title: updatedProduct.title,
                        handle: updatedProduct.handle,
                        description: updatedProduct.description,
                        thumbnail: updatedProduct.thumbnail,
                        status: updatedProduct.status,
                    },
                ])
            } catch (searchError) {
                console.error("[Meilisearch Sync Error] Document update failed:", searchError)
            }
        }

        revalidatePath("/vendor/dashboard/products")
        return {
            success: true,
            product: updatedProduct,
        }
    } catch (e: any) {
        return {
            success: false,
            error: e.message ?? "Unexpected update error.",
        }
    }
}

export async function deleteVendorProduct(productId: string) {
    try {
        const headers = await getVendorHeaders()
        const response = await fetch(`${BACKEND_URL}/vendors/products/${productId}`, {
            method: "DELETE",
            headers,
        })

        let body: any = {}
        try {
            body = await response.json()
        } catch { }

        if (!response.ok) {
            return {
                success: false,
                error: body.message ?? body.error ?? "Unable to delete product.",
            }
        }

        // Remove document from Meilisearch Index
        try {
            const index = meilisearchClient.index(INDEX_NAME)
            await index.deleteDocument(productId)
        } catch (searchError) {
            console.error("[Meilisearch Sync Error] Document deletion failed:", searchError)
        }

        revalidatePath("/vendor/dashboard/products")
        return {
            success: true,
        }
    } catch (e: any) {
        return {
            success: false,
            error: e.message ?? "Unexpected delete error.",
        }
    }
}