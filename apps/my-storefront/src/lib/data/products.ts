// src/lib/data/products.ts
"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"
import { normalizeProduct } from "../util/normalize-product"

export const getProductByHandle = async (handle: string, countryCode: string) => {
  const region = await getRegion(countryCode)
  if (!region) return null

  const headers = { ...(await getAuthHeaders()) }
  const next = { ...(await getCacheOptions("products")) }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[] }>(`/store/products`, {
      method: "GET",
      query: {
        handle,
        region_id: region.id,
        currency_code: region.currency_code,
        // Request inventory relation fields explicitly
        fields:
          "*variants,*variants.options,*options,*options.values,*images,*variants.images,+variants.inventory_quantity,+variants.inventory_items.inventory.location_levels.*,+metadata",
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ products }) => {
      const product = products?.[0]
      return product ? normalizeProduct(product) : null
    })
}
export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            // "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,+vendor_id,+vendor_name,+apparel_detail.*",
            // "*variants,*variants.options,*options,*options.values,*images,*variants.images,+metadata,+tags,+vendor_id,+vendor_name,+apparel_detail.*",
            "*variants,*variants.options,*options,*options.values,*images,*variants.images,+variants.inventory_quantity,+variants.inventory_items.inventory.location_levels.*,+apparel_detail.*",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      // Normalize all variants across products
      const normalizedProducts = (products || []).map(normalizeProduct)
      const nextPage = count > offset + limit ? pageParam + 1 : null
      console.log('count', count)
      return {
        response: {
          products: normalizedProducts,
          count,
        },
        // nextPage: nextPage,
        nextPage: count > offset + limit ? pageParam + 1 : null,
        queryParams,
      }
    })
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}
export const listProductsByHandles = async ({
  countryCode,
  handles,
}: {
  countryCode: string
  handles: string[]
}) => {
  if (!handles.length) {
    return []
  }

  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: {
      handle: handles,
      limit: handles.length,
    },
  })

  const map = new Map(products.map((p) => [p.handle, p]))

  return handles.map((h) => map.get(h)).filter(Boolean)
}
