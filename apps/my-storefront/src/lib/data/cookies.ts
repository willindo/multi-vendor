import "server-only"

import { cookies as nextCookies } from "next/headers"

const ONE_WEEK = 60 * 60 * 24 * 7

const COOKIE_OPTIONS = {
    maxAge: ONE_WEEK,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
}

/* -------------------------------------------------------------------------- */
/*                               Customer Auth                                */
/* -------------------------------------------------------------------------- */

export const getAuthToken = async () => {
    const cookies = await nextCookies()
    return cookies.get("_medusa_jwt")?.value
}

export const getAuthHeaders = async (): Promise<
    { authorization: string } | {}
> => {
    try {
        const token = await getAuthToken()

        if (!token) {
            return {}
        }

        return {
            authorization: `Bearer ${token}`,
        }
    } catch {
        return {}
    }
}

export const setAuthToken = async (token: string) => {
    const cookies = await nextCookies()

    cookies.set("_medusa_jwt", token, COOKIE_OPTIONS)
}

export const removeAuthToken = async () => {
    const cookies = await nextCookies()

    cookies.set("_medusa_jwt", "", {
        maxAge: -1,
    })
}

/* -------------------------------------------------------------------------- */
/*                                Vendor Auth                                 */
/* -------------------------------------------------------------------------- */

export const getVendorAuthToken = async () => {
    const cookies = await nextCookies()
    return cookies.get("medusa_vendor_jwt")?.value
}

export const getVendorAuthHeaders = async (): Promise<
    Record<string, string>
> => {
    const token = await getVendorAuthToken()

    return token
        ? {
            Authorization: `Bearer ${token}`,
        }
        : {}
}

export const setVendorAuthToken = async (token: string) => {
    const cookies = await nextCookies()

    cookies.set("medusa_vendor_jwt", token, {
        ...COOKIE_OPTIONS,
        path: "/",
    })
}

export const removeVendorAuthToken = async () => {
    const cookies = await nextCookies()

    cookies.delete("medusa_vendor_jwt")
}

export const setVendorRole = async () => {
    const cookies = await nextCookies()

    cookies.set("user_role", "vendor", {
        path: "/",
    })
}

export const removeVendorRole = async () => {
    const cookies = await nextCookies()

    cookies.delete("user_role")
}

/* -------------------------------------------------------------------------- */
/*                                   Cache                                    */
/* -------------------------------------------------------------------------- */

export const getCacheTag = async (tag: string): Promise<string> => {
    try {
        const cookies = await nextCookies()
        const cacheId = cookies.get("_medusa_cache_id")?.value

        if (!cacheId) {
            return ""
        }

        return `${tag}-${cacheId}`
    } catch {
        return ""
    }
}

export const getCacheOptions = async (
    tag: string
): Promise<{ tags: string[] } | {}> => {
    if (typeof window !== "undefined") {
        return {}
    }

    const cacheTag = await getCacheTag(tag)

    if (!cacheTag) {
        return {}
    }

    return {
        tags: [cacheTag],
    }
}

/* -------------------------------------------------------------------------- */
/*                                    Cart                                    */
/* -------------------------------------------------------------------------- */

export const getCartId = async () => {
    const cookies = await nextCookies()
    return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
    const cookies = await nextCookies()
    cookies.set("_medusa_cart_id", cartId, {
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    })
}

export const removeCartId = async () => {
    const cookies = await nextCookies()
    cookies.set("_medusa_cart_id", "", {
        maxAge: -1,
    })
}