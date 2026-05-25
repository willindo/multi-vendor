import {
  AuthenticatedMedusaRequest, MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import createVendorWorkflow from "../../workflows/marketplace/create-vendor"
 
const Schema = z.object({
  name: z.string(),
  handle: z.string().optional(),
  logo: z.string().optional(),
  admin: z.object({
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  }),
})

export const POST = async (
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse
) => {
  console.log("AUTH_CONTEXT:", req.auth_context)

  const authIdentityId = req.auth_context?.auth_identity_id

  if (!authIdentityId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing auth identity"
    )
  }

  // 🚫 prevent duplicate vendor
  if (req.auth_context?.actor_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Already a vendor"
    )
  }

  const { result } = await createVendorWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      authIdentityId,
    },
  })

  res.json({ vendor: result.vendor })
}