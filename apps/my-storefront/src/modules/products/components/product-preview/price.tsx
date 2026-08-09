import { Text, clx } from "@medusajs/ui"
import { VariantPrice } from "../../../../types/global"

export default function PreviewPrice({
  price,
  showFrom = false,
}: {
  price: VariantPrice
  showFrom?: boolean
}) {
  if (!price) {
    return null
  }

  return (
    <div className="flex items-center gap-x-1">
      {showFrom && (
        <Text
          className="text-ui-fg-muted"
          data-testid="from-price"
        >
          From
        </Text>
      )}

      {price.price_type === "sale" && (
        <Text
          className="line-through text-ui-fg-muted"
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}

      <Text
        className={clx("text-ui-fg-muted", {
          "text-ui-fg-interactive":
            price.price_type === "sale",
        })}
        data-testid="price"
      >
        {price.calculated_price}
      </Text>
    </div>
  )
}