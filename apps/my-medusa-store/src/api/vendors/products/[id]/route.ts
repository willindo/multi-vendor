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
  req: AuthenticatedMedusaRequest<UpdateBody>,
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

  const updated = await productService.updateProducts(product_id, {
    title: req.body.title,
  })

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