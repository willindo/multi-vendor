"use server"

import "server-only"

import { redirect } from "next/navigation"

import {
    removeVendorAuthToken,
    removeVendorRole,
    setVendorAuthToken,
    setVendorRole,
} from "../cookies"

const BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

const PUBLISHABLE_API_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Register a new Marketplace Vendor.
 */
export async function signupVendor(
    prevState: any,
    formData: FormData
) {
    const brandName = formData.get("brand_name") as string
    const firstName = formData.get("first_name") as string
    const lastName = formData.get("last_name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!brandName || !email || !password) {
        return "Missing required registration parameters."
    }

    try {
        const authResponse = await fetch(
            `${BACKEND_URL}/auth/vendor/emailpass/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        )

        const authData = await authResponse.json()

        if (!authResponse.ok) {
            return (
                authData.message ??
                "Failed to establish authorization identity."
            )
        }

        const token = authData.token

        const generatedHandle =
            brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
            "-" +
            Math.floor(Math.random() * 100000)

        const vendorResponse = await fetch(`${BACKEND_URL}/vendors`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                name: brandName,
                handle: generatedHandle,
                admin: {
                    email,
                    first_name: firstName,
                    last_name: lastName,
                },
            }),
        })

        const vendorData = await vendorResponse.json()

        if (!vendorResponse.ok) {
            return (
                vendorData.message ??
                "Failed during marketplace profile linking."
            )
        }

        await setVendorAuthToken(token)
        await setVendorRole()
    } catch (error: any) {
        return (
            error.message ??
            "An unhandled execution error occurred."
        )
    }

    redirect("/vendor/dashboard")
}

/**
 * Login Vendor
 */
export async function loginVendor(
    prevState: any,
    formData: FormData
) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
        return "Please fill in all authorization fields."
    }

    try {
        const authResponse = await fetch(
            `${BACKEND_URL}/auth/vendor/emailpass`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-publishable-api-key":
                        PUBLISHABLE_API_KEY,
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        )

        const authData = await authResponse.json()

        if (!authResponse.ok) {
            return (
                authData.message ??
                "Invalid merchant credentials."
            )
        }

        let token = authData.token

        const sessionResponse = await fetch(
            `${BACKEND_URL}/auth/session`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-publishable-api-key":
                        PUBLISHABLE_API_KEY,
                },
            }
        )

        if (sessionResponse.ok) {
            const session = await sessionResponse.json()

            if (session.token) {
                token = session.token
            }
        }

        await setVendorAuthToken(token)
        await setVendorRole()
    } catch (error: any) {
        return (
            error.message ??
            "Unexpected authentication error."
        )
    }

    redirect("/vendor/dashboard")
}

/**
 * Logout Vendor
 */
export async function signoutVendor() {
    await removeVendorAuthToken()
    await removeVendorRole()

    return {
        success: true,
    }
}