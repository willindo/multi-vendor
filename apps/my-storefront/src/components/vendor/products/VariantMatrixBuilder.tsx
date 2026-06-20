"use client"

import React, { useMemo, useState, useEffect } from "react"

import { generateVariantCombinations } from "@shared/variants/variant-generator"

import type {
  VariantCombination,
  VariantOption,
} from "@shared/variants/variant-types"

import {
  getRecommendedDimensions,
  getPredefinedVariantValues,
  supportsCustomValues,
} from "@shared/index"

import type {
  GarmentCategory,
  GarmentSubcategory,
} from "@shared/apparel/apparel-types"

type Props = {
  category?: GarmentCategory
  subcategory?: GarmentSubcategory
  initialOptions?: VariantOption[]
  onGenerate: (variants: VariantCombination[]) => void
}

export default function VariantMatrixBuilder({
  category,
  subcategory,
  initialOptions = [],
  onGenerate,
}: Props) {
  const dimensions = getRecommendedDimensions(category, subcategory)

  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})

  function toggleValue(dimension: string, value: string) {
    const current = selections[dimension] ?? []

    const exists = current.includes(value)

    setSelections((prev) => ({
      ...prev,

      [dimension]: exists
        ? current.filter((v) => v !== value)
        : [...current, value],
    }))
  }

  useEffect(() => {
    if (!dimensions.length) return

    const hydratedSelections: Record<string, string[]> = {}

    dimensions.forEach((dimension) => {
      // Check if an initial option matches (case-insensitive)
      const match = initialOptions.find(
        (o) => o.name.toUpperCase() === dimension.toUpperCase()
      )
      // Default to an empty array if no match exists yet
      hydratedSelections[dimension] = match ? match.values : []
    })

    setSelections(hydratedSelections)
  }, [initialOptions, dimensions])

  function addCustomValue(dimension: string) {
    const value = (customInputs[dimension] ?? "").trim()

    if (!value) {
      return
    }

    const current = selections[dimension] ?? []

    if (current.includes(value)) {
      return
    }

    setSelections((prev) => ({
      ...prev,

      [dimension]: [...current, value],
    }))

    setCustomInputs((prev) => ({
      ...prev,

      [dimension]: "",
    }))
  }

  function removeValue(dimension: string, value: string) {
    setSelections((prev) => ({
      ...prev,

      [dimension]: (prev[dimension] ?? []).filter((v) => v !== value),
    }))
  }

  const canGenerate = dimensions.every(
    (dimension) => (selections[dimension] ?? []).length > 0
  )

  const variantOptions = useMemo(() => {
    return dimensions.map(
      (dimension): VariantOption => ({
        name: dimension.charAt(0) + dimension.slice(1).toLowerCase(),

        values: selections[dimension] ?? [],
      })
    )
  }, [dimensions, selections])

  function handleGenerate() {
    if (!canGenerate) {
      return
    }

    onGenerate(generateVariantCombinations(variantOptions))
  }

  return (
    <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold">Variant Options</h2>

        <p className="mt-1 text-sm text-neutral-500">
          Configure apparel variants.
        </p>
      </div>

      {dimensions.map((dimension) => {
        const predefined = getPredefinedVariantValues(
          dimension,
          category,
          subcategory
        )

        const allowCustom = supportsCustomValues(
          dimension,
          category,
          subcategory
        )

        return (
          <div key={dimension} className="space-y-3">
            <h3 className="font-medium">{dimension}</h3>

            {predefined.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {predefined.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleValue(dimension, value)}
                    className={`rounded border px-3 py-1 text-sm ${
                      (selections[dimension] ?? []).includes(value)
                        ? "bg-black text-white"
                        : "bg-white"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}

            {allowCustom && (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInputs[dimension] ?? ""}
                    onChange={(e) =>
                      setCustomInputs((prev) => ({
                        ...prev,

                        [dimension]: e.target.value,
                      }))
                    }
                    placeholder={`Add ${dimension.toLowerCase()}`}
                    className="flex-1 rounded border border-neutral-300 px-3 py-2"
                  />

                  <button
                    type="button"
                    onClick={() => addCustomValue(dimension)}
                    className="rounded bg-black px-4 py-2 text-white"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(selections[dimension] ?? [])
                    .filter((value) => !predefined.includes(value))
                    .map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => removeValue(dimension, value)}
                        className="rounded bg-neutral-100 px-3 py-1 text-sm"
                      >
                        {value} ×
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )
      })}

      <button
        type="button"
        disabled={!canGenerate}
        onClick={handleGenerate}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        Generate Matrix
      </button>
    </div>
  )
}
