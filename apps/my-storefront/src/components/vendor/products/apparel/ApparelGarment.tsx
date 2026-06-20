"use client"

import {
  GARMENT_CATEGORY_OPTIONS,
} from "@shared/apparel/apparel-enums"

import {
  getSubcategories,
} from "@shared/apparel/apparel-taxonomy"

import type {
  ApparelDetails,
  GarmentCategory,
} from "@shared/apparel/apparel-types"

import ApparelSelect from "./ApparelSelect"

type Props = {
  value: ApparelDetails
  onChange: (
    next: ApparelDetails
  ) => void
}

export default function ApparelGarment({
  value,
  onChange,
}: Props) {
  const subcategories =
    getSubcategories(
      value.garment_category
    )

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 border-b pb-1">
        Garment
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        <ApparelSelect
          label="Garment Category"
          value={
            value.garment_category
          }
          options={
            GARMENT_CATEGORY_OPTIONS
          }
          onChange={(
            category
          ) =>
            onChange({
              ...value,
              garment_category:
                category as GarmentCategory,

              /*
               * A1:
               * reset invalid subcategory
               */
              garment_subcategory:
                "",
            })
          }
        />

        <ApparelSelect
          label="Garment Subcategory"
          value={
            value.garment_subcategory
          }
          placeholder="Select"
          options={subcategories.map(
            (subcategory) => ({
              value:
                subcategory,
              label:
                subcategory
                  .replace(
                    /_/g,
                    " "
                  )
                  .toLowerCase()
                  .replace(
                    /\b\w/g,
                    (c) =>
                      c.toUpperCase()
                  ),
            })
          )}
          onChange={(
            garment_subcategory
          ) =>
            onChange({
              ...value,
              garment_subcategory,
            })
          }
        />
      </div>
    </div>
  )
}