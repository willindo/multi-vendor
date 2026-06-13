import type { ApparelDetailDTO } from "./apparel-types"

export const APPAREL_DEFAULTS: Required<ApparelDetailDTO> = {
  gender: "UNISEX",

  age_group: "ADULT",

  sizing_group: "UNISEX",

  garment_category: "TOP",

  garment_subcategory: "",

  fit: "REGULAR",

  pattern: "SOLID",

  style_type: "CASUAL",

  occasion: "CASUAL",

  sleeve_type: "",

  neck_type: "",

  material_type: "COTTON",

  material_composition: "",

  care_instructions: "",

  season: "ALL_SEASON",

  condition: "NEW",
}