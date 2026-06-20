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

export const GARMENT_CATEGORIES = [
  "TOP",
  "BOTTOM",
  "DRESS",
  "OUTERWEAR",
  "ETHNIC",
] as const

export const FITS = [
  "REGULAR",
  "SLIM",
  "RELAXED",
  "OVERSIZED",
] as const

export const PATTERNS = [
  "SOLID",
  "PRINTED",
  "STRIPED",
  "CHECKED",
  "FLORAL",
] as const

export const STYLE_TYPES = [
  "CASUAL",
  "FORMAL",
  "SPORT",
  "BOHO",
  "A_LINE",
  "STRAIGHT",
] as const

export const OCCASIONS = [
  "CASUAL",
  "FORMAL",
  "PARTY",
  "FESTIVE",
] as const

export const SLEEVE_TYPES = [
  "SHORT",
  "THREE_QUARTER",
  "FULL",
  "SLEEVELESS",
] as const

export const NECK_TYPES = [
  "ROUND_NECK",
  "V_NECK",
  "COLLAR",
  "MANDARIN_COLLAR",
  "SQUARE_NECK",
] as const

export const MATERIAL_TYPES = [
  "COTTON",
  "POLYESTER",
  "LINEN",
  "WOOL",
  "DENIM",
  "SILK",
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
export const SLEEVE_TYPE_OPTIONS = [
  { value: "SHORT", label: "Short" },
  { value: "THREE_QUARTER", label: "Three Quarter" },
  { value: "FULL", label: "Full" },
  { value: "SLEEVELESS", label: "Sleeveless" },
]

export const NECK_TYPE_OPTIONS = [
  { value: "ROUND_NECK", label: "Round Neck" },
  { value: "V_NECK", label: "V Neck" },
  { value: "COLLAR", label: "Collar" },
  { value: "MANDARIN_COLLAR", label: "Mandarin Collar" },
  { value: "SQUARE_NECK", label: "Square Neck" },
]

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

export const SIZING_GROUP_OPTIONS =
  toOptions(SIZING_GROUPS)

export const GARMENT_CATEGORY_OPTIONS =
  toOptions(GARMENT_CATEGORIES)

export const FIT_OPTIONS =
  toOptions(FITS)

export const PATTERN_OPTIONS =
  toOptions(PATTERNS)

export const STYLE_TYPE_OPTIONS =
  toOptions(STYLE_TYPES)

export const OCCASION_OPTIONS =
  toOptions(OCCASIONS)

export const MATERIAL_TYPE_OPTIONS =
  toOptions(MATERIAL_TYPES)

export const SEASON_OPTIONS =
  toOptions(SEASONS)

export const CONDITION_OPTIONS =
  toOptions(CONDITIONS)