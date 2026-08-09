"use server"

import "server-only"

import { getVendorHeaders } from "./session"

const BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

/**
 * Retrieves the authenticated vendor profile.
 */
export async function getVendorProfile() {
    try {
        const response = await fetch(`${BACKEND_URL}/vendors/me`, {
            method: "GET",
            headers: await getVendorHeaders(),
            next: {
                revalidate: 60,
                tags: ["vendor_profile"],
            },
        })

        if (!response.ok) {
            return null
        }

        const data = await response.json()

        return data.vendor ?? null
    } catch (error) {
        console.error("[getVendorProfile]", error)
        return null
    }
}