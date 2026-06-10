"use client"

import repeat from "@lib/util/repeat"
import { Table, clx } from "@medusajs/ui"
import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import type { StorefrontLineItem, StorefrontCart } from "@lib/data/cart"

type ItemsTemplateProps = {
  cart: StorefrontCart
}

const ItemsPreviewTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart.items as StorefrontLineItem[]
  const hasOverflow = items && items.length > 4

  // Group checkout preview items by vendor for structural consistency
  const sortedItems = items
    ? [...items].sort((a, b) => {
        const vendorA = a.metadata?.vendor_id || ""
        const vendorB = b.metadata?.vendor_id || ""
        if (vendorA !== vendorB) return vendorA.localeCompare(vendorB)
        return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
      })
    : []

  return (
    <div
      className={clx({
        "pl-[1px] overflow-y-scroll overflow-x-hidden no-scrollbar max-h-[420px]":
          hasOverflow,
      })}
    >
      <Table>
        <Table.Body data-testid="items-table">
          {items
            ? sortedItems.map((item) => (
                <Item
                  key={item.id}
                  item={item}
                  type="preview"
                  currencyCode={cart.currency_code}
                />
              ))
            : repeat(5).map((i) => (
                <SkeletonLineItem key={i} />
              ))}
        </Table.Body>
      </Table>
    </div>
  )
}

export default ItemsPreviewTemplate