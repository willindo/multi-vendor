// src/app/vendor/dashboard/orders/page.tsx
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

interface OrderItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  vendor_id: string
}

interface VendorOrder {
  id: string
  display_id: number
  created_at: string
  total_vendor_amount: number
  fulfillment_status:
    | "not_fulfilled"
    | "partially_fulfilled"
    | "fulfilled"
    | "shipped"
  payment_routing_status: "pending" | "routed" | "failed"
  items: OrderItem[]
}

async function getVendorOrders(token: string): Promise<VendorOrder[]> {
  const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  try {
    const res = await fetch(`${BACKEND_URL}/vendor/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) return []
    const data = await res.json()
    return data.orders || []
  } catch (error) {
    console.error("Failed fetching vendor fulfillment data:", error)
    return []
  }
}

export default async function VendorOrdersPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("medusa_vendor_jwt")?.value

  if (!token) {
    redirect("/vendor/login")
  }

  const orders = await getVendorOrders(token)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount / 100)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 p-5 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Assigned Shipments</p>
          <p className="text-3xl font-bold text-neutral-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white border border-neutral-200 p-5 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Gateway Pipeline</p>
          <p className="text-3xl font-bold text-neutral-900 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" /> Active
          </p>
        </div>
        <div className="bg-white border border-neutral-200 p-5 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Operational Mode</p>
          <p className="text-3xl font-bold text-neutral-900 mt-1">Multi-Vendor</p>
        </div>
      </div>

      {/* Main Operations Terminal Panel */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/50">
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Fulfillment & Operations</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your specific inventory allocations and view split automated transfers.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-neutral-400 text-sm font-medium">
              No active orders found requiring allocation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Items Allocated</th>
                  <th className="p-4">Your Share</th>
                  <th className="p-4">Shipping Status</th>
                  <th className="p-4">Payout Split</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/40 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold text-neutral-900">
                      #{order.display_id}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        {order.items.map((item) => (
                          <div key={item.id} className="inline-flex items-center gap-1.5 text-xs text-neutral-700 bg-neutral-50 border border-neutral-200/60 px-2 py-1 rounded-md w-fit">
                            <span className="font-bold text-neutral-900">{item.quantity}×</span>
                            <span>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-neutral-950">
                      {formatCurrency(order.total_vendor_amount)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        order.fulfillment_status === "shipped" || order.fulfillment_status === "fulfilled"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {order.fulfillment_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        order.payment_routing_status === "routed"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200"
                      }`}>
                        {order.payment_routing_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="inline-flex items-center justify-center px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition-all shadow-sm">
                        Manage Shipment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}