"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { extractInventoryQuantity } from "@/lib/util/vendor/hydration"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  // Auto-select single variant or sync initial variant from URL parameter
  useEffect(() => {
    const initialVariantId = searchParams.get("v_id")

    if (initialVariantId && product.variants?.length) {
      const match = product.variants.find((v) => v.id === initialVariantId)
      if (match) {
        setOptions(optionsAsKeymap(match.options) ?? {})
        return
      }
    }

    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants, searchParams])

  // Resolve matching variant based on current options state
  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return undefined

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // Pre-calculate lowest-priced fallback variant for display before user selection
  const cheapestVariant = useMemo(() => {
    if (!product.variants?.length) return undefined
    return [...product.variants].sort((a, b) => {
      const priceA = a.calculated_price?.calculated_amount ?? Infinity
      const priceB = b.calculated_price?.calculated_amount ?? Infinity
      return priceA - priceB
    })[0]
  }, [product.variants])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // Sync state to URL seamlessly without blocking render thread
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const targetValue = isValidVariant && selectedVariant ? selectedVariant.id : null
    const currentValue = params.get("v_id")

    if (currentValue === targetValue) return

    if (targetValue) {
      params.set("v_id", targetValue)
    } else {
      params.delete("v_id")
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }, [selectedVariant, isValidVariant, pathname, router, searchParams])

  // Precise inventory resolution using extracted utility
  const { inStock, inventoryQuantity } = useMemo(() => {
    if (!selectedVariant) return { inStock: false, inventoryQuantity: 0 }

    if (selectedVariant.manage_inventory === false || selectedVariant.allow_backorder) {
      return { inStock: true, inventoryQuantity: Infinity }
    }

    const qty = extractInventoryQuantity(selectedVariant)
    return { inStock: qty > 0, inventoryQuantity: qty }
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return

    setIsAdding(true)
    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      })
    } finally {
      setIsAdding(false)
    }
  }

  const displayVariant = selectedVariant || cheapestVariant

  return (
    <>
      <div className="flex flex-col gap-y-4" ref={actionsRef}>
        {(product.variants?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-y-4">
            {(product.options || []).map((option) => (
              <div key={option.id}>
                <OptionSelect
                  option={option}
                  current={options[option.id]}
                  updateOption={setOptionValue}
                  title={option.title ?? ""}
                  data-testid="product-options"
                  disabled={!!disabled || isAdding}
                />
              </div>
            ))}
            <Divider />
          </div>
        )}

        {/* Dynamic price resolution falling back to lowest price */}
        <ProductPrice product={product} variant={displayVariant} />

        {/* Stock status indicator */}
        {selectedVariant && (
          <div className="text-sm font-medium">
            {inStock ? (
              <span className="text-emerald-600">
                In Stock{" "}
                {inventoryQuantity !== Infinity && `(${inventoryQuantity} available)`}
              </span>
            ) : (
              <span className="text-rose-600">Out of Stock</span>
            )}
          </div>
        )}

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="primary"
          className="w-full h-10"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {!selectedVariant
            ? "Select options"
            : !inStock
              ? "Out of stock"
              : "Add to cart"}
        </Button>

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}