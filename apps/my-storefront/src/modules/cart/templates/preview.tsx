"use client"

import repeat from "@lib/util/repeat"
import { Table, clx } from "@medusajs/ui"
import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import type { StorefrontLineItem, StorefrontCart } from "@lib/data/cart"
import { groupAndSortVendorPartitions } from "@lib/util/cart-vendor"

type ItemsTemplateProps = {
  cart: StorefrontCart
}

const ItemsPreviewTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items as StorefrontLineItem[] | undefined
  const hasOverflow = Boolean(items && items.length > 4)

  // Cluster and sort items chronologically grouped by vendor
  const vendorGroups = groupAndSortVendorPartitions(items)
  const sortedItems = vendorGroups.flatMap((group) => group.items)

  return (
    <div
      className={clx({
        "pl-[1px] overflow-y-scroll overflow-x-hidden no-scrollbar max-h-[420px]":
          hasOverflow,
      })}
    >
      <Table>
        <Table.Body data-testid="items-table">
          {items && items.length > 0 ? (
            sortedItems.map((item) => (
              <Item
                key={item.id}
                item={item}
                type="preview"
                currencyCode={cart.currency_code}
              />
            ))
          ) : !items ? (
            // Skeleton state while items are fetching
            repeat(5).map((i) => <SkeletonLineItem key={i} />)
          ) : (
            // Empty cart state
            <Table.Row>
              <Table.Cell className="text-center py-6 text-neutral-500 text-xs italic">
                Your cart is empty.
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </div>
  )
}

export default ItemsPreviewTemplate