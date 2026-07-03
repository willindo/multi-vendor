"use client"
import { useCallback } from "react"

import type {
  ApparelDetails,
} from "@shared/apparel/apparel-types"

import ApparelClassification from "./ApparelClassification"
import ApparelGarment from "./ApparelGarment"
import ApparelStyling from "./ApparelStyling"
import ApparelConstruction from "./ApparelConstruction"
import ApparelMaterial from "./ApparelMaterial"
import ApparelLifecycle from "./ApparelLifecycle"
import ApparelSelect from "./ApparelSelect"
import { DEFAULT_APPAREL_DETAILS } from "@shared/index"

type Props = {
  value: ApparelDetails
  onChange: (
    next: ApparelDetails
  ) => void
}

export default function ApparelDetailsSection({
  value,
  onChange,
}: Props) {

  // In ApparelDetailsSection.tsx

  const updateField = useCallback(
    <K extends keyof ApparelDetails>(field: K, val: ApparelDetails[K]) => {
      onChange({ ...value, [field]: val })
    },
    [value, onChange]
  )

  return (
    <div className="space-y-8 rounded-lg border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold">
          Apparel Details
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Classification and
          merchandising information
          for apparel products.
        </p>
      </div>
      <ApparelSelect
        label="Garment Category"
        value={value.garment_category}
        options={[
          { value: "TOP", label: "Top" },
          { value: "BOTTOM", label: "Bottom" },
          { value: "DRESS", label: "Dress" },
          { value: "OUTERWEAR", label: "Outerwear" },
          { value: "ETHNIC", label: "Ethnic" },
        ]}
        onChange={(val) => updateField("garment_category", val as any)}
        placeholder="Select category"
        required
      />
      <ApparelClassification
        value={value || DEFAULT_APPAREL_DETAILS}
        onChange={onChange}
      />

      <ApparelGarment
        value={value}
        onChange={onChange}
      />

      <ApparelStyling
        value={value}
        onChange={onChange}
      />

      <ApparelConstruction
        value={value}
        onChange={onChange}
      />

      <ApparelMaterial
        value={value}
        onChange={onChange}
      />

      <ApparelLifecycle
        value={value}
        onChange={onChange}
      />
    </div>

  )
}