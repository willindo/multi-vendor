import { MedusaService } from "@medusajs/framework/utils";
import Vendor from "./models/vendor";
import VendorAdmin from "./models/vendor-admin";
import ApparelDetail from "./models/apparel-detail";
import VendorSettlement from "./models/vendor-settlement";

class MarketplaceModuleService extends MedusaService({
  Vendor,
  VendorAdmin,
  ApparelDetail,
  VendorSettlement
}) { }

export default MarketplaceModuleService;
