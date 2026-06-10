"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { Button } from "@medusajs/ui"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"
import type { StorefrontCart, StorefrontLineItem } from "@lib/data/cart"

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: StorefrontCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    // cartState?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
    cartState?.items?.reduce((acc: number, item: StorefrontLineItem) => {
      return acc + (item.quantity ?? 0)
    }, 0) || 0
  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()
    const timer = setTimeout(close, 5000)
    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) clearTimeout(activeTimer)
    open()
  }

  useEffect(() => {
    return () => {
      if (activeTimer) clearTimeout(activeTimer)
    }
  }, [activeTimer])

  const pathname = usePathname()

  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
  }, [totalItems, itemRef.current])

  // Group or sort dropdown items to ensure visual clustering by vendor source
  const sortedDropdownItems = cartState?.items
    ? [...cartState.items].sort((a, b) => {
        const vA = a.metadata?.vendor_id || ""
        const vB = b.metadata?.vendor_id || ""
        if (vA !== vB) return vA.localeCompare(vB)
        return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
      })
    : []

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton className="h-full focus:outline-hidden">
          <LocalizedClientLink
            className="hover:text-ui-fg-base text-sm font-medium transition-colors duration-150"
            href="/cart"
            data-testid="nav-cart-link"
          >{`Cart (${totalItems})`}</LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+1px)] right-0 bg-white border-x border-b border-gray-200 w-[420px] text-ui-fg-base shadow-xl rounded-b-xl"
            data-testid="nav-cart-dropdown"
          >
            <div className="p-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-base font-semibold text-neutral-900">
                Shopping Bag
              </h3>
              <span className="text-xs bg-neutral-100 text-neutral-600 font-bold px-2 py-0.5 rounded-full">
                {totalItems} Items
              </span>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-auto max-h-[402px] px-4 divide-y divide-gray-100 no-scrollbar">
                  {sortedDropdownItems.map((item: StorefrontLineItem) => (
                    <div
                      className="grid grid-cols-[96px_1fr] gap-x-4 py-4 items-center"
                      key={item.id}
                      data-testid="cart-item"
                    >
                      <LocalizedClientLink
                        href={`/products/${item.product_handle}`}
                        className="w-24 border border-neutral-100 rounded-lg overflow-hidden block"
                      >
                        <Thumbnail
                          thumbnail={item.thumbnail}
                          images={item.variant?.product?.images}
                          size="square"
                        />
                      </LocalizedClientLink>
                      <div className="flex flex-col justify-between h-full flex-1 min-w-0">
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-x-2">
                            <div className="flex flex-col min-w-0 flex-1">
                              <h3 className="text-sm font-medium text-neutral-900 truncate">
                                <LocalizedClientLink
                                  href={`/products/${item.product_handle}`}
                                  data-testid="product-link"
                                >
                                  {item.title}
                                </LocalizedClientLink>
                              </h3>
                              <LineItemOptions
                                variant={item.variant}
                                data-testid="cart-item-variant"
                              />
                              <span className="text-xs text-neutral-400 mt-0.5 font-medium">
                                Qty: {item.quantity}{" "}
                                {item.metadata?.vendor_name
                                  ? `• ${item.metadata.vendor_name}`
                                  : ""}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <LineItemPrice
                                item={item}
                                style="tight"
                                currencyCode={cartState.currency_code}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-start mt-2">
                          <DeleteButton
                            id={item.id}
                            className="text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
                            data-testid="cart-item-remove-button"
                          >
                            Remove
                          </DeleteButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 flex flex-col gap-y-4 text-small-regular border-t border-gray-100 bg-neutral-50/50 rounded-b-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 font-medium text-sm">
                      Subtotal{" "}
                      <span className="text-neutral-400 font-normal text-xs">
                        (excl. taxes)
                      </span>
                    </span>
                    <span
                      className="text-base font-bold text-neutral-900"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  <LocalizedClientLink href="/cart" passHref>
                    <Button
                      className="w-full h-10 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg text-sm transition-colors duration-150"
                      size="large"
                      data-testid="go-to-cart-button"
                      onClick={close}
                    >
                      Go to cart
                    </Button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div className="flex py-16 flex-col gap-y-3 items-center justify-center">
                <div className="bg-gray-100 text-neutral-600 text-xs font-bold flex items-center justify-center w-8 h-8 rounded-full">
                  <span>0</span>
                </div>
                <span className="text-sm text-neutral-500 font-medium">
                  Your shopping bag is empty.
                </span>
                <LocalizedClientLink href="/store" className="mt-1">
                  <Button size="small" onClick={close}>
                    Explore products
                  </Button>
                </LocalizedClientLink>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
