import { GARMENT_SUBCATEGORIES } from "./apparel-taxonomy"

export function getSubcategories(
  category?: string
): string[] {
  if (!category) {
    return []
  }

  return (
    GARMENT_SUBCATEGORIES[
      category as keyof typeof GARMENT_SUBCATEGORIES
    ] ?? []
  )
}