"use client"

import type {
  ApparelDetails,
  Fit,
  Occasion,
  Pattern,
  StyleType,
} from "@shared/apparel/apparel-types"

import {
  FIT_OPTIONS,
  OCCASION_OPTIONS,
  PATTERN_OPTIONS,
  STYLE_TYPE_OPTIONS,
} from "@shared/apparel/apparel-enums"

import ApparelSelect from "./ApparelSelect"

type Props = {
  value: ApparelDetails
  onChange: (next: ApparelDetails) => void
}

export default function ApparelStyling({
  value,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 border-b pb-1">
        Styling
      </h3>

      <div className="grid gap-4 md:grid-cols-4">
        <ApparelSelect
          label="Fit"
          value={value.fit}
          options={FIT_OPTIONS}
          onChange={(fit) =>
            onChange({
              ...value,
              fit: fit as Fit,
            })
          }
        />

        <ApparelSelect
          label="Pattern"
          value={value.pattern}
          options={PATTERN_OPTIONS}
          onChange={(pattern) =>
            onChange({
              ...value,
              pattern: pattern as Pattern,
            })
          }
        />

        <ApparelSelect
          label="Style"
          value={value.style_type}
          options={STYLE_TYPE_OPTIONS}
          onChange={(style_type) =>
            onChange({
              ...value,
              style_type:
                style_type as StyleType,
            })
          }
        />

        <ApparelSelect
          label="Occasion"
          value={value.occasion}
          options={OCCASION_OPTIONS}
          onChange={(occasion) =>
            onChange({
              ...value,
              occasion:
                occasion as Occasion,
            })
          }
        />
      </div>
    </div>
  )
}