import React from "react"
import { cookies } from "next/headers"
import EditProductFormClient from "./EditProductFormClient"

interface EditPageProps {
  params: Promise<{
    id: string
  }>
}
async function getVendorProductDetails(
  productId: string,
  token: string | undefined,
  host: string | null
) {
  if (!token) return null

  try {
    const ipAddress = host ? host.split(":")[0] : "localhost"
    const backendUrl = `http://${ipAddress}:9000`

    const response = await fetch(`${backendUrl}/vendors/products`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    })

    if (!response.ok) return null

    const data = await response.json()
    console.log("📦 Server-side data shape look-ahead:", data)

    // Handle different variations of array wrappers safely
    const productList = Array.isArray(data)
      ? data
      : data.products || data.vendor_products || data.data || []

    return productList.find((p: any) => p && p.id === productId) || null
  } catch (error) {
    console.error("❌ Failed server-side pre-fetch:", error)
    return null
  }
}

export default async function VendorProductEditPage({ params }: EditPageProps) {
  const { id } = await params

  // 1. Read headers and cookies securely
  const cookieStore = await cookies()

  // 🎯 FIX: Match the exact cookie token key present in your browser
  const serverToken = cookieStore.get("medusa_vendor_jwt")?.value

  // 2. Safely attempt server fetch
  const product = await getVendorProductDetails(id, serverToken, null)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <span className="text-xs font-mono text-ui-fg-subtle uppercase tracking-wider">
          WORKSPACE / PRODUCTS / EDIT
        </span>
        <h1 className="text-2xl font-bold text-ui-fg-base mt-2">
          Edit Product Workspace
        </h1>
      </div>

      <EditProductFormClient
        productId={id}
        initialProduct={product}
        serverToken={serverToken}
      />
    </div>
  )
}
