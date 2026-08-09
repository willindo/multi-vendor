// src/utils/apparel-guard.ts
import type { ApparelDetails } from "@shared/index";
import {
  GENDERS,
  SIZING_GROUPS,
  GARMENT_CATEGORIES,
  GARMENT_SUBCATEGORY_MAP,
  FITS,
  PATTERNS,
  STYLE_TYPES,
  OCCASIONS,
  SLEEVE_TYPES,
  NECK_TYPES,
  AGE_GROUPS,
  MATERIAL_TYPES,
  SEASONS,
  CONDITIONS,
} from "@shared/index";

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

// Optional closure types if unique to the backend guard logic
const CLOSURE_TYPES = [
  "PULL_ON",
  "BUTTON",
  "ZIPPER",
  "HOOK",
  "DRAWSTRING",
  "ELASTIC",
  "TIE_UP",
] as const;

export function validateAndCleanApparelInput(body: any): ApparelDetails {
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

  // 2. Uniform Normalization & Validation using shared constants
  const category = (apparel_detail.garment_category || "").toUpperCase();
  const subcategory = (apparel_detail.garment_subcategory || "").toUpperCase();

  if (!(GARMENT_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error(
      `Validation Error: '${category}' is not an authorized clothing category.`,
    );
  }

  const validSublist =
    GARMENT_SUBCATEGORY_MAP[category as keyof typeof GARMENT_SUBCATEGORY_MAP] || [];

  if (validSublist.length > 0 && !validSublist.includes(subcategory)) {
    throw new Error(
      `Validation Error: '${subcategory}' is not an authorized subcategory under ${category}.`,
    );
  }

  const gender = apparel_detail.gender?.toUpperCase() ?? null;
  if (gender && !(GENDERS as readonly string[]).includes(gender)) {
    throw new Error(`Invalid gender '${gender}'.`);
  }

  const style_type = apparel_detail.style_type?.toUpperCase() ?? null;
  if (style_type && !(STYLE_TYPES as readonly string[]).includes(style_type)) {
    throw new Error(`Invalid style_type '${style_type}'.`);
  }

  const occasion = apparel_detail.occasion?.toUpperCase() ?? null;
  if (occasion && !(OCCASIONS as readonly string[]).includes(occasion)) {
    throw new Error(`Invalid occasion '${occasion}'.`);
  }

  const fit = apparel_detail.fit?.toUpperCase() ?? null;
  if (fit && !(FITS as readonly string[]).includes(fit)) {
    throw new Error(`Invalid fit '${fit}'.`);
  }

  const sleeve_type = apparel_detail.sleeve_type?.toUpperCase() ?? null;
  if (sleeve_type && !(SLEEVE_TYPES as readonly string[]).includes(sleeve_type)) {
    throw new Error(`Invalid sleeve_type '${sleeve_type}'.`);
  }

  const neck_type = apparel_detail.neck_type?.toUpperCase() ?? null;
  if (neck_type && !(NECK_TYPES as readonly string[]).includes(neck_type)) {
    throw new Error(`Invalid neck_type '${neck_type}'.`);
  }

  const closure_type = apparel_detail.closure_type?.toUpperCase() ?? null;
  if (closure_type && !CLOSURE_TYPES.includes(closure_type as any)) {
    throw new Error(`Invalid closure_type '${closure_type}'.`);
  }

  const age_group = apparel_detail.age_group?.toUpperCase() ?? null;
  if (age_group && !(AGE_GROUPS as readonly string[]).includes(age_group)) {
    throw new Error(`Invalid age_group '${age_group}'.`);
  }

  const material_type = apparel_detail.material_type?.toUpperCase() ?? null;
  if (material_type && !(MATERIAL_TYPES as readonly string[]).includes(material_type)) {
    throw new Error(`Invalid material_type '${material_type}'.`);
  }

  const season = apparel_detail.season?.toUpperCase() ?? null;
  if (season && !(SEASONS as readonly string[]).includes(season)) {
    throw new Error(`Invalid season '${season}'.`);
  }

  const pattern = apparel_detail.pattern?.toUpperCase() ?? null;
  if (pattern && !(PATTERNS as readonly string[]).includes(pattern)) {
    throw new Error(`Invalid pattern '${pattern}'.`);
  }

  const condition = apparel_detail.condition?.toUpperCase() ?? null;
  if (condition && !(CONDITIONS as readonly string[]).includes(condition)) {
    throw new Error(`Invalid condition '${condition}'.`);
  }

  const sizing_group = apparel_detail.sizing_group?.toUpperCase() ?? null;
  if (sizing_group && !(SIZING_GROUPS as readonly string[]).includes(sizing_group)) {
    throw new Error(`Invalid sizing_group '${sizing_group}'.`);
  }

  // 3. Return a clean object matching your exact database columns / types
  return {
    garment_category: category as any,
    garment_subcategory: subcategory,
    style_type: style_type as any,
    gender: gender as any,
    fit: fit as any,
    occasion: occasion as any,
    season: season as any,
    material_type: material_type as any,
    material_composition: apparel_detail.material_composition ?? null,
    condition: condition as any,
    pattern: pattern as any,
    care_instructions: apparel_detail.care_instructions ?? null,
    age_group: age_group as any,
    sizing_group: sizing_group as any,
    sleeve_type: sleeve_type as any,
    neck_type: neck_type as any,
  };
}