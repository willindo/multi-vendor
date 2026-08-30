// ==== ./src/app/vendor/dashboard/products/[id]/edit/page.tsx ====
import React from "react"
import { cookies } from "next/headers"
import EditProductFormClient from "./EditProductFormClient"
import { getVendorProduct } from "@/lib/data/vendor"

interface EditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function VendorProductEditPage({ params }: EditPageProps) {
  const { id } = await params
  const cookieStore = await cookies()
  const serverToken = cookieStore.get("medusa_vendor_jwt")?.value
  const product = await getVendorProduct(id)
  console.log(product, "Product Details")

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