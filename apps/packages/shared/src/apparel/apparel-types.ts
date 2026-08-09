export type Gender =
  | "UNISEX"
  | "MEN"
  | "WOMEN"
  | "BOYS"
  | "GIRLS"

export type AgeGroup =
  | "ADULT"
  | "TEEN"
  | "KIDS"
  | "TODDLER"
  | "INFANT"

export type SizingGroup =
  | "MENS"
  | "WOMENS"
  | "UNISEX"
  | "BOYS"
  | "GIRLS"

export type GarmentCategory =
  | "TOP"
  | "BOTTOM"
  | "DRESS"
  | "ETHNIC"
  | "SET"
  | "OUTERWEAR"
  | "LOUNGEWEAR"
  | "ACTIVEWEAR"
  | "MATERNITY_WEAR"
  | "FABRIC"

export type GarmentSubcategory = string

export type Fit =
  | "REGULAR"
  | "SLIM"
  | "RELAXED"
  | "OVERSIZED"
  | "SKINNY"
  | "STRAIGHT"
  | "BOOTCUT"
  | "FLARED"

export type Pattern =
  | "SOLID"
  | "PRINTED"
  | "STRIPED"
  | "CHECKED"
  | "FLORAL"
  | "OTHER"

export type StyleType =
  | "CASUAL"
  | "FORMAL"
  | "SPORT"
  | "BOHO"
  | "A_LINE"
  | "STRAIGHT"

export type Occasion =
  | "CASUAL"
  | "FORMAL"
  | "ETHNIC"
  | "PARTY"
  | "OFFICE"
  | "SPORTS"
  | "LOUNGE"
  | "TRAVEL"
  | "VACATION"
  | "FESTIVE"
  | "WEDDING"

export type SleeveType =
  | "SLEEVELESS"
  | "CAP"
  | "SHORT"
  | "HALF"
  | "THREE_QUARTER"
  | "FULL"
  | "PUFF"
  | "BELL"
  | "RAGLAN"
  | "COLD_SHOULDER"

export type NeckType =
  | "ROUND_NECK"
  | "V_NECK"
  | "SQUARE_NECK"
  | "BOAT_NECK"
  | "SWEETHEART"
  | "HALTER"
  | "OFF_SHOULDER"
  | "TURTLENECK"
  | "MANDARIN"
  | "MANDARIN_COLLAR"
  | "POLO"
  | "COLLAR"

export type MaterialType =
  | "COTTON"
  | "POLYESTER"
  | "LINEN"
  | "WOOL"
  | "DENIM"
  | "SILK"
  | "NATURAL"
  | "SYNTHETIC"
  | "BLENDED"

export type Season =
  | "ALL_SEASON"
  | "SUMMER"
  | "WINTER"
  | "SPRING"
  | "AUTUMN"

export type Condition =
  | "NEW"
  | "REFURBISHED"
  | "USED"

export interface ApparelDetails {
  gender: Gender
  age_group: AgeGroup
  sizing_group: SizingGroup

  garment_category: GarmentCategory
  garment_subcategory: GarmentSubcategory

  fit: Fit
  pattern: Pattern
  style_type: StyleType
  occasion: Occasion

  sleeve_type?: SleeveType
  neck_type?: NeckType

  material_type?: MaterialType
  material_composition?: string

  care_instructions?: string

  season?: Season
  condition?: Condition
}