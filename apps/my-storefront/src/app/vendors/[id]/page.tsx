// ==== ./src/app/vendors/[id]/page.tsx ====

import React from "react"
import { getStorefrontProductsByVendor } from "@lib/data/vendor"
import Link from "next/link"

interface VendorPageProps {
  params: Promise<{ id: string }>
}

export default async function VendorCollectionPage({ params }: VendorPageProps) {
  const { id } = await params
  const products = await getStorefrontProductsByVendor(id)
  
  // Use the vendor name field from the first payload element if available
  const merchantName = products[0]?.vendor_name || "Featured Merchant"

  return (
    <div className="py-12 px-4 md:px-8 max-w-7xl mx-auto bg-neutral-50 min-h-screen">
      {/* Merchant Spotlight Header */}
      <div className="border-b border-gray-200 pb-8 mb-12">
        <span className="text-xs font-semibold tracking-widest text-emerald-600 uppercase block mb-2">
          Verified Marketplace Partner
        </span>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          {merchantName} Collection
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Discover curated goods shipped directly from {merchantName}'s fulfillment center.
        </p>
      </div>

      {/* Grid Iteration Showcase */}
      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 font-medium">No products listed by this merchant yet.</p>
          <Link href="/" className="text-emerald-600 hover:underline mt-2 inline-block text-sm">
            Return to main marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product: any) => (
            <div 
              key={product.id} 
              className="group bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="p-5">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                  {product.vendor_name}
                </span>
                <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-600 transition-colors line-clamp-1">
                  {product.title}
                </h3>
                <p className="text-gray-500 text-xs mt-2 line-clamp-2 min-h-[2rem]">
                  {product.description || "No item summary configured."}
                </p>
              </div>
              
              <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">
                  {product.handle}
                </span>
                <Link 
                  href={`/products/${product.handle}`}
                  className="bg-black text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  View Item
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}