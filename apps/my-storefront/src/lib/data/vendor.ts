// ==== ./src/lib/data/vendor.ts ====
"use server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
/**
 * Server Action to orchestrate two-step Vendor Signups
 */
export async function signupVendor(prevState: any, formData: FormData) {
  const brandName = formData.get("brand_name") as string
  const firstName = formData.get("first_name") as string
  const lastName = formData.get("last_name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!brandName || !email || !password) {
    return "Missing required registration parameters."
  }

  try {
    // 1️⃣ Step One: Establish the credential entry in Medusa Auth
    const authResponse = await fetch(
      `${BACKEND_URL}/auth/vendor/emailpass/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    )

    const authData = await authResponse.json()
    if (!authResponse.ok) {
      return authData.message || "Failed to establish authorization identity."
    }

    const token = authData.token // Secure temporary authorization context bearer token
    const generatedHandle =
      brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Math.floor(Math.random() * 100000)

    // 2️⃣ Step Two: Pass bearer context to trigger createVendorWorkflow execution
    const vendorProfileResponse = await fetch(`${BACKEND_URL}/vendors`, {
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

    const profileData = await vendorProfileResponse.json()
    if (!vendorProfileResponse.ok) {
      return profileData.message || "Failed during marketplace profile linking."
    }

    // 3️⃣ Step Three: Commit session variables natively to Next.js cookie space
    const cookieStore = await cookies()
    cookieStore.set("medusa_vendor_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 Week
      path: "/",
    })
    cookieStore.set("user_role", "vendor", { path: "/" })
  } catch (error: any) {
    return error.message || "An unhandled execution error occurred."
  }

  // Once established, drop them into the core app matrix setup panel
  redirect("/vendor/dashboard")
}
/**
 * Helper to dynamically generate authenticated marketplace headers on Next.js Server Components.
 */
async function getVendorHeaders() {
  const cookieStore = await cookies()
  const token = cookieStore.get("medusa_vendor_jwt")?.value

  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
export async function registerVendorAccount(formData: FormData) {
  const brandName = formData.get("brand_name")
  const email = formData.get("email")

  // This target custom backend endpoint should handle atomic insertion:
  // 1. Create a Medusa user record with metadata: { role: "vendor_admin" }
  // 2. Initialize a Marketplace Vendor row
  // 3. Link them via your user-vendor junction table
  const response = await fetch(`$BACKEND_URL}/store/vendors/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, brandName }),
  })

  return response.json()
}
/**
 * Server Action to authenticate existing Marketplace Merchants
 */
export async function loginVendor(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return "Please fill in all authorization fields."
  }

  try {
    // Hit the core Medusa Auth Strategy for email/password validation
    const response = await fetch(`${BACKEND_URL}/auth/vendor/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return (
        data.message ||
        "Invalid merchant credentials. Please check and try again."
      )
    }

    // Capture the valid workflow auth session token
    const token = data.token

    // Commit matching authorization keys to Next.js cookie space
    const cookieStore = await cookies()
    cookieStore.set("medusa_vendor_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 Week session longevity
      path: "/",
    })
    cookieStore.set("user_role", "vendor", { path: "/" })
  } catch (error: any) {
    return (
      error.message ||
      "An unexpected error occurred during vendor verification."
    )
  }

  // Route cleanly into your isolated vendor panel matrix workspace
  redirect("/vendor/dashboard")
}
export async function signoutVendor() {
  const cookieStore = await cookies()

  // Clean house
  cookieStore.delete("medusa_vendor_jwt")
  cookieStore.delete("vendor_token_client")
  cookieStore.delete("user_role")

  return { success: true }
}
/**
 * Retrieves the profile data of the logged-in vendor merchant.
 */
export async function getVendorProfile() {
  if (!BACKEND_URL) return null

  try {
    const headers = await getVendorHeaders()
    const response = await fetch(`${BACKEND_URL}/vendors/me`, {
      method: "GET",
      headers,
      next: { revalidate: 60, tags: ["vendor_profile"] },
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.vendor || null
  } catch (error) {
    console.error("Error fetching vendor profile:", error)
    return null
  }
}

/**
 * Pulls all products belonging exclusively to the authenticated merchant.
 */
export async function getVendorProducts() {
  if (!BACKEND_URL) return []

  try {
    const headers = await getVendorHeaders()
    const response = await fetch(`${BACKEND_URL}/vendors/products`, {
      method: "GET",
      headers,
      next: { revalidate: 15, tags: ["vendor_products"] },
    })

    if (!response.ok) return []
    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error("Error retrieving vendor products:", error)
    return []
  }
}

/**
 * Retrieves the split orders and revenue metrics assigned to this vendor.
 */
/**
 * Server Action to update an existing vendor product's metadata or variant metrics
 */
export async function updateVendorProduct(
  productId: string,
  payload: { title?: string; status?: string; variants?: any[] }
) {
  if (!BACKEND_URL)
    return { success: false, error: "Missing backend URL configurations." }

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

    if (!response.ok) {
      const errData = await response.json()
      return {
        success: false,
        error: errData.message || "Failed to save product changes.",
      }
    }

    revalidatePath("/vendor/dashboard/products")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An unexpected error occurred.",
    }
  }
}

/**
 * Server Action to remove a product from the vendor's workspace and the marketplace index
 */
export async function deleteVendorProduct(productId: string) {
  if (!BACKEND_URL)
    return { success: false, error: "Missing backend configuration." }

  try {
    const headers = await getVendorHeaders()
    const response = await fetch(
      `${BACKEND_URL}/vendors/products/${productId}`,
      {
        method: "DELETE",
        headers,
      }
    )

    if (!response.ok) {
      const errData = await response.json()
      return {
        success: false,
        error: errData.message || "Deletion request rejected.",
      }
    }

    revalidatePath("/vendor/dashboard/products")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Execution exception occurred.",
    }
  }
}

/**
 * Pulls all split orders and revenue metrics assigned to this vendor.
 */
export async function getVendorOrders() {
  const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
  if (!BACKEND_URL) return []

  try {
    const headers = await getVendorHeaders()
    // Using pluralized "/vendors/orders" to match standard module setups
    const response = await fetch(`${BACKEND_URL}/vendors/orders`, {
      method: "GET",
      headers,
      next: { revalidate: 0, tags: ["vendor_orders"] },
    })

    if (!response.ok) return []
    const data = await response.json()
    return data.orders || []
  } catch (error) {
    console.error("Error fetching vendor split orders:", error)
    return []
  }
}

/**
 * Retrieves a detailed structural fulfillment node context for a single vendor order
 */
export async function getVendorOrderDetails(orderId: string) {
  const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
  if (!BACKEND_URL) return null

  try {
    const headers = await getVendorHeaders()
    const response = await fetch(`${BACKEND_URL}/vendors/orders/${orderId}`, {
      method: "GET",
      headers,
      next: { revalidate: 0, tags: [`vendor_order_${orderId}`] },
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.order || null
  } catch (error) {
    console.error(
      `Error fetching detailed analytics for order ${orderId}:`,
      error
    )
    return null
  }
}
