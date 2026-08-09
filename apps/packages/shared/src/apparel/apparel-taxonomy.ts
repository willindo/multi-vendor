import type { GarmentCategory } from "./apparel-types"

export const GARMENT_SUBCATEGORY_MAP: Record<
  GarmentCategory,
  string[]
> = {
  TOP: ["TSHIRT", "T_SHIRT", "SHIRT", "BLOUSE", "TUNIC", "KURTA", "KURTI", "POLO", "TANK_TOP"],
  BOTTOM: ["TROUSERS", "JEANS", "LEGGINGS", "SHORTS", "SKIRT", "JOGGERS"],
  DRESS: [
    "MAXI_DRESS",
    "MIDI_DRESS",
    "MINI_DRESS",
    "GOWN",
    "JUMPSUIT",
    "ROMPER",
    "A_LINE_DRESS",
    "SHIFT_DRESS",
  ],
  ETHNIC: [
    "SAREE",
    "SALWAR_SUIT",
    "LEHENGA",
    "SHERWANI",
    "DHOTI",
    "ABAYA",
    "KAFTAN",
    "KURTI",
    "KURTA",
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
}

export function getSubcategories(
  category?: GarmentCategory
): string[] {
  if (!category) {
    return []
  }

  return GARMENT_SUBCATEGORY_MAP[category] ?? []
}