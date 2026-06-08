// ==== ./src/app/vendor/dashboard/products/create/page.tsx ====
import React from "react"
import { cookies } from "next/headers"
import CreateProductFormClient from "./CreateProductFormClient"

export default async function VendorProductCreatePage() {
  const cookieStore = await cookies()
  const serverToken = cookieStore.get("medusa_vendor_jwt")?.value

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
          WORKSPACE / PRODUCTS / CREATE
        </span>
        <h1 className="text-2xl font-bold text-neutral-900 mt-2">
          Draft New Composition
        </h1>
      </div>

      <CreateProductFormClient serverToken={serverToken} />
    </div>
  )
}