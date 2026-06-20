"use client"

import type {
  ApparelDetails,
  Condition,
  Season,
} from "@shared/apparel/apparel-types"

import {
  CONDITION_OPTIONS,
  SEASON_OPTIONS,
} from "@shared/apparel/apparel-enums"

import ApparelSelect from "./ApparelSelect"
import ApparelTextarea from "./ApparelTextarea"

type Props = {
  value: ApparelDetails
  onChange: (next: ApparelDetails) => void
}

export default function ApparelLifecycle({
  value,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400 border-b pb-1">
        Lifecycle
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        <ApparelSelect
          label="Season"
          value={value.season ?? ""}
          options={SEASON_OPTIONS}
          placeholder="Select"
          onChange={(season) =>
            onChange({
              ...value,
              season:
                season === ""
                  ? undefined
                  : (season as Season),
            })
          }
        />

        <ApparelSelect
          label="Condition"
          value={value.condition ?? ""}
          options={CONDITION_OPTIONS}
          placeholder="Select"
          onChange={(condition) =>
            onChange({
              ...value,
              condition:
                condition === ""
                  ? undefined
                  : (condition as Condition),
            })
          }
        />
      </div>

      <ApparelTextarea
        label="Care Instructions"
        value={
          value.care_instructions ?? ""
        }
        placeholder="Machine wash cold, tumble dry low..."
        onChange={(
          care_instructions
        ) =>
          onChange({
            ...value,
            care_instructions,
          })
        }
      />
    </div>
  )
}