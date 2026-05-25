// ==== ./src/app/vendor/dashboard/products/page.tsx ====
import React from "react"
import Link from "next/link"
import { getVendorProducts } from "@lib/data/vendor"

export const revalidate = 0 // Ensure catalog loads fresh data on page hits

export default async function VendorProductsPage() {
  const products = await getVendorProducts()

  return (
    <div className="flex flex-col gap-y-8">
      {/* 🛠️ Top Control Summary Strip */}
      <div className="flex items-center justify-between border-b border-ui-border-base pb-6">
        <div>
          <h1 className="text-xlarge-semi text-ui-fg-base">My Products</h1>
          <p className="text-base-regular text-ui-fg-subtle mt-1">
            Manage your localized marketplace inventory, status variants, and stock tiers.
          </p>
        </div>
        
        {/* Placeholder route link for multi-vendor item generation forms */}
        <Link
          href="/vendor/dashboard/products/create"
          className="px-4 py-2 bg-black text-white text-small-semi rounded-md hover:bg-neutral-900 transition-colors shadow-sm"
        >
          Add New Product
        </Link>
      </div>

      {/* 📊 Inventory Dynamic Render Condition */}
      {!products || products.length === 0 ? (
        <div className="bg-white border border-ui-border-base rounded-lg p-12 text-center shadow-sm">
          <span className="text-base-semi text-ui-fg-base block">No inventory items found</span>
          <p className="text-small-regular text-ui-fg-subtle mt-1 max-w-sm mx-auto">
            Your storefront catalog is currently empty. Click the button above to register your first product variant in the marketplace ledger.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-ui-border-base rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ui-bg-subtle border-b border-ui-border-base text-ui-fg-subtle text-xsmall-semi uppercase tracking-wider">
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-6">Handle Reference</th>
                  <th className="py-4 px-6">Status Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-base text-small-regular text-ui-fg-base">
                {products.map((product: any) => {
                  // Determine status badge colors contextually
                  const isPublished = product.status === "published"
                  
                  return (
                    <tr key={product.id} className="hover:bg-ui-bg-disabled/30 transition-colors">
                      {/* Column 1: Title & ID Info */}
                      <td className="py-4 px-6 font-medium text-ui-fg-base">
                        <span className="block text-ui-fg-base font-semibold">{product.title}</span>
                        <span className="block text-xsmall-regular text-ui-fg-muted font-mono mt-0.5">
                          ID: {product.id}
                        </span>
                      </td>

                      {/* Column 2: Handle Route String */}
                      <td className="py-4 px-6 text-ui-fg-subtle font-mono text-xsmall-regular">
                        /{product.handle || "-"}
                      </td>

                      {/* Column 3: Custom Ledger Status Mapping */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full text-xsmall-semi font-medium capitalize ${
                          isPublished 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {product.status || "Draft"}
                        </span>
                      </td>

                      {/* Column 4: Quick Control Options */}
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/vendor/dashboard/products/edit/${product.id}`}
                          className="text-small-semi text-ui-fg-interactive hover:underline"
                        >
                          Edit Details
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}