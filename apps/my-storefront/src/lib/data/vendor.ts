// ==== ./src/lib/data/vendor.ts ====
import { cookies } from "next/headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

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
export async function getVendorOrders() {
  if (!BACKEND_URL) return []

  try {
    const headers = await getVendorHeaders()
    const response = await fetch(`${BACKEND_URL}/vendors/orders`, {
      method: "GET",
      headers,
      next: { revalidate: 30, tags: ["vendor_orders"] },
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
 * Fetches products filtered by a specific vendor ID directly from Meilisearch
 */
export async function getStorefrontProductsByVendor(vendorId: string) {
  const MEILI_URL =
    process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://127.0.0.1:7700"
  const MEILI_MASTER_KEY = process.env.NEXT_PUBLIC_SEARCH_API_KEY || "masterKey"

  try {
    const response = await fetch(`${MEILI_URL}/indexes/products/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_MASTER_KEY}`,
      },
      body: JSON.stringify({
        q: "", // Empty string pulls the full index slice
        filter: [`vendor_id = '${vendorId}'`],
        limit: 12,
      }),
      next: { revalidate: 60, tags: [`vendor_storefront_${vendorId}`] },
    })

    if (!response.ok) return []
    const data = await response.json()
    return data.hits || []
  } catch (error) {
    console.error("Failed fetching vendor public products:", error)
    return []
  }
}
