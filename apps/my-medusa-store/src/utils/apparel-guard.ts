// src/utils/apparel-guard.ts
import type { ApparelDetails } from "@shared/index";

const FORBIDDEN_WORDS = [
  "undergarment",
  "underwear",
  "bra",
  "panties",
  "boxers",
  "belt",
  "shoe",
  "sneaker",
  "bag",
  "backpack",
  "cap",
  "hat",
  "wallet",
];

const VALID_GARMENT_CATEGORIES = [
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
];

const VALID_GARMENT_SUBCATEGORIES = {
  TOP: ["TSHIRT", "SHIRT", "BLOUSE", "TUNIC", "KURTA", "KURTI"],
  BOTTOM: ["TROUSERS", "JEANS", "LEGGINGS", "SHORTS", "SKIRT"],
  DRESS: [
    "MAXI_DRESS",
    "MIDI_DRESS",
    "MINI_DRESS",
    "GOWN",
    "JUMPSUIT",
    "ROMPER",
  ],
  ETHNIC: [
    "SAREE",
    "SALWAR_SUIT",
    "LEHENGA",
    "SHERWANI",
    "DHOTI",
    "ABAYA",
    "KAFTAN",
  ],
  SET: ["CO_ORD_SET", "TWO_PIECE_SET", "THREE_PIECE_SET"],
  OUTERWEAR: [
    "JACKET",
    "COAT",
    "BLAZER",
    "CARDIGAN",
    "HOODIE",
    "SWEATSHIRT",
    "PONCHO",
  ],
  LOUNGEWEAR: ["PYJAMA_SET", "ROBE", "NIGHTWEAR"],
  ACTIVEWEAR: ["TRACKSUIT", "YOGA_WEAR", "SPORTS_TOP", "SPORTS_BOTTOM"],
  MATERNITY_WEAR: ["MATERNITY_DRESS", "MATERNITY_TOP"],
  FABRIC: ["FABRIC_ROLL", "UNSTITCHED_FABRIC", "DRESS_MATERIAL"],
};

export const VALID_OCCASIONS = [
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
] as const;

export const VALID_FITS = [
  "REGULAR",
  "SLIM",
  "RELAXED",
  "OVERSIZED",
  "SKINNY",
  "STRAIGHT",
  "BOOTCUT",
  "FLARED",
] as const;

export const VALID_SLEEVE_TYPES = [
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
] as const;

export const VALID_NECK_TYPES = [
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
] as const;

export const VALID_CLOSURE_TYPES = [
  "PULL_ON",
  "BUTTON",
  "ZIPPER",
  "HOOK",
  "DRAWSTRING",
  "ELASTIC",
  "TIE_UP",
] as const;

export function validateAndCleanApparelInput(body: any):ApparelDetails {
  const { title, description, apparel_detail } = body;

  if (!apparel_detail) {
    throw new Error(
      "Apparel DNA configurations ('apparel_detail') are required for this marketplace.",
    );
  }

  // 1. Structural Validation Against Forbidden Items
  const searchableText = `${title || ""} ${description || ""}`.toLowerCase();
  const foundViolation = FORBIDDEN_WORDS.find((word) =>
    searchableText.includes(word),
  );

  if (foundViolation) {
    throw new Error(
      `Marketplace Scope Exclusion: Items matching descriptions for '${foundViolation}' are prohibited.`,
    );
  }

  // 2. Uniform Normalization
  const category = (apparel_detail.garment_category || "").toUpperCase();
  const subcategory = (apparel_detail.garment_subcategory || "").toUpperCase();

  if (!VALID_GARMENT_CATEGORIES.includes(category)) {
    throw new Error(
      `Validation Error: '${category}' is not an authorized clothing category.`,
    );
  }

  const validSublist =
    VALID_GARMENT_SUBCATEGORIES[
      category as keyof typeof VALID_GARMENT_SUBCATEGORIES
    ] || [];
  if (!validSublist.includes(subcategory)) {
    throw new Error(
      `Validation Error: '${subcategory}' is not an authorized subcategory under ${category}.`,
    );
  }

  // 3. Return a clean object matching your exact database columns
  return {
    garment_category: category,
    garment_subcategory: subcategory,
    style_type: (apparel_detail.style_type || "CASUAL").toUpperCase(),
    gender: (apparel_detail.gender || "UNISEX").toUpperCase(),
    fit: (apparel_detail.fit || "REGULAR").toUpperCase(),
    occasion: (apparel_detail.occasion || "CASUAL").toUpperCase(),
    season: (apparel_detail.season || "ALL_SEASON").toUpperCase(),
    material_type: (apparel_detail.material_type || "NATURAL").toUpperCase(),
    material_composition: apparel_detail.material_composition || "100% Cotton",
    condition: (apparel_detail.condition ?? "NEW").toUpperCase(),
    pattern: apparel_detail.pattern || "SOLID",
    care_instructions: apparel_detail.care_instructions || "Machine wash cold",
    age_group: apparel_detail.age_group || null,
    sizing_group: apparel_detail.sizing_group || null,
  };
}
