import type {
  GarmentCategory,
  GarmentSubcategory,
} from "./apparel-types"

export type ApparelVariantDimension =
  | "SIZE"
  | "COLOR"
  | "MATERIAL"

export interface VariantRule {
  recommendedDimensions: ApparelVariantDimension[]

  predefinedValues?: Partial<
    Record<ApparelVariantDimension, string[]>
  >

  customValueDimensions?: ApparelVariantDimension[]
}

const DEFAULT_RULE: VariantRule = {
  recommendedDimensions: ["SIZE", "COLOR"],

  predefinedValues: {
    SIZE: ["XS", "S", "M", "L", "XL"],
  },

  customValueDimensions: ["COLOR"],
}

const CATEGORY_RULES: Partial<
  Record<GarmentCategory, VariantRule>
> = {
  TOP: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
    ],

    predefinedValues: {
      SIZE: [
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "XXL",
      ],
    },

    customValueDimensions: [
      "COLOR",
    ],
  },

  BOTTOM: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
    ],

    predefinedValues: {
      SIZE: [
        "28",
        "30",
        "32",
        "34",
        "36",
        "38",
      ],
    },

    customValueDimensions: [
      "COLOR",
    ],
  },

  DRESS: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
    ],

    predefinedValues: {
      SIZE: [
        "XS",
        "S",
        "M",
        "L",
        "XL",
      ],
    },

    customValueDimensions: [
      "COLOR",
    ],
  },

  OUTERWEAR: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
    ],

    predefinedValues: {
      SIZE: [
        "S",
        "M",
        "L",
        "XL",
        "XXL",
      ],
    },

    customValueDimensions: [
      "COLOR",
    ],
  },

  ETHNIC: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
      "MATERIAL",
    ],

    predefinedValues: {
      SIZE: [
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "XXL",
      ],
    },

    customValueDimensions: [
      "COLOR",
      "MATERIAL",
    ],
  },
}

const SUBCATEGORY_RULES: Record<
  GarmentSubcategory,
  VariantRule
> = {
  JEANS: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
    ],

    predefinedValues: {
      SIZE: [
        "28",
        "30",
        "32",
        "34",
        "36",
        "38",
      ],
    },

    customValueDimensions: [
      "COLOR",
    ],
  },

  LEGGINGS: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
    ],

    predefinedValues: {
      SIZE: [
        "S",
        "M",
        "L",
        "XL",
      ],
    },

    customValueDimensions: [
      "COLOR",
    ],
  },

  KURTI: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
      "MATERIAL",
    ],

    predefinedValues: {
      SIZE: [
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "XXL",
      ],
    },

    customValueDimensions: [
      "COLOR",
      "MATERIAL",
    ],
  },

  HOODIE: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
    ],

    predefinedValues: {
      SIZE: [
        "S",
        "M",
        "L",
        "XL",
        "XXL",
      ],
    },

    customValueDimensions: [
      "COLOR",
    ],
  },

  PONCHO: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
      "MATERIAL",
    ],

    predefinedValues: {
      SIZE: ["FREE_SIZE"],
    },

    customValueDimensions: [
      "COLOR",
      "MATERIAL",
    ],
  },

  SAREE: {
    recommendedDimensions: [
      "SIZE",
      "COLOR",
      "MATERIAL",
    ],

    predefinedValues: {
      SIZE: ["FREE_SIZE"],
    },

    customValueDimensions: [
      "COLOR",
      "MATERIAL",
    ],
  },
}

export function getVariantRule(
  category?: GarmentCategory,
  subcategory?: GarmentSubcategory
): VariantRule {
  if (
    subcategory &&
    SUBCATEGORY_RULES[subcategory]
  ) {
    return SUBCATEGORY_RULES[subcategory]
  }

  if (
    category &&
    CATEGORY_RULES[category]
  ) {
    return CATEGORY_RULES[category]!
  }

  return DEFAULT_RULE
}

export function getRecommendedDimensions(
  category?: GarmentCategory,
  subcategory?: GarmentSubcategory
): ApparelVariantDimension[] {
  return getVariantRule(
    category,
    subcategory
  ).recommendedDimensions
}

export function getPredefinedVariantValues(
  dimension: ApparelVariantDimension,
  category?: GarmentCategory,
  subcategory?: GarmentSubcategory
): string[] {
  return (
    getVariantRule(
      category,
      subcategory
    ).predefinedValues?.[
      dimension
    ] ?? []
  )
}

export function supportsCustomValues(
  dimension: ApparelVariantDimension,
  category?: GarmentCategory,
  subcategory?: GarmentSubcategory
): boolean {
  return (
    getVariantRule(
      category,
      subcategory
    ).customValueDimensions?.includes(
      dimension
    ) ?? false
  )
}