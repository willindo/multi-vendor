"use client"

import type {
  ApparelDetails,
} from "@shared/apparel/apparel-types"

import ApparelClassification from "./ApparelClassification"
import ApparelGarment from "./ApparelGarment"
import ApparelStyling from "./ApparelStyling"
import ApparelConstruction from "./ApparelConstruction"
import ApparelMaterial from "./ApparelMaterial"
import ApparelLifecycle from "./ApparelLifecycle"

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

      <ApparelClassification
        value={value}
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