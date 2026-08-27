// src/modules/products/components/product-price/index.tsx

import { clx } from "@medusajs/ui"
import { getProductPrice } from "@lib/util/get-product-price1"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-gray-100 animate-pulse rounded-md" />
  }

  return (
    <div className="flex flex-col text-ui-fg-base">
      <span
        className={clx("text-xl-semi", {
          "text-ui-fg-interactive": selectedPrice.price_type === "sale",
        })}
      >
        {!variant && (product.variants?.length ?? 0) > 1 && "From "}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
      </span>

      {selectedPrice.price_type === "sale" && (
        <div className="flex items-center gap-x-2 text-sm">
          <span className="text-ui-fg-subtle">Original: </span>
          <span
            className="line-through text-ui-fg-muted"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {selectedPrice.original_price}
          </span>
          <span className="text-ui-fg-interactive font-medium">
            -{selectedPrice.percentage_diff}%
          </span>
        </div>
      )}
    </div>
  )
}