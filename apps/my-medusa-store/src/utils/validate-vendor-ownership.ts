// ==== ./src/utils/validate-vendor-ownership.ts ====
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaError } from "@medusajs/framework/utils"

type Scope = {
  resolve: (key: string | symbol) => any
}

export const validateVendorProductOwnership = async (
  scope: Scope,
  actor_id: string,
  product_id: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  // Fetch ownership layout information using your core junction entity definitions
  const { data: vendorAdmins } = await query.graph({
    entity: "vendor_admin",
    fields: ["vendor.id"],
    filters: { id: [actor_id] },
  })

  const vendorId = vendorAdmins[0]?.vendor?.id

  if (!vendorId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Vendor profile not found for active user."
    )
  }

  // Cross-reference your exact custom link engine layout table mapping target products to vendors
  const { data: productLinks } = await query.graph({
    entity: "marketplace_vendor_product_product",
    fields: ["vendor_id", "product_id"],
    filters: {
      vendor_id: [vendorId],
      product_id: [product_id],
    },
  })

  if (!productLinks || productLinks.length === 0) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Access Denied: This target entity does not belong to your vendor organization account."
    )
  }
}