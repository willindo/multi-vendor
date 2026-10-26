// src/lib/data/products.ts
"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"
import { normalizeProduct } from "../util/normalize-product"
import { meilisearchClient } from "@lib/meilisearch-client"
import { queryStorefrontCatalog, StoreFilterParams } from "@lib/search-server"
import { ExtendedMarketplaceProduct } from "@/types/marketplace"

type ProductHandleProps = {
    product: ExtendedMarketplaceProduct
    // handle: string
    // countryCode: string
}
//  Define custom query params interface extending Medusa defaults
export interface StorefrontProductQueryParams
    extends HttpTypes.FindParams,
    HttpTypes.StoreProductParams {
    q?: string
    id?: string[]
    category_id?: string[]
    collection_id?: string[]
    tag_id?: string[]
    tags?: string[]
    material?: string[]
    fit?: string[]
    sizes?: string[]
    colors?: string[]
    gender?: string
    minPrice?: number
    maxPrice?: number
    inStockOnly?: boolean
}

export type ListProductsQuery = StoreFilterParams & {
    q?: string
    id?: string | string[]
}

/**
 * Fetch a single product by handle directly from Medusa API for exact, 
 * up-to-date inventory levels, location data, and variants on PDPs.
 */
export const getProductByHandle = async (handle: string, countryCode: string) => {
    const region = await getRegion(countryCode)
    if (!region) return null

    const headers = { ...(await getAuthHeaders()) }
    const next = { ...(await getCacheOptions("products")) }

    try {
        const { products } = await sdk.client.fetch<{ products: ProductHandleProps[] }>(
            `/store/products`,
            {
                method: "GET",
                query: {
                    // ...(id && { id: [id] as any }),
                    handle,
                    region_id: region.id,
                    // currency_code: region.currency_code,
                    // countryCode: region.countries?.[0]?.iso_2,
                    fields:
                        "*variants,*variants.options,*options,*options.values,*images,*variants.images," +
                        "title,description,subtitle,material," +
                        "collection.id,collection.title,collection.handle," +
                        "categories.id,categories.name,categories.handle," +
                        "tags.id,tags.value," +
                        "+variants.inventory_quantity,+variants.inventory_items.inventory.location_levels.*," +
                        "+apparel_detail.*,+metadata"
                },
                headers,
                // next: { revalidate: 30 },
                cache: "force-cache",
            }
        )

        const product = products?.[0]
        return product ? normalizeProduct(product) : null
    } catch (error) {
        console.error(`[getProductByHandle] Error fetching handle "${handle}":`, error)
        return null
    }
}

/**
 * Paginated catalog listing backed by Meilisearch.
 * Maps Medusa filter params into Meilisearch queries for sub-20ms listing speeds.
 */
export const listProducts = async ({
    pageParam = 1,
    queryParams,
    countryCode,
    regionId,
}: {
    pageParam?: number
    // queryParams?: StoreFilterParams & { q?: string; id?: string[] }
    queryParams?: ListProductsQuery
    countryCode?: string
    regionId?: string
}): Promise<{
    response: { products: HttpTypes.StoreProduct[]; count: number }
    nextPage: number | null
    // queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
    queryParams?: ListProductsQuery
}> => {
    if (!countryCode && !regionId) {
        throw new Error("Country code or region ID is required")
    }

    const limit = queryParams?.limit ?? 12
    const page = Math.max(pageParam, 1)

    const region = countryCode
        ? await getRegion(countryCode)
        : await retrieveRegion(regionId!)

    if (!region) {
        return { response: { products: [], count: 0 }, nextPage: null }
    }

    try {
        const searchResult = await queryStorefrontCatalog({
            q: queryParams?.q || "",

            // ✅ Forward everything
            id: queryParams?.id,
            category_id: queryParams?.category_id,
            category: queryParams?.category,
            subcategory: queryParams?.subcategory,
            collection_id: queryParams?.collection_id,
            tag_id: queryParams?.tag_id,
            tags: queryParams?.tags,
            material: queryParams?.material,
            fit: queryParams?.fit,
            sizes: queryParams?.sizes,
            colors: queryParams?.colors,
            gender: queryParams?.gender,
            minPrice: queryParams?.minPrice,
            maxPrice: queryParams?.maxPrice,
            inStockOnly: queryParams?.inStockOnly,
            sortBy: queryParams?.sortBy,
            sort: queryParams?.sort,

            page,
            limit,
        })

        const products = (searchResult.hits || []).map(normalizeProduct) as HttpTypes.StoreProduct[]
        const count = searchResult.totalHits || 0
        const nextPage = count > page * limit ? page + 1 : null

        return {
            response: { products, count },
            nextPage,
            queryParams: queryParams as any,
        }
    } catch (error) {
        console.error("[listProducts] Meilisearch fetch failed:", error)
        return {
            response: { products: [], count: 0 },
            nextPage: null,
            queryParams: queryParams as any,
        }
    }
}

/**
 * Sorted catalog listings utilizing Meilisearch native index sorting.
 * Avoids downloading 100+ raw records to memory just to sort them client-side.
 */
export const listProductsWithSort = async ({
    page = 1,
    queryParams,
    sortBy = "created_at_desc",
    countryCode,
}: {
    page?: number
    queryParams?: StorefrontProductQueryParams
    sortBy?: SortOptions
    countryCode: string
}): Promise<{
    response: { products: HttpTypes.StoreProduct[]; count: number }
    nextPage: number | null
    queryParams?: StorefrontProductQueryParams
}> => {

    const limit = queryParams?.limit || 12
    const currentPage = Math.max(page, 1)

    // Ensure mapping targets your indexed price field
    const sortMap: Record<SortOptions, string[]> = {
        created_at_desc: ["created_at:desc"],
        // price_asc: ["variants.calculated_price:asc"],
        // price_desc: ["variants.calculated_price:desc"],
        price_asc: ["price:asc"],       // ✅ matches filter field
        price_desc: ["price:desc"],
    }

    try {
        const searchResult = await queryStorefrontCatalog({
            q: queryParams?.q || "",
            id: queryParams?.id,
            category_id: queryParams?.category_id,
            collection_id: queryParams?.collection_id,
            tag_id: queryParams?.tag_id,
            tags: queryParams?.tags,
            material: queryParams?.material,
            fit: queryParams?.fit,
            sizes: queryParams?.sizes,
            colors: queryParams?.colors,
            gender: queryParams?.gender,
            minPrice: queryParams?.minPrice,
            maxPrice: queryParams?.maxPrice,
            inStockOnly: queryParams?.inStockOnly,
            page: currentPage,
            limit,
            sortBy,
            // sort: sortMap[sortBy] || ["created_at"],
        })

        const products = (searchResult.hits || []).map(normalizeProduct)
        const count = searchResult.totalHits || 0
        const nextPage = count > currentPage * limit ? currentPage + 1 : null

        return {
            response: {
                products,
                count,
            },
            nextPage,
            queryParams,
        }
    } catch (error) {
        console.error("[listProductsWithSort] Error sorting via Meilisearch:", error)
        return {
            response: { products: [], count: 0 },
            nextPage: null,
            queryParams,
        }
    }
}

/**
 * Batch product handle lookup using Meilisearch filters instead of multiple API fetches.
 */
export const listProductsByHandles = async ({
    countryCode,
    handles,
}: {
    countryCode: string
    handles: string[]
}) => {
    if (!handles || handles.length === 0) {
        return []
    }

    const indexName = process.env.NEXT_PUBLIC_SEARCH_INDEX_NAME || "products"
    const filterString = handles.map((h) => `handle = "${h}"`).join(" OR ")

    try {
        const index = meilisearchClient.index(indexName)
        const response = await index.search("", {
            filter: `(${filterString})`,
            limit: handles.length,
        })

        const productMap = new Map((response.hits || []).map((p) => [p.handle, normalizeProduct(p)]))
        return handles.map((h) => productMap.get(h)).filter(Boolean) as HttpTypes.StoreProduct[]
    } catch (error) {
        console.error("[listProductsByHandles] Meilisearch lookup failed:", error)
        return []
    }
}