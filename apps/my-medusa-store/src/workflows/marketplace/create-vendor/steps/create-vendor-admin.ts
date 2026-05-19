import { Modules, MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"

import { createUsersWorkflow } from "@medusajs/medusa/core-flows"
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace"
import MarketplaceModuleService from "../../../../modules/marketplace/service"

type Input = {
  email: string
  first_name?: string
  last_name?: string
  vendor_id: string
}

const createVendorAdminStep = createStep(
  "create-vendor-admin",
  async (input: Input, { container }) => {

    const userModule = container.resolve(Modules.USER)

    // 1️⃣ Get or create user
    const existingUsers = await userModule.listUsers({
      email: input.email,
    })

    let user

    if (existingUsers.length > 0) {
      user = existingUsers[0]
    } else {
      const { result } = await createUsersWorkflow(container).run({
        input: {
          users: [
            {
              email: input.email,
              first_name: input.first_name,
              last_name: input.last_name,
            },
          ],
        },
      })

      user = result[0]
    }

    // 2️⃣ Prevent multiple vendors per user
    const service = container.resolve<MarketplaceModuleService>(
      MARKETPLACE_MODULE
    )

    const existingAdmins = await service.listVendorAdmins({
      user_id: user.id,
    })

    if (existingAdmins.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "User already owns a vendor"
      )
    }

    // 3️⃣ Create vendor admin
    const vendorAdmin = await service.createVendorAdmins({
      vendor: input.vendor_id,
      user_id: user.id,
    })

    return new StepResponse(
      { user, vendorAdmin },
      vendorAdmin.id
    )
  }
)

export default createVendorAdminStep