import { model } from "@medusajs/framework/utils"

export const ApparelDetail = model.define("apparel_detail", {
  id: model.id().primaryKey(),
  
  // Keep this mandatory so it links cleanly to core products
  product_id: model.text().unique(),

  // Demographics & Taxonomy (Now Optional)
  gender: model.text().nullable(),               // MALE, FEMALE, UNISEX, OTHER
  age_group: model.text().nullable(),            // ADULT, TEEN, KIDS, TODDLER, INFANT
  sizing_group: model.text().nullable(),         // REGULAR, PETITE, TALL, PLUS_SIZE
  
  // Design & Specifications (Now Optional)
  product_type: model.text().nullable(),         // TOP, BOTTOM, SET, OUTERWEAR, FABRIC_ROLL
  fit: model.text().nullable(),                  // REGULAR, SLIM, OVERSIZED, RELAXED, SKINNY
  pattern: model.text().nullable(),              // SOLID, STRIPED, CHECKED, FLORAL, etc.
  style_type: model.text().nullable(),           // CASUAL, FORMAL, SPORT, STREETWEAR

  // Material & Care (Now Optional)
  material_type: model.text().nullable(),        // NATURAL, SYNTHETIC, BLEND
  material_composition: model.text().nullable(), // e.g., "100% Cotton Linen Blend"
  care_instructions: model.text().nullable(),    // e.g., "Machine wash cold"

  // Contextual metadata (Now Optional)
  season: model.text().nullable(),               // SUMMER, WINTER, SPRING, AUTUMN, ALL_SEASON
  condition: model.text().nullable(),            // NEW, LIKE_NEW, GENTLY_USED, USED, REFURBISHED
})

export default ApparelDetail