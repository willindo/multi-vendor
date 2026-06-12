import { HttpTypes } from "@medusajs/types"

export interface ApparelDetailFields {
  id: string
  product_id: string

  gender?: string | null
  age_group?: string | null
  sizing_group?: string | null

  garment_category?: string | null
  garment_subcategory?: string | null

  fit?: string | null
  pattern?: string | null
  style_type?: string | null
  sleeve_type?: string | null
  neck_type?: string | null

  material_type?: string | null
  material_composition?: string | null
  care_instructions?: string | null

  
  occasion?: string | null
  season?: string | null
  condition?: string | null
}

// Extend the core Medusa type contract seamlessly
export type ExtendedMarketplaceProduct = HttpTypes.StoreProduct & {
  vendor_id?: string
  vendor_name?: string
  apparel_detail?: ApparelDetailFields | null
}
