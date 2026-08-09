export const GENDERS = [
  "UNISEX",
  "MEN",
  "WOMEN",
  "BOYS",
  "GIRLS",
] as const

export const AGE_GROUPS = [
  "ADULT",
  "TEEN",
  "KIDS",
  "TODDLER",
  "INFANT",
] as const

export const SIZING_GROUPS = [
  "MENS",
  "WOMENS",
  "UNISEX",
  "BOYS",
  "GIRLS",
] as const

// Expanded to match backend guard categories
export const GARMENT_CATEGORIES = [
  "TOP",
  "BOTTOM",
  "DRESS",
  "ETHNIC",
  "SET",
  "OUTERWEAR",
  "LOUNGEWEAR",
  "ACTIVEWEAR",
  "MATERNITY_WEAR",
  "FABRIC",
] as const

// Expanded fits
export const FITS = [
  "REGULAR",
  "SLIM",
  "RELAXED",
  "OVERSIZED",
  "SKINNY",
  "STRAIGHT",
  "BOOTCUT",
  "FLARED",
] as const

export const PATTERNS = [
  "SOLID",
  "PRINTED",
  "STRIPED",
  "CHECKED",
  "FLORAL",
  "OTHER",
] as const

// Expanded style types
export const STYLE_TYPES = [
  "CASUAL",
  "FORMAL",
  "SPORT",
  "BOHO",
  "A_LINE",
  "STRAIGHT",
] as const

// Expanded occasions
export const OCCASIONS = [
  "CASUAL",
  "FORMAL",
  "ETHNIC",
  "PARTY",
  "OFFICE",
  "SPORTS",
  "LOUNGE",
  "TRAVEL",
  "VACATION",
  "FESTIVE",
  "WEDDING",
] as const

// Expanded sleeve types
export const SLEEVE_TYPES = [
  "SLEEVELESS",
  "CAP",
  "SHORT",
  "HALF",
  "THREE_QUARTER",
  "FULL",
  "PUFF",
  "BELL",
  "RAGLAN",
  "COLD_SHOULDER",
] as const

// Expanded neck types
export const NECK_TYPES = [
  "ROUND_NECK",
  "V_NECK",
  "SQUARE_NECK",
  "BOAT_NECK",
  "SWEETHEART",
  "HALTER",
  "OFF_SHOULDER",
  "TURTLENECK",
  "MANDARIN",
  "POLO",
  "COLLAR",
] as const

export const MATERIAL_TYPES = [
  "COTTON",
  "POLYESTER",
  "LINEN",
  "WOOL",
  "DENIM",
  "SILK",
  "NATURAL",
  "SYNTHETIC",
  "BLENDED",
] as const

export const SEASONS = [
  "ALL_SEASON",
  "SUMMER",
  "WINTER",
  "SPRING",
  "AUTUMN",
] as const

export const CONDITIONS = [
  "NEW",
  "REFURBISHED",
  "USED",
] as const

export type SelectOption = {
  value: string
  label: string
}

const toOptions = (
  values: readonly string[]
): SelectOption[] =>
  values.map((value) => ({
    value,
    label: value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }))

export const GENDER_OPTIONS = toOptions(GENDERS)
export const AGE_GROUP_OPTIONS = toOptions(AGE_GROUPS)
export const SIZING_GROUP_OPTIONS = toOptions(SIZING_GROUPS)
export const GARMENT_CATEGORY_OPTIONS = toOptions(GARMENT_CATEGORIES)
export const FIT_OPTIONS = toOptions(FITS)
export const PATTERN_OPTIONS = toOptions(PATTERNS)
export const STYLE_TYPE_OPTIONS = toOptions(STYLE_TYPES)
export const OCCASION_OPTIONS = toOptions(OCCASIONS)
export const MATERIAL_TYPE_OPTIONS = toOptions(MATERIAL_TYPES)
export const SEASON_OPTIONS = toOptions(SEASONS)
export const CONDITION_OPTIONS = toOptions(CONDITIONS)
export const SLEEVE_TYPE_OPTIONS = toOptions(SLEEVE_TYPES)
export const NECK_TYPE_OPTIONS = toOptions(NECK_TYPES)