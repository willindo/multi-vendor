// src/modules/checkout/templates/checkout-summary/index.tsx
import React from "react"
import { Heading } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import CartTotals from "@modules/common/components/cart-totals"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import VendorSplitSummary from "@modules/checkout/components/vendor-split-summary"

type CheckoutSummaryProps = {
  // cart: HttpTypes.StoreCart
cart: any
}

export default function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  if (!cart) return null

  return (
    <div className="sticky top-0 flex flex-col-reverse small:flex-col gap-y-8 py-8 small:py-0">
      <div className="w-full bg-white flex flex-col gap-y-6 border border-neutral-200/70 p-6 rounded-2xl shadow-xs">
        <Heading level="h2" className="text-xl-semi font-black text-neutral-900 tracking-tight">
          In Your Cart
        </Heading>
        
        <hr className="border-neutral-100" />
        
        <CartTotals totals={cart} />

        <VendorSplitSummary cart={cart} />
      </div>

      <div className="w-full bg-white flex flex-col gap-y-6 border border-neutral-200/70 p-6 rounded-2xl shadow-xs">
        <ItemsPreviewTemplate cart={cart} />
      </div>
    </div>
  )
}