// ==== ./src/app/vendor/dashboard/page.tsx ====
import React from "react"
import { getVendorProfile, getVendorProducts, getVendorOrders } from "@lib/data/vendor"

export const revalidate = 0 // Ensure metrics stay live on view refresh

export default async function VendorDashboardOverview() {
  const profile = await getVendorProfile()
  const products = await getVendorProducts()
  const orders = await getVendorOrders()

  // Fallback string if profile database returns incomplete naming rows
  const storeName = profile?.handle || "Your Merchant Storefront"

  // Quick statistical summaries
  const totalItems = products?.length || 0
  const totalOrders = orders?.length || 0

  return (
    <div className="flex flex-col gap-y-8">
      <div>
        <h1 className="text-xlarge-semi text-ui-fg-base">
          Welcome back, {storeName}
        </h1>
        <p className="text-base-regular text-ui-fg-subtle mt-1">
          Here is a quick look at your marketplace performance metrics for today.
        </p>
      </div>

      {/* 📊 Stat Metrics Row Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-ui-border-base p-6 rounded-lg shadow-sm">
          <span className="text-small-regular text-ui-fg-subtle uppercase tracking-wider block">
            Active Catalog Items
          </span>
          <span className="text-2xl font-semibold text-ui-fg-base mt-2 block">
            {totalItems}
          </span>
        </div>

        <div className="bg-white border border-ui-border-base p-6 rounded-lg shadow-sm">
          <span className="text-small-regular text-ui-fg-subtle uppercase tracking-wider block">
            Assigned Orders
          </span>
          <span className="text-2xl font-semibold text-ui-fg-base mt-2 block">
            {totalOrders}
          </span>
        </div>

        <div className="bg-white border border-ui-border-base p-6 rounded-lg shadow-sm">
          <span className="text-small-regular text-ui-fg-subtle uppercase tracking-wider block">
            Payout Status
          </span>
          <span className="text-large-semi text-emerald-600 mt-3 flex items-center gap-x-1.5 block">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Fully Verified
          </span>
        </div>
      </div>

      {/* 🧾 Recent Actions Card */}
      <div className="bg-white border border-ui-border-base rounded-lg shadow-sm p-6">
        <h3 className="text-base-semi text-ui-fg-base mb-2">
          System Verification Status
        </h3>
        <p className="text-small-regular text-ui-fg-subtle">
          Your merchant account is fully connected to the main orchestration engine. Use the side navigation layout panel to update your custom product inventory rows or audit order distribution cuts.
        </p>
      </div>
    </div>
  )
}