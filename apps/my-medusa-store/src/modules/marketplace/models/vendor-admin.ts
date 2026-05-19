import { model } from "@medusajs/framework/utils"
import Vendor from "./vendor"

const VendorAdmin = model.define("vendor_admin", {
  id: model.id().primaryKey(),

  // ✅ external user system
  user_id: model.text(),

  role: model.text().default("admin"),

  // ✅ REQUIRED for graph + remote link
  vendor: model.belongsTo(() => Vendor, {
    mappedBy: "admins",
  }),
})

export default VendorAdmin