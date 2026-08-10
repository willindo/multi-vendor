// ==== ./src/app/vendor/dashboard/products/edit/[id]/page.tsx ====
import React from "react"
import { cookies, headers } from "next/headers"
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
    // Resolve upstream network mapping contexts properly
    // const ipAddress = host ? host.split(":")[0] : "127.0.0.1"
    // const backendUrl = ipAddress === "localhost" || ipAddress === "127.0.0.1" 
    //   ? "http://localhost:9000" 
    //   : `http://${ipAddress}:9000`
    const backendUrl = "http://localhost:9000"

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
  const cookieStore = await cookies()
  const headerList = await headers() // Awaited cleanly

  const serverToken = cookieStore.get("medusa_vendor_jwt")?.value
  const host = headerList.get("host") // Synchronous extraction

  const product = await getVendorProductDetails(id, serverToken, host)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
          WORKSPACE / PRODUCTS / EDIT
        </span>
        <h1 className="text-2xl font-bold text-neutral-900 mt-2">
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