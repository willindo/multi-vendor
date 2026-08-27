"use client"

import { Radio, RadioGroup } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, clx, Heading, Text } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import MedusaRadio from "@modules/common/components/radio"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type StoreCartShippingOptionWithZone = HttpTypes.StoreCartShippingOption & {
  service_zone?: {
    id: string
    name: string
    fulfillment_set?: {
      id: string
      name: string
      type: string
      location?: {
        id: string
        name: string
        address?: HttpTypes.StoreCartAddress | null
      }
    }
  }
}

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

function formatAddress(address?: HttpTypes.StoreCartAddress | null) {
  if (!address) return ""
  return [
    address.address_1,
    address.address_2,
    address.postal_code && address.city ? `${address.postal_code} ${address.city}` : "",
    address.country_code?.toUpperCase(),
  ]
    .filter(Boolean)
    .join(", ")
}

const Shipping: React.FC<ShippingProps> = ({ cart, availableShippingMethods }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)
  const [showPickupOptions, setShowPickupOptions] = useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const selectedOptionId = cart.shipping_methods?.at(-1)?.shipping_option_id || null
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(selectedOptionId)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const isOpen = searchParams.get("step") === "delivery"

  const typedMethods = (availableShippingMethods || []) as StoreCartShippingOptionWithZone[]
  const _shippingMethods = typedMethods.filter((sm) => sm.service_zone?.fulfillment_set?.type !== "pickup")
  const _pickupMethods = typedMethods.filter((sm) => sm.service_zone?.fulfillment_set?.type === "pickup")
  const hasPickupOptions = !!_pickupMethods?.length

  // Sync state when props or selected cart methods update
  useEffect(() => {
    setShippingMethodId(selectedOptionId)
  }, [selectedOptionId])

  // Fetch prices for dynamic options & sync pickup view state
  useEffect(() => {
    let isMounted = true
    const calculatedOptions = _shippingMethods.filter((sm) => sm.price_type === "calculated")

    if (calculatedOptions.length) {
      setIsLoadingPrices(true)
      const promises = calculatedOptions.map((sm) =>
        calculatePriceForShippingOption(sm.id, cart.id)
      )

      Promise.allSettled(promises).then((res) => {
        if (!isMounted) return
        const pricesMap: Record<string, number> = {}
        res.forEach((r) => {
          if (r.status === "fulfilled" && r.value?.id && typeof r.value.amount === "number") {
            pricesMap[r.value.id] = r.value.amount
          }
        })
        setCalculatedPricesMap(pricesMap)
        setIsLoadingPrices(false)
      })
    } else {
      setIsLoadingPrices(false)
    }

    if (_pickupMethods.some((m) => m.id === selectedOptionId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }

    return () => {
      isMounted = false
    }
  }, [availableShippingMethods, cart.id])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (id: string, variant: "shipping" | "pickup") => {
    const selectedOption = typedMethods.find((sm) => sm.id === id)
    // Prevent posting calculated options if calculation failed or returned no price
    if (
      selectedOption?.price_type === "calculated" &&
      typeof calculatedPricesMap[id] !== "number"
    ) {
      setError("Shipping option price is unavailable for your destination.")
      return
    }
    setError(null)
    setIsLoading(true)

    setShowPickupOptions(variant === "pickup" ? PICKUP_OPTION_ON : PICKUP_OPTION_OFF)
    const previousId = shippingMethodId
    setShippingMethodId(id)

    try {
      await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
    } catch (err: any) {
      setShippingMethodId(previousId)
      setError(err.message || "Failed to set shipping method")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx("flex flex-row text-3xl-regular gap-x-2 items-baseline", {
            "opacity-50 pointer-events-none select-none":
              !isOpen && cart.shipping_methods?.length === 0,
          })}
        >
          Delivery
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && <CheckCircleSolid />}
        </Heading>
        {!isOpen && cart?.shipping_address && cart?.billing_address && cart?.email && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-delivery-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>

      {isOpen ? (
        <>
          <div className="grid">
            <div className="flex flex-col">
              <span className="font-medium txt-medium text-ui-fg-base">Shipping method</span>
              <span className="mb-4 text-ui-fg-muted txt-medium">
                How would you like your order delivered
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={(value) => {
                      const id = _pickupMethods.find((option) => !option.insufficient_inventory)?.id
                      if (id) {
                        handleSetShippingMethod(id, "pickup")
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                        {
                          "border-ui-border-interactive": showPickupOptions === PICKUP_OPTION_ON,
                        }
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <MedusaRadio checked={showPickupOptions === PICKUP_OPTION_ON} />
                        <span className="text-base-regular">Pick up your order</span>
                      </div>
                      <span className="justify-self-end text-ui-fg-base">-</span>
                    </Radio>
                  </RadioGroup>
                )}

                <RadioGroup
                  value={showPickupOptions === PICKUP_OPTION_OFF ? shippingMethodId : null}
                  onChange={(v) => v && handleSetShippingMethod(v, "shipping")}
                >
                  {_shippingMethods.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    const isSelected = option.id === shippingMethodId && showPickupOptions === PICKUP_OPTION_OFF

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                          {
                            "border-ui-border-interactive": isSelected,
                            "hover:shadow-none cursor-not-allowed opacity-50": isDisabled,
                          }
                        )}
                      >
                        <div className="flex items-center gap-x-4">
                          <MedusaRadio checked={isSelected} />
                          <span className="text-base-regular">{option.name}</span>
                        </div>
                        <span className="justify-self-end text-ui-fg-base">
                          {option.price_type === "flat"
                            ? convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                            : typeof calculatedPricesMap[option.id] === "number"
                              ? convertToLocale({
                                amount: calculatedPricesMap[option.id],
                                currency_code: cart?.currency_code,
                              })
                              : isLoadingPrices
                                ? <Loader className="animate-spin" />
                                : "-"}
                        </span>
                      </Radio>
                    )
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid">
              <div className="flex flex-col">
                <span className="font-medium txt-medium text-ui-fg-base">Store</span>
                <span className="mb-4 text-ui-fg-muted txt-medium">Choose a store near you</span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-8 md:pt-0 pt-2">
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(v) => v && handleSetShippingMethod(v, "pickup")}
                  >
                    {_pickupMethods.map((option) => {
                      const isSelected = option.id === shippingMethodId

                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={clx(
                            "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                            {
                              "border-ui-border-interactive": isSelected,
                              "hover:shadow-none cursor-not-allowed opacity-50":
                                option.insufficient_inventory,
                            }
                          )}
                        >
                          <div className="flex items-start gap-x-4">
                            <MedusaRadio checked={isSelected} />
                            <div className="flex flex-col">
                              <span className="text-base-regular">{option.name}</span>
                              <span className="text-base-regular text-ui-fg-muted">
                                {formatAddress(
                                  option.service_zone?.fulfillment_set?.location?.address
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="justify-self-end text-ui-fg-base">
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          <div>
            <ErrorMessage error={error} data-testid="delivery-option-error-message" />
            <Button
              size="large"
              className="mt-4"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!cart.shipping_methods?.[0]}
              data-testid="submit-delivery-option-button"
            >
              Continue to payment
            </Button>
          </div>
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">Method</Text>
                <Text className="txt-medium text-ui-fg-subtle">
                  {cart.shipping_methods!.at(-1)!.name}{" "}
                  {convertToLocale({
                    amount: cart.shipping_methods!.at(-1)!.amount!,
                    currency_code: cart?.currency_code,
                  })}
                </Text>
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping