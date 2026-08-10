import React from "react"
import Link from "next/link"
import { getVendorProducts } from "@lib/data/vendor/products"
import VendorProductsClientTable from "./VendorProductsClientTable"

export const revalidate = 0

export default async function VendorProductsPage() {
  const products = await getVendorProducts()

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* 🛠️ Luxury-Minimalist Header Strip */}
      <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Ateliers Inventory</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your localized marketplace inventory, status variants, and stock tiers.
          </p>
        </div>

        <div>
          <Link
            href="/vendor/dashboard/products/create"
            className="inline-flex items-center justify-center px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-all shadow-xs"
          >
            Add New Product
          </Link>
        </div>
      </div>

      {/* 📊 Inventory Dynamic Render */}
      {!products || products.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-neutral-200 rounded-2xl bg-white">
          <span className="text-sm font-medium text-neutral-400 block">No inventory items found</span>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            Your storefront catalog is currently empty. Start drafting your first composition.
          </p>
        </div>
      ) : (
        <VendorProductsClientTable initialProducts={products} />
      )}
    </div>
  )
}