import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {Modules } from "@medusajs/framework/utils";

import { validateVendorProductOwnership } from "../../../../utils/validate-vendor-ownership"

type UpdateBody = {
  title?: string
}
export const PATCH = async (
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse
) => {
  const product_id = req.params.id
  const actor_id = req.auth_context.actor_id

  // 🛡️ Verify vendor ownership link before editing properties
  await validateVendorProductOwnership(
    req.scope,
    actor_id,
    product_id
  )

  const productService = req.scope.resolve(Modules.PRODUCT) 

  // Capture all core fields passed from the storefront dashboard form payload
  const updateData: any = {}
  
  if (req.body.title !== undefined) updateData.title = req.body.title
  if (req.body.handle !== undefined) updateData.handle = req.body.handle
  if (req.body.description !== undefined) updateData.description = req.body.description
  if (req.body.subtitle !== undefined) updateData.subtitle = req.body.subtitle
  if (req.body.status !== undefined) updateData.status = req.body.status
  if (req.body.variants !== undefined) updateData.variants = req.body.variants

  // Execute update on the internal Medusa core product engine
  const updated = await productService.updateProducts(product_id, updateData)

  res.json({ product: updated })
}
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const product_id = req.params.id
  const actor_id = req.auth_context.actor_id

  await validateVendorProductOwnership(
    req.scope,
    actor_id,
    product_id
  )

  const productService = req.scope.resolve(Modules.PRODUCT) 

  await productService.deleteProducts([product_id])

  res.json({ deleted: true })
}