import { Heading, Table } from "@medusajs/ui"
import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import type { StorefrontLineItem } from "@lib/data/cart"
import { groupAndSortVendorPartitions } from "@lib/util/cart-vendor"
import { HttpTypes } from "@medusajs/types"

type ItemsTemplateProps = {
  items?: StorefrontLineItem[]
  region?: HttpTypes.StoreRegion
}

export default function ItemsTemplate({ items, region }: ItemsTemplateProps) {
  // 1. Loading Skeleton State
  if (!items || !region) {
    return (
      <div className="mt-6 space-y-8">
        <Table>
          <Table.Body>
            {Array.from(Array(5).keys()).map((i) => (
              <SkeletonLineItem key={i} />
            ))}
          </Table.Body>
        </Table>
      </div>
    )
  }

  // 2. Cluster items into vendor groups
  const vendorGroups = groupAndSortVendorPartitions(items)

  // 3. Empty Basket State
  if (vendorGroups.length === 0) {
    return (
      <div className="py-8 text-center border rounded-2xl border-neutral-200">
        <p className="text-neutral-500 text-sm">No items added to basket.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="pb-3 flex items-center border-b border-neutral-200">
        <Heading level="h2" className="text-xl-semi font-semibold tracking-tight text-neutral-900">
          Shopping Cart
        </Heading>
      </div>

      <div className="mt-6 space-y-8">
        {vendorGroups.map((group) => (
          <div
            key={group.id}
            className="border border-neutral-200/80 rounded-2xl bg-white p-6 shadow-xs"
          >
            {/* Vendor Parcel Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div className="flex items-center gap-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Shipment Parcel:{" "}
                  <strong className="text-neutral-900 font-extrabold">{group.name}</strong>
                </span>
              </div>
              <span className="text-[10px] bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded font-mono font-bold text-neutral-600">
                ID: {group.id.slice(0, 8)}
              </span>
            </div>

            {/* Vendor Items Table (5 Columns matching Item cells) */}
            <Table>
              <Table.Header className="border-b-0 text-neutral-400 text-xs uppercase tracking-wider">
                <Table.Row className="text-left border-b-0">
                  <Table.HeaderCell className="pb-2 w-24"></Table.HeaderCell>
                  <Table.HeaderCell className="pb-2">Item</Table.HeaderCell>
                  <Table.HeaderCell className="pb-2 text-center">Quantity</Table.HeaderCell>
                  <Table.HeaderCell className="pb-2 hidden sm:table-cell text-right">Price</Table.HeaderCell>
                  <Table.HeaderCell className="pb-2 text-right">Total</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body className="divide-y divide-neutral-100">
                {group.items.map((item) => (
                  <Item
                    key={item.id}
                    item={item}
                    currencyCode={region.currency_code}
                  />
                ))}
              </Table.Body>
            </Table>
          </div>
        ))}
      </div>
    </div>
  )
}