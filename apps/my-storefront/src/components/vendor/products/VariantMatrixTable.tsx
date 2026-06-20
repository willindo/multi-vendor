"use client"

import React from "react"

import type { VariantCombination } from "@shared/index"

export type VariantMatrixRow = VariantCombination & {
  id?:string
  enabled: boolean
}

type Props = {
  variants: VariantMatrixRow[]

  onChange: (variants: VariantMatrixRow[]) => void
}

export default function VariantMatrixTable({ variants, onChange }: Props) {
  function updateRow(index: number, patch: Partial<VariantMatrixRow>) {
    const next = [...variants]

    next[index] = {
      ...next[index],
      ...patch,
    }

    onChange(next)
  }

  if (variants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6">
        <h2 className="text-lg font-semibold">Variant Matrix</h2>

        <p className="mt-2 text-sm text-neutral-500">
          Generate variants to configure SKU, pricing, and inventory.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold">Variant Matrix</h2>

        <p className="mt-1 text-sm text-neutral-500">
          Configure each generated variant.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="px-3 py-2 text-left font-medium">Variant</th>
              <th className="px-3 py-2 text-left font-medium">SKU</th>
              <th className="px-3 py-2 text-left font-medium">Price</th>
              <th className="px-3 py-2 text-left font-medium">Stock</th>
              <th className="px-3 py-2 text-center font-medium">Enabled</th>
            </tr>
          </thead>

          <tbody>
            {variants.map((variant, index) => {
              const variantLabel = variant.options
                .map((option) => option.value)
                .join(" / ")

              return (
                <tr key={index} className="border-b border-neutral-100">
                  <td className="px-3 py-3 align-middle">{variantLabel}</td>
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="text"
                      value={variant.sku ?? ""}
                      onChange={(e) =>
                        updateRow(index, {
                          sku: e.target.value,
                        })
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                      placeholder="SKU"
                    />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price ?? ""}
                      onChange={(e) =>
                        updateRow(index, {
                          price:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={variant.inventoryQuantity ?? ""}
                      onChange={(e) =>
                        updateRow(index, {
                          inventoryQuantity:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-neutral-300 px-2 py-1 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={variant.enabled}
                      onChange={(e) =>
                        updateRow(index, {
                          enabled: e.target.checked,
                        })
                      }
                      className="h-4 w-4"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onChange(
              variants.map(v => ({
                ...v,
                enabled: true,
              }))
            )
          }
          className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50"
        >
          Enable All
        </button>
        <button
          type="button"
          onClick={() =>
            onChange(
              variants.map(v => ({
                ...v,
                enabled: false,
              }))
            )
          }
          className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50"
        >
          Disable All
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        {variants.length} variant
        {variants.length === 1 ? "" : "s"} configured.
      </p>
    </div>
  )
}