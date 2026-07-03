"use client"

import React, { useMemo, useState, useEffect, useCallback } from "react"
import { generateVariantCombinations } from "@shared/variants/variant-generator"
import type { VariantCombination, VariantOption } from "@shared/variants/variant-types"
import {
  getRecommendedDimensions,
  getPredefinedVariantValues,
  supportsCustomValues,
} from "@shared/index"
import type { GarmentCategory, GarmentSubcategory } from "@shared/apparel/apparel-types"

type Props = {
  category?: GarmentCategory
  subcategory?: GarmentSubcategory
  initialOptions?: VariantOption[]
  onGenerate: (variants: VariantCombination[]) => void
  disabled?: boolean
  className?: string
}

export default function VariantMatrixBuilder({
  category,
  subcategory,
  initialOptions = [],
  onGenerate,
  disabled = false,
  className = "",
}: Props) {
  // Memoize dimensions to prevent recalculation on every render
  const dimensions = useMemo(
    () => getRecommendedDimensions(category, subcategory),
    [category, subcategory]
  )

  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})

  // Hydrate selections from initialOptions when dimensions change
  useEffect(() => {
    if (initialOptions.length === 0) return

    const hydratedSelections: Record<string, string[]> = {}

    dimensions.forEach((dimension) => {
      // Match case-insensitively so "Size" from old data hydrates into "SIZE" bucket
      const match = initialOptions.find(
        (o) => o.name.toUpperCase() === dimension.toUpperCase()
      )
      hydratedSelections[dimension] = match ? [...match.values] : []
    })

    setSelections(hydratedSelections)
  }, [initialOptions, dimensions])

  // Toggle value with memoized callback
  const toggleValue = useCallback((dimension: string, value: string) => {
    if (disabled) return

    setSelections((prev) => {
      const current = prev[dimension] ?? []
      const exists = current.includes(value)

      return {
        ...prev,
        [dimension]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      }
    })
  }, [disabled])

  // Add custom value with validation
  const addCustomValue = useCallback((dimension: string) => {
    if (disabled) return

    const value = (customInputs[dimension] ?? "").trim()
    if (!value) return

    setSelections((prev) => {
      const current = prev[dimension] ?? []
      if (current.includes(value)) return prev // Prevent duplicates

      return {
        ...prev,
        [dimension]: [...current, value],
      }
    })

    setCustomInputs((prev) => ({
      ...prev,
      [dimension]: "",
    }))
  }, [customInputs, disabled])

  // Remove value
  const removeValue = useCallback((dimension: string, value: string) => {
    if (disabled) return

    setSelections((prev) => ({
      ...prev,
      [dimension]: (prev[dimension] ?? []).filter((v) => v !== value),
    }))
  }, [disabled])

  // Update custom input
  const updateCustomInput = useCallback((dimension: string, value: string) => {
    setCustomInputs((prev) => ({
      ...prev,
      [dimension]: value,
    }))
  }, [])

  // Check if generation is possible
  const canGenerate = useMemo(() => {
    return !disabled && dimensions.every(
      (dimension) => (selections[dimension] ?? []).length > 0
    )
  }, [dimensions, selections, disabled])

  // Build variant options for generation.
  // Dimension names are kept in UPPERCASE to match ApparelVariantDimension literals
  // ("SIZE", "COLOR", "MATERIAL") and the product_option.title stored in the DB.
  const variantOptions = useMemo(() => {
    return dimensions.map(
      (dimension): VariantOption => ({
        name: dimension.toUpperCase(),
        values: selections[dimension] ?? [],
      })
    )
  }, [dimensions, selections])

  // Handle generate with memoized callback
  const handleGenerate = useCallback(() => {
    if (!canGenerate) return

    const combinations = generateVariantCombinations(variantOptions)
    onGenerate(combinations)
  }, [canGenerate, onGenerate, variantOptions])

  // Get predefined values for a dimension
  const getPredefinedValues = useCallback((dimension: string) => {
    return getPredefinedVariantValues(dimension as any, category, subcategory) || []
  }, [category, subcategory])

  // Check if dimension supports custom values
  const supportsCustom = useCallback((dimension: string) => {
    return supportsCustomValues(dimension as any, category, subcategory)
  }, [category, subcategory])

  // Reset all selections
  const resetSelections = useCallback(() => {
    if (disabled) return
    setSelections({})
    setCustomInputs({})
  }, [disabled])

  return (
    <div className={`space-y-6 rounded-lg border border-neutral-200 bg-white p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Variant Options</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Configure apparel variants for {category || "your product"}
          </p>
        </div>
        {(Object.keys(selections).length > 0 || Object.keys(customInputs).length > 0) && (
          <button
            type="button"
            onClick={resetSelections}
            className="text-sm text-neutral-500 hover:text-neutral-700"
            disabled={disabled}
          >
            Reset
          </button>
        )}
      </div>

      {dimensions.length === 0 ? (
        <div className="py-8 text-center text-neutral-500">
          <p>No dimensions available for this category</p>
          <p className="text-sm">Select a category to configure variants</p>
        </div>
      ) : (
        <>
          {dimensions.map((dimension) => {
            const predefined = getPredefinedValues(dimension)
            const allowCustom = supportsCustom(dimension)
            const selectedValues = selections[dimension] ?? []

            return (
              <div key={dimension} className="space-y-3 border-t border-neutral-100 pt-4 first:border-t-0 first:pt-0">
                <h3 className="font-medium text-neutral-700">{dimension}</h3>

                {predefined.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {predefined.map((value) => {
                      const isSelected = selectedValues.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleValue(dimension, value)}
                          disabled={disabled}
                          className={`rounded border px-3 py-1 text-sm transition-colors ${isSelected
                            ? "border-black bg-black text-white hover:bg-neutral-800"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {value}
                        </button>
                      )
                    })}
                  </div>
                )}

                {allowCustom && (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customInputs[dimension] ?? ""}
                        onChange={(e) => updateCustomInput(dimension, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addCustomValue(dimension)
                          }
                        }}
                        placeholder={`Add custom ${dimension.toLowerCase()}`}
                        disabled={disabled}
                        className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomValue(dimension)}
                        disabled={disabled || !customInputs[dimension]?.trim()}
                        className="rounded bg-black px-4 py-2 text-sm text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>

                    {selectedValues.filter((v) => !predefined.includes(v)).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedValues
                          .filter((value) => !predefined.includes(value))
                          .map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => removeValue(dimension, value)}
                              disabled={disabled}
                              className="rounded bg-neutral-100 px-3 py-1 text-sm text-neutral-700 transition-colors hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {value} ×
                            </button>
                          ))}
                      </div>
                    )}
                  </>
                )}

                {selectedValues.length > 0 && (
                  <div className="text-xs text-neutral-400">
                    {selectedValues.length} value{selectedValues.length > 1 ? "s" : ""} selected
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={handleGenerate}
              className="flex-1 rounded bg-black px-4 py-2 text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Variants
            </button>
            <button
              type="button"
              onClick={resetSelections}
              disabled={disabled || (!Object.values(selections).some(v => v.length > 0))}
              className="rounded border border-neutral-300 px-4 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>

          <div className="text-xs text-neutral-400">
            Select at least one value for each dimension to generate variants
          </div>
        </>
      )}
    </div>
  )
}