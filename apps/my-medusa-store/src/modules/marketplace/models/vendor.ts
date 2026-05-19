import { model } from "@medusajs/framework/utils"
import VendorAdmin from "./vendor-admin"

const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),

  name: model.text(),
  handle: model.text().unique(),
  logo: model.text().nullable(),

  is_active: model.boolean().default(true),
  metadata: model.json().nullable(),

  // ✅ REQUIRED
  admins: model.hasMany(() => VendorAdmin, {
    mappedBy: "vendor",
  }),
})

export default Vendor