// src/modules/order/templates/order-details-template.tsx
import React from "react"
import { HttpTypes } from "@medusajs/types"
import Help from "@modules/order/components/help"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default function OrderDetailsTemplate({ order }: OrderDetailsTemplateProps) {
  // Group item metrics by vendor identity configuration
  const vendorGroups = order.items?.reduce((acc, item) => {
    const vendorId = (item.metadata as any)?.vendor_id || "platform"
    const vendorName = (item.metadata as any)?.vendor_name || "Platform Direct Store"

    if (!acc[vendorId]) {
      acc[vendorId] = { name: vendorName, items: [] }
    }
    acc[vendorId].items.push(item)
    return acc
  }, {} as Record<string, { name: string; items: any[] }>)

  return (
    <div className="py-8 bg-neutral-50/30 min-h-screen">
      <div className="content-container max-w-5xl mx-auto space-y-6">
        
        {/* Dynamic Navigation & Global State Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">
              Fulfillment Tracking Node
            </h1>
            <p className="text-xs text-neutral-400 mt-1 font-mono">ID: {order.id}</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-neutral-900 text-white shadow-xs">
              Status: {order.status}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Fulfillment: {order.fulfillment_status}
            </span>
          </div>
        </div>

        {/* Master Details Layout Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest">
              Artisan Shipment Breakdown
            </h3>

            {vendorGroups && Object.entries(vendorGroups).map(([vendorId, group]) => (
              <div key={vendorId} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
                
                {/* Header Context Banner */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <p className="text-xs font-bold text-neutral-700">
                    Merchant Allocation: <span className="text-neutral-900 font-black">{group.name}</span>
                  </p>
                  <span className="text-[10px] font-mono bg-neutral-50 border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded-md">
                    Vendor Node: {vendorId.slice(0, 8)}
                  </span>
                </div>

                {/* Sub items matching this individual specific partition collection */}
                <div className="divide-y divide-neutral-50">
                  {group.items.map((item) => {
                    const isShipped = (item.metadata as any)?.fulfillment_status === "shipped"
                    return (
                      <div key={item.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <img src={item.thumbnail} alt={item.title} className="w-10 h-10 object-cover rounded-lg border border-neutral-100 bg-neutral-50" />
                          <div>
                            <p className="text-xs font-semibold text-neutral-900">{item.title}</p>
                            <p className="text-[11px] text-neutral-400 mt-0.5">Quantity: {item.quantity}</p>
                          </div>
                        </div>
                        
                        {/* Render inline delivery pills based on vendor controls output */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isShipped 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {isShipped ? "Shipped" : "Processing Allocation"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <ShippingDetails order={order} />
          </div>

          {/* Billing Sidebar Summaries */}
          <div className="space-y-6">
            <OrderSummary order={order} />
            <Help />
          </div>
        </div>

      </div>
    </div>
  )
}