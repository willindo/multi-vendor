// src/modules/checkout/components/vendor-split-summary/index.tsx
import React from "react"
import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import { groupAndSortVendorPartitions } from "@lib/util/cart-vendor"
import { StorefrontCart } from "@/lib/data/cart"

type VendorSplitSummaryProps = {
  cart: StorefrontCart
}

export default function VendorSplitSummary({ cart }: VendorSplitSummaryProps) {
  const vendorGroups = groupAndSortVendorPartitions(cart.items)

  if (!vendorGroups || vendorGroups.length === 0) return null

  return (
    <div className="space-y-4 my-6">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
        <h3 className="text-xs font-semibold text-neutral-950 uppercase tracking-wider">
          Marketplace Fulfillment Split
        </h3>
      </div>

      {vendorGroups.map((group) => (
        <div
          key={group.id}
          className="border border-neutral-200/60 rounded-xl bg-neutral-50/50 p-4"
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
            <p className="text-xs font-bold tracking-tight text-neutral-600">
              {group.name}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
              {group.items.length} {group.items.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          <div className="space-y-3">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-sm"
              >
                <div className="flex items-center gap-3">
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-9 h-9 object-cover rounded-lg border border-neutral-200/80 bg-white"
                    />
                  )}
                  <div>
                    <p className="font-medium text-neutral-900 line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-neutral-900">
                  {convertToLocale({
                    amount: item.unit_price * item.quantity,
                    currency_code: cart.currency_code,
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}