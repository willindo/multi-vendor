import { getProductByHandle, listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

type ProductActionsWrapperProps = {
  id?: string
  product?: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}
/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  product: initialProduct,
  region,
}: ProductActionsWrapperProps) {
  // Use passed product directly if present; fall back to API query if only ID is provided
  const product =
    initialProduct ||
    (id
      ? await listProducts({
        queryParams: { id: [id] } as any,
        regionId: region.id,
      }).then(({ response }) => response.products[0])
      : null)
  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} />
}
