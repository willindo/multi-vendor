import { defineLink } from "@medusajs/framework/utils"
import MarketplaceModule from "../modules/marketplace"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  ProductModule.linkable.product,
  MarketplaceModule.linkable.apparelDetail
)