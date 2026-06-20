"use client"

import type {
  ApparelDetails,
  NeckType,
  SleeveType,
} from "@shared/apparel/apparel-types"

import {
  NECK_TYPE_OPTIONS,
  SLEEVE_TYPE_OPTIONS,
} from "@shared/apparel/apparel-enums"

import ApparelSelect from "./ApparelSelect"

type Props = {
  value: ApparelDetails
  onChange: (next: ApparelDetails) => void
}

export default function ApparelConstruction({
  value,
  onChange,
}: Props) {
  const category =
    value.garment_category

  const showSleeveType =
    category !== "BOTTOM"

  const showNeckType =
    category !== "BOTTOM"

  if (
    !showSleeveType &&
    !showNeckType
  ) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 border-b pb-1">
        Construction
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {showSleeveType && (
          <ApparelSelect
            label="Sleeve Type"
            value={
              value.sleeve_type ?? ""
            }
            options={
              SLEEVE_TYPE_OPTIONS
            }
            placeholder="Select"
            onChange={(
              sleeve_type
            ) =>
              onChange({
                ...value,
                sleeve_type:
                  sleeve_type === ""
                    ? undefined
                    : (sleeve_type as SleeveType),
              })
            }
          />
        )}

        {showNeckType && (
          <ApparelSelect
            label="Neck Type"
            value={
              value.neck_type ?? ""
            }
            options={
              NECK_TYPE_OPTIONS
            }
            placeholder="Select"
            onChange={(
              neck_type
            ) =>
              onChange({
                ...value,
                neck_type:
                  neck_type === ""
                    ? undefined
                    : (neck_type as NeckType),
              })
            }
          />
        )}
      </div>
    </div>
  )
}