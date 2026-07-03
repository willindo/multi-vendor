import { model } from "@medusajs/framework/utils"

export const ApparelDetail = model.define("apparel_detail", {
  id: model.id().primaryKey(),
  product_id: model.text().unique(),
  //  * Demographics
  gender: model.text().nullable(),
  age_group: model.text().nullable(),
  sizing_group: model.text().nullable(),
  //  * Taxonomy
  garment_category: model.text().nullable(),
  garment_subcategory: model.text().nullable(),
  //  * Design
  fit: model.text().nullable(),
  pattern: model.text().nullable(),
  style_type: model.text().nullable(),
  occasion: model.text().nullable(),
  sleeve_type: model.text().nullable(),
  neck_type: model.text().nullable(),
  //  * Material
  material_type: model.text().nullable(),
  material_composition: model.text().nullable(),
  care_instructions: model.text().nullable(),
  //  * Context
  season: model.text().nullable(),
  condition: model.text().nullable(),
})
export default ApparelDetail