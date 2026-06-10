import { Heading, Table } from "@medusajs/ui"
import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import type { StorefrontLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"

type ItemsTemplateProps = {
  items?: StorefrontLineItem[]
  region?: HttpTypes.StoreRegion
}

export default function ItemsTemplate({ items, region }: ItemsTemplateProps) {
  // Safely evaluate and cluster items into vendor sub-dictionaries
  const vendorGroups = items?.reduce((acc, item) => {
    const vendorId = item.metadata?.vendor_id || "platform"
    const vendorName = item.metadata?.vendor_name || 
      (vendorId === "platform" ? "Direct Platform Store" : `Partner Artisan (${vendorId.slice(0, 8)})`)

    if (!acc[vendorId]) {
      acc[vendorId] = { name: vendorName, items: [] }
    }
    acc[vendorId].items.push(item)
    return acc
  }, {} as Record<string, { name: string; items: StorefrontLineItem[] }>) || {}

  return (
    <div>
      <div className="pb-3 flex items-center border-b border-neutral-200">
        <Heading level="h2" className="text-xl-semi font-semibold tracking-tight text-neutral-900">
          Shopping Cart
        </Heading>
      </div>

      <div className="mt-6 space-y-8">
        {!items || !region ? (
          <Table>
            <Table.Body>
              {Array.from(Array(5).keys()).map((i) => (
                <SkeletonLineItem key={i} />
              ))}
            </Table.Body>
          </Table>
        ) : Object.keys(vendorGroups).length === 0 ? (
          <p className="text-neutral-500 text-sm">No items added to basket.</p>
        ) : (
          Object.entries(vendorGroups).map(([vendorId, group]) => (
            <div 
              key={vendorId} 
              className="border border-neutral-200/80 rounded-2xl bg-white p-6 shadow-xs"
            >
              {/* Corrected Tag Structure Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                <div className="flex items-center gap-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Shipment Parcel:{" "}
                    <strong className="text-neutral-900 font-extrabold">{group.name}</strong>
                  </span>
                </div>
                <span className="text-[10px] bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded font-mono font-bold text-neutral-600">
                  ID: {vendorId.slice(0, 8)}
                </span>
              </div>

              {/* Items Layout Grid Mapping */}
              <Table>
                <Table.Header className="border-b-0 text-neutral-400 text-xs uppercase tracking-wider">
                  <Table.Row className="text-left border-b-0">
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-center">Quantity</th>
                    <th className="pb-2 hidden sm:table-cell text-right">Price</th>
                    <th className="pb-2 text-right">Total</th>
                  </Table.Row>
                </Table.Header>
                <Table.Body className="divide-y divide-neutral-100">
                  {group.items
                    .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
                    .map((item) => (
                      <Item 
                        key={item.id} 
                        item={item} 
                        currencyCode={region.currency_code} 
                      />
                    ))}
                </Table.Body>
              </Table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}