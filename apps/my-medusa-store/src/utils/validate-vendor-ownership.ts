// src/utils/validate-vendor-ownership.ts
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorContext } from "./resolve-vendor-context"

export interface OwnershipResult {
  vendorId: string
  resourceId: string
  vendorAdminId: string
}

export async function validateVendorProductOwnership(
  scope: any,
  actorId: string,
  productId: string
): Promise<OwnershipResult> {
  const { vendorId, vendorAdminId } = await resolveVendorContext(scope, actorId)

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "vendor_product", // ✅ Your link table: marketplace_vendor_product_product
    fields: ["vendor_id", "product_id"],
    filters: {
      vendor_id: [vendorId],
      product_id: [productId],
    },
  })

  if (!data.length) {
    throw new Error("Unauthorized: you do not own this product.")
  }

  return { vendorId, resourceId: productId, vendorAdminId }
}

// ✅ For single order operations (GET /orders/:id, PATCH, DELETE)
export async function validateVendorOrderOwnership(
  scope: any,
  actorId: string,
  orderId: string
): Promise<OwnershipResult> {
  const { vendorId, vendorAdminId } = await resolveVendorContext(scope, actorId)

  const pgConnection = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const link = await pgConnection("marketplace_vendor_order_order")
    .where({
      vendor_id: vendorId,
      order_id: orderId,
    })
    .whereNull("deleted_at")
    .first()

  if (!link) {
    throw new Error("Unauthorized: this order does not belong to your vendor.")
  }

  return { vendorId, resourceId: orderId, vendorAdminId }
}

// ✅ For listing all vendor orders (GET /orders)
export async function validateVendorOrderListAccess(
  scope: any,
  actorId: string
): Promise<Pick<OwnershipResult, 'vendorId' | 'vendorAdminId'>> {
  const { vendorId, vendorAdminId } = await resolveVendorContext(scope, actorId)
  return { vendorId, vendorAdminId }
}