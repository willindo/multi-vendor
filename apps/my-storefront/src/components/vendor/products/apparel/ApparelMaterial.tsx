"use client"

import type {
  ApparelDetails,
  MaterialType,
} from "@shared/apparel/apparel-types"

import {
  MATERIAL_TYPE_OPTIONS,
} from "@shared/apparel/apparel-enums"

import ApparelSelect from "./ApparelSelect"
import ApparelTextInput from "./ApparelTextInput"

type Props = {
  value: ApparelDetails
  onChange: (next: ApparelDetails) => void
}

export default function ApparelMaterial({
  value,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 border-b pb-1">
        Material
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        <ApparelSelect
          label="Material Type"
          value={value.material_type ?? ""}
          options={MATERIAL_TYPE_OPTIONS}
          placeholder="Select"
          onChange={(material_type) =>
            onChange({
              ...value,
              material_type:
                material_type === ""
                  ? undefined
                  : (material_type as MaterialType),
            })
          }
        />

        <ApparelTextInput
          label="Material Composition"
          value={
            value.material_composition ?? ""
          }
          placeholder="e.g. 95% Cotton, 5% Elastane"
          onChange={(
            material_composition
          ) =>
            onChange({
              ...value,
              material_composition,
            })
          }
        />
      </div>
    </div>
  )
}