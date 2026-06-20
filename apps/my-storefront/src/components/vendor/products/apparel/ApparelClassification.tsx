"use client"

import {
  AGE_GROUP_OPTIONS,
  GENDER_OPTIONS,
  SIZING_GROUP_OPTIONS,
} from "@shared/apparel/apparel-enums"

import type {
  ApparelDetails,
  AgeGroup,
  Gender,
  SizingGroup,
} from "@shared/apparel/apparel-types"

import ApparelSelect from "./ApparelSelect"

type Props = {
  value: ApparelDetails
  onChange: (
    next: ApparelDetails
  ) => void
}

export default function ApparelClassification({
  value,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 border-b pb-1">
        Classification
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        <ApparelSelect
          label="Gender"
          value={value.gender}
          options={GENDER_OPTIONS}
          onChange={(gender) =>
            onChange({
              ...value,
              gender:
                gender as Gender,
            })
          }
        />

        <ApparelSelect
          label="Age Group"
          value={value.age_group}
          options={
            AGE_GROUP_OPTIONS
          }
          onChange={(
            age_group
          ) =>
            onChange({
              ...value,
              age_group:
                age_group as AgeGroup,
            })
          }
        />

        <ApparelSelect
          label="Sizing Group"
          value={
            value.sizing_group
          }
          options={
            SIZING_GROUP_OPTIONS
          }
          onChange={(
            sizing_group
          ) =>
            onChange({
              ...value,
              sizing_group:
                sizing_group as SizingGroup,
            })
          }
        />
      </div>
    </div>
  )
}