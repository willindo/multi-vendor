// src/app/vendor/dashboard/products/VendorProductsClientTable.tsx
"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateVendorProduct, deleteVendorProduct } from "@lib/data/vendor/products"
import {
  extractFormattedPrice,
  hydrateVariantRows,
  type VariantMatrixRow,
} from "@/lib/util/vendor/hydration"

interface Variant {
  id: string
  title: string
  sku?: string
  inventory_quantity?: number
  manage_inventory?: boolean
  prices?: Array<{ id?: string; amount: number; currency_code: string }>
  price_set?: {
    prices?: Array<{ id?: string; amount: number; currency_code: string }>
  }
  options?: Array<{ option_name?: string; optionName?: string; value: string }>
}

interface Product {
  id: string
  title: string
  handle: string
  status: string
  variants?: Variant[]
}

export default function VendorProductsClientTable({
  initialProducts,
}: {
  initialProducts: Product[]
}) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(initialProducts || [])
  const [isPending, startTransition] = useTransition()
  const [editingInventoryProductId, setEditingInventoryProductId] = useState<string | null>(null)

  const handleToggleStatus = async (product: Product) => {
    if (!product?.id) return
    const nextStatus = product.status === "published" ? "draft" : "published"

    setProducts((prev) =>
      prev.map((p) => (p && p.id === product.id ? { ...p, status: nextStatus } : p))
    )

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

    setProducts((prev) => prev.filter((p) => p && p.id !== productId))

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

  const toggleInventoryRow = (productId: string) => {
    setEditingInventoryProductId((prev) => (prev === productId ? null : productId))
  }

  return (
    <div className="w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
      {products.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No products found. Add your first item to get started.
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-700">
            <tr>
              <th className="px-6 py-3">Product Name</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Price Range</th>
              <th className="px-6 py-3">Variants</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {products.map((product) => {
              const variants = product.variants || []
              const firstVariant = variants[0]

              // Hydrate matrix rows for detailed inspection
              const hydratedVariants: VariantMatrixRow[] = hydrateVariantRows(product, "INR")

              // Primary row price formatting
              const priceDisplay = firstVariant
                ? extractFormattedPrice(firstVariant, "INR")
                : "N/A"

              const isExpanded = editingInventoryProductId === product.id

              return (
                <React.Fragment key={product.id}>
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div>{product.title} </div>
                      <div className="text-xs text-gray-400">/{product.handle}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        disabled={isPending}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border transition-opacity ${product.status === "published"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                      >
                        {product.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {priceDisplay}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {variants.length} {variants.length === 1 ? "Variant" : "Variants"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => toggleInventoryRow(product.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        {isExpanded ? "Hide Matrix" : "Review Metrics"}
                      </button>
                      <Link
                        href={`/vendor/dashboard/products/${product.id}/edit`}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        disabled={isPending}
                        className="text-xs text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="space-y-2 border-l-2 border-indigo-500 pl-4">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                            Variant Classifications &amp; Pricing Matrix
                          </h4>
                          {hydratedVariants.length === 0 ? (
                            <p className="text-xs text-gray-400">No variants available.</p>
                          ) : (
                            hydratedVariants.map((v) => (
                              <div
                                key={v.id}
                                className="flex items-center justify-between bg-white p-2.5 rounded border border-gray-200 text-xs text-gray-700"
                              >
                                <span className="font-medium text-gray-900">
                                  {v.title}
                                </span>
                                <div className="flex items-center space-x-6">
                                  <span>
                                    SKU:{" "}
                                    <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600">
                                      {v.sku || "N/A"}
                                    </code>
                                  </span>
                                  <span>
                                    Price:{" "}
                                    <strong>
                                      {(v.currencyCode as any).toUpperCase()} {v.price as any}
                                    </strong>
                                  </span>
                                  <span>
                                    Stock: <strong>{v.inventoryQuantity}</strong>
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}