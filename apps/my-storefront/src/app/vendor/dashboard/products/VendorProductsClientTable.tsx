// ==== ./src/app/vendor/dashboard/products/VendorProductsClientTable.tsx ====
"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateVendorProduct, deleteVendorProduct } from "@lib/data/vendor"

interface Variant {
  id: string
  title: string
  sku?: string
  inventory_quantity?: number
  prices?: Array<{ amount: number; currency_code: string }>
}

interface Product {
  id: string
  title: string
  handle: string
  status: string
  variants?: Variant[]
}

export default function VendorProductsClientTable({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(initialProducts || [])
  const [isPending, startTransition] = useTransition()
  const [editingInventoryProductId, setEditingInventoryProductId] = useState<string | null>(null)

  const handleToggleStatus = async (product: Product) => {
    if (!product || !product.id) return
    const nextStatus = product.status === "published" ? "draft" : "published"
    
    setProducts(prev => prev.map(p => p && p.id === product.id ? { ...p, status: nextStatus } : p))

    startTransition(async () => {
      const res = await updateVendorProduct(product.id, { status: nextStatus })
      if (res.success) {
        router.refresh()
      } else {
        alert(res.error || "Failed to update status visibility.")
        setProducts(initialProducts || [])
      }
    })
  }

  const handleDelete = async (productId: string) => {
    if (!productId || !confirm("Are you sure you want to remove this product?")) return

    setProducts(prev => prev.filter(p => p && p.id !== productId))

    startTransition(async () => {
      const res = await deleteVendorProduct(productId)
      if (res.success) {
        router.refresh()
      } else {
        alert(res.error || "Could not complete item deletion.")
        setProducts(initialProducts || [])
      }
    })
  }

  return (
    <div className="bg-white border border-neutral-200/70 rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200/60 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="py-4 px-6">Product Details</th>
              <th className="py-4 px-6">Handle Reference</th>
              <th className="py-4 px-6">Visibility Status</th>
              <th className="py-4 px-6">Stock Level Matrix</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-xs text-neutral-700">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-neutral-400 font-medium">
                  No products found on your shop floor. Create one to get started!
                </td>
              </tr>
            ) : (
              products.map((product) => {
                if (!product || !product.id) return null
                const aggregateStock = product.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) ?? 0

                return (
                  <React.Fragment key={product.id}>
                    <tr className="hover:bg-neutral-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <span className="block text-neutral-900 font-semibold">
                            {product.title || "Untitled Composition"}
                          </span>
                          <span className="block text-[10px] font-mono text-neutral-400 mt-0.5">
                            ID: {product.id}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-neutral-500 font-mono text-xs">
                        /{product.handle || "-"}
                      </td>

                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase cursor-pointer select-none border transition-all ${
                            product.status === "published"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                              : "bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200"
                          }`}
                        >
                          <span className={`h-1 w-1 rounded-full ${product.status === "published" ? "bg-emerald-500" : "bg-neutral-400"}`} />
                          {product.status || "Draft"}
                        </button>
                      </td>

                      <td className="py-4 px-6 text-xs text-neutral-600">
                        <div className="flex items-center gap-x-2">
                          <span className="font-semibold text-neutral-900">
                            {aggregateStock} Units ({product.variants?.length || 0} SKUs)
                          </span>
                          <button
                            onClick={() => setEditingInventoryProductId(editingInventoryProductId === product.id ? null : product.id)}
                            className="text-neutral-400 hover:text-neutral-900 transition-colors text-[11px] font-medium underline underline-offset-2 decoration-neutral-200"
                          >
                            Review Metrics
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-x-3">
                          <Link
                            href={`/vendor/dashboard/products/edit/${product.id}`}
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md font-medium text-neutral-700 hover:bg-neutral-50 shadow-2xs"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={isPending}
                            className="text-neutral-400 hover:text-red-600 font-medium transition-colors px-1"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {editingInventoryProductId === product.id && (
                      <tr className="bg-neutral-50/50">
                        <td colSpan={5} className="py-4 px-8">
                          <div className="max-w-2xl bg-white p-5 rounded-xl border border-neutral-200/70 shadow-2xs">
                            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">
                              Variant Classifications & Pricing Matrix
                            </h4>
                            <div className="space-y-2 divide-y divide-neutral-50">
                              {product.variants?.map((variant) => {
                                if (!variant) return null
                                const isINR = variant.prices?.[0]?.currency_code?.toLowerCase() === "inr"
                                const currencySign = isINR ? "₹" : "$"
                                const priceAmount = variant.prices?.[0]?.amount 
                                  ? `${currencySign}${(variant.prices[0].amount / 100).toFixed(2)}`
                                  : "No Price Set"

                                return (
                                  <div key={variant.id} className="flex items-center justify-between pt-2 text-xs first:pt-0">
                                    <span className="font-medium text-neutral-800">{variant.title}</span>
                                    <div className="flex gap-x-6 font-mono text-[11px] text-neutral-400">
                                      <span>Base Price: <strong className="text-neutral-700 font-sans">{priceAmount}</strong></span>
                                      <span>Quantity: <strong className="text-neutral-700 font-sans">{variant.inventory_quantity || 0}</strong></span>
                                      <span>SKU: <span className="text-neutral-600">{variant.sku || "N/A"}</span></span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}