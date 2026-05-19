import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace"
import MarketplaceModuleService from "../../../../modules/marketplace/service"

type Input = {
  name: string
  handle?: string
  logo?: string
}

const createVendorStep = createStep(
  "create-vendor",
  async (input: Input, { container }) => {
    const service = container.resolve<MarketplaceModuleService>(
      MARKETPLACE_MODULE
    )

    const vendor = await service.createVendors(input)

    return new StepResponse(vendor, vendor.id)
  },
  async (vendorId, { container }) => {
    if (!vendorId) return

    const service = container.resolve<MarketplaceModuleService>(
      MARKETPLACE_MODULE
    )

    await service.deleteVendors(vendorId)
  }
)

export default createVendorStep