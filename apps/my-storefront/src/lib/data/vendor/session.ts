import "server-only"

import { redirect } from "next/navigation"

import {
    getVendorAuthHeaders,
    getVendorAuthToken,
} from "../cookies"

const BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

const PUBLISHABLE_API_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Returns the configured Medusa backend URL.
 */
export function getBackendUrl(): string {
    return BACKEND_URL
}

/**
 * Standard authenticated headers for Marketplace Vendor requests.
 */
export async function getVendorHeaders(): Promise<Record<string, string>> {
    return {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
        ...(await getVendorAuthHeaders()),
    }
}

/**
 * Returns true when a vendor session exists.
 */
export async function isVendorAuthenticated(): Promise<boolean> {
    return Boolean(await getVendorAuthToken())
}

/**
 * Guards Server Components / Server Actions that require
 * an authenticated vendor session.
 */
export async function requireVendorAuth() {
    if (!(await isVendorAuthenticated())) {
        redirect("/vendor/login")
    }
}