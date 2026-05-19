import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type Scope = {
  resolve: (key: string | symbol) => any
}

export const validateVendorProductOwnership = async (
  scope: Scope,
  actor_id: string,
  product_id: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [vendorAdmin] } = await query.graph({
    entity: "vendor_admin",
    fields: ["vendor.id", "vendor.products.id"],
    filters: {
      id: [actor_id],
    },
  })

  if (!vendorAdmin || !vendorAdmin.vendor) {
    throw new Error("Vendor not found")
  }

  const ownsProduct = vendorAdmin.vendor.products?.some(
    (p: any) => p.id === product_id
  )

  if (!ownsProduct) {
    throw new Error("Unauthorized: This product does not belong to your vendor")
  }
}