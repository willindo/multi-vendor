// src/modules/order/templates/order-completed-template.tsx
import React from "react"
import { HttpTypes } from "@medusajs/types"
import Help from "@modules/order/components/help"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default function OrderCompletedTemplate({ order }: OrderCompletedTemplateProps) {
  // Cluster items by vendor using line item metadata flags
  const vendorGroups = order.items?.reduce((acc, item) => {
    const vendorId = (item.metadata as any)?.vendor_id || "platform"
    const vendorName = (item.metadata as any)?.vendor_name || "Platform Direct Store"

    if (!acc[vendorId]) {
      acc[vendorId] = { name: vendorName, items: [] }
    }
    acc[vendorId].items.push(item)
    return acc
  }, {} as Record<string, { name: string; items: any[] }>)

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: order.currency_code?.toUpperCase() || "INR",
    }).format(amount / 100)
  }

  return (
    <div className="py-6 min-h-[calc(100vh-64px)] bg-neutral-50/40">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full mt-8">
        
        {/* Success Header Banner */}
        <div className="flex flex-col gap-2 text-center max-w-md">
          <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full w-fit mx-auto border border-emerald-200">
            Order Processed Successfully
          </span>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight mt-2">
            Thank you for your purchase!
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Your tracking configuration hash reference is:{" "}
            <span className="font-mono text-neutral-900 font-bold bg-neutral-100 px-1.5 py-0.5 rounded">
              {order.id.slice(0, 12)}...
            </span>
          </p>
        </div>

        {/* Core Layout Structure Split */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          
          {/* Main Shipment Packages Breakdowns */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Fulfillment Packages Allocation
            </h2>

            {vendorGroups && Object.entries(vendorGroups).map(([vendorId, group]) => (
              <div key={vendorId} className="bg-white border border-neutral-200/70 rounded-2xl p-5 shadow-xs">
                
                {/* Package Title Banner */}
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                  <p className="text-xs font-bold text-neutral-800 uppercase tracking-tight">
                    Package Dispatched via: <span className="text-neutral-950 underline">{group.name}</span>
                  </p>
                </div>

                {/* Allocated Items List */}
                <div className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-x-4 text-sm">
                      <div className="w-12 h-12 bg-neutral-50 border border-neutral-200/60 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">{item.title}</p>
                        <p className="text-xs text-neutral-400 font-medium mt-0.5">
                          Quantity: {item.quantity} · Status:{" "}
                          <span className="text-neutral-700 font-bold capitalize">
                            {(item.metadata as any)?.fulfillment_status || "pending"}
                          </span>
                        </p>
                      </div>
                      <p className="font-bold font-mono text-neutral-900">
                        {formatAmount(item.unit_price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <ShippingDetails order={order} />
          </div>

          {/* Master Summary Billing Sidebar */}
          <div className="space-y-6">
            <OrderSummary order={order} />
            <Help />
          </div>

        </div>
      </div>
    </div>
  )
}