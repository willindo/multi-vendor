// /src/api/vendors/route.ts
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import createVendorWorkflow from "@/workflows/marketplace/create-vendor"

const Schema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  handle: z.string().optional(),
  logo: z.string().optional(),
  admin: z.object({
    email: z.string().email("Valid email is required"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  }),
})

export const POST = async (
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse
) => {
  console.log("📝 CREATE VENDOR - AUTH_CONTEXT:", req.auth_context)

  const authIdentityId = req.auth_context?.auth_identity_id
  const actorId = req.auth_context?.actor_id

  // 1. Validate authentication
  if (!authIdentityId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing auth identity"
    )
  }

  // 2. Check if user is already a vendor (check database, not just token)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Try to find existing vendor_admin record for this user
    // Note: The actor_id might not exist yet if user isn't a vendor
    // So we need to query by something else (like email or auth identity)

    // For now, let's check if this auth identity is already linked to a vendor
    const { data: existingVendorAdmins } = await query.graph({
      entity: "vendor_admin",
      fields: ["id", "vendor.id"],
      filters: {
        // You might need to filter by auth_identity_id or user_id
        // This depends on your data model
      },
    })

    // If actor_id exists, user is already a vendor
    if (actorId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "You are already registered as a vendor."
      )
    }

    // 3. Create the vendor
    const { result } = await createVendorWorkflow(req.scope).run({
      input: {
        ...req.validatedBody,
        authIdentityId,
      },
    })

    // 4. Return the created vendor
    res.status(201).json({
      vendor: result.vendor,
      message: "Vendor created successfully"
    })
  } catch (error: any) {
    console.error("[API CREATE VENDOR ERROR]", error)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      error.message || "Failed to create vendor"
    )
  }
}