import type { GarmentCategory } from "./apparel-types"

export const GARMENT_SUBCATEGORY_MAP: Record<
  GarmentCategory,
  string[]
> = {
  TOP: [
    "SHIRT",
    "T_SHIRT",
    "POLO",
    "BLOUSE",
    "TUNIC",
    "TANK_TOP",
  ],

  BOTTOM: [
    "JEANS",
    "TROUSERS",
    "SHORTS",
    "LEGGINGS",
    "SKIRT",
    "JOGGERS",
  ],

  DRESS: [
    "MAXI_DRESS",
    "MIDI_DRESS",
    "MINI_DRESS",
    "GOWN",
    "A_LINE_DRESS",
    "SHIFT_DRESS",
  ],

  OUTERWEAR: [
    "JACKET",
    "COAT",
    "BLAZER",
    "CARDIGAN",
    "HOODIE",
    "SWEATSHIRT",
    "PONCHO",
  ],

  ETHNIC: [
    "KURTI",
    "SAREE",
    "SALWAR_SUIT",
    "LEHENGA",
    "SHERWANI",
    "KURTA",
  ],
}

export function getSubcategories(
  category?: GarmentCategory
): string[] {
  if (!category) {
    return []
  }

  return GARMENT_SUBCATEGORY_MAP[category] ?? []
}