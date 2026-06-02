// src/app/vendor/dashboard/orders/[id]/page.tsx
"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

export default function VendorOrderDetailsPage() {
  const { id: orderId } = useParams()
  const router = useRouter()
  
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Fetch contextual order graph matrices natively on mount
  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/vendors/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data.order)
        }
      } catch (err) {
        console.error("Fulfillment details loading failure:", err)
      } finally {
        setLoading(false)
      }
    }
    if (orderId) fetchDetails()
  }, [orderId])

  // Triggers state propagation up through the backend architecture
  const handleShipItem = async (itemId: string) => {
    setProcessingId(itemId)
    try {
      const res = await fetch(`/api/vendors/orders/${orderId}/items/${itemId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })

      if (res.ok) {
        alert("Fulfillment dispatch logged successfully.")
        // Refresh local view memory state configurations instantly
        router.refresh()
        const refreshRes = await fetch(`/api/vendors/orders/${orderId}`)
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setOrder(data.order)
        }
      } else {
        const data = await res.json()
        alert(`Fulfillment rejected: ${data.message}`)
      }
    } catch (err: any) {
      alert(`Execution error occurred: ${err.message}`)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-xs font-semibold text-neutral-400 animate-pulse font-mono">Resolving allocation buffers...</div>
  }

  if (!order) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <p className="text-xs text-neutral-400 font-medium">Fulfillment tracking node not linked to this session.</p>
        <Link href="/vendor/dashboard/orders" className="text-xs text-neutral-900 underline font-bold">Return to dashboard</Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* Navigation & Header Controls */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <div className="flex items-center gap-x-2 text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
            <Link href="/vendor/dashboard/orders" className="hover:text-neutral-900 transition-colors">Shipments Ledger</Link>
            <span>/</span>
            <span className="text-neutral-900 font-mono">#{order.display_id}</span>
          </div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight mt-1">Fulfillment Node Dispatch</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Interactive Manifest Items Ledger */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Consignment Contents Ledger</h3>
            <div className="divide-y divide-neutral-100">
              {order.items?.map((item: any) => {
                const currentStatus = item.metadata?.fulfillment_status || "pending"
                const isShipped = currentStatus === "shipped"

                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-xs font-bold text-neutral-900">{item.title}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Units Allocated: <strong className="text-neutral-700">{item.quantity}</strong> · Status:{" "}
                        <span className={`font-bold capitalize ${isShipped ? "text-emerald-600" : "text-amber-600"}`}>{currentStatus}</span>
                      </p>
                    </div>

                    {/* Ship Trigger Button Action */}
                    {!isShipped ? (
                      <button
                        onClick={() => handleShipItem(item.id)}
                        disabled={processingId !== null}
                        className="px-3 py-1.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:bg-neutral-200 transition-colors shadow-xs"
                      >
                        {processingId === item.id ? "Processing..." : "Mark as Shipped"}
                      </button>
                    ) : (
                      <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                        Handed to Courier
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Delivery Destination Sidebar Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 h-fit shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Destination Address</h3>
          <div className="text-xs text-neutral-700 space-y-1 font-medium">
            <p className="font-bold text-neutral-900">{order.shipping_address?.first_name} {order.shipping_address?.last_name}</p>
            <p className="text-neutral-500">{order.shipping_address?.address_1}</p>
            <p className="text-neutral-500">{order.shipping_address?.city} - {order.shipping_address?.postal_code}</p>
          </div>
        </div>

      </div>
    </div>
  )
}