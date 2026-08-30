"use client"

import React from "react"
import { VariantMatrixRow, getCurrencySymbol } from "@/lib/util/vendor/hydration"

export type { VariantMatrixRow }

type Props = {
  variants: VariantMatrixRow[]
  onChange: (variants: VariantMatrixRow[]) => void
  defaultCurrency?: string
}

export default function VariantMatrixTable({
  variants,
  onChange,
  defaultCurrency = "INR",
}: Props) {
  function updateRow(index: number, patch: Partial<VariantMatrixRow>) {
    const next = [...variants]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const activeCount = variants.filter((v) => v.enabled).length
  const pendingRemovalCount = variants.filter((v) => !v.enabled && v.id).length

  if (variants.length === 0) {
    return (
      <div className="p-4 border border-dashed rounded text-center text-xs text-gray-500">
        No variants configured.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Active Matrix Variants ({activeCount})</span>
        <div className="space-x-2">
          <button
            type="button"
            onClick={() => onChange(variants.map((v) => ({ ...v, enabled: true })))}
            className="text-indigo-600 hover:underline font-medium"
          >
            Enable All
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => onChange(variants.map((v) => ({ ...v, enabled: false })))}
            className="text-gray-500 hover:underline font-medium"
          >
            Disable All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Variant</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">SKU</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Price</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Currency</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Stock</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {variants.map((variant, index) => {
              const activeCurrency = (
                variant.currencyCode ||
                defaultCurrency ||
                "INR"
              ).toUpperCase()

              const isPendingRemoval = !variant.enabled && !!variant.id

              return (
                <tr
                  key={variant.id || `row-${index}`}
                  className={!variant.enabled ? "bg-gray-50 opacity-60" : ""}
                >
                  <td className="px-3 py-2 font-medium">
                    {variant.title ||
                      variant.options?.map((o) => o.value).join(" / ") ||
                      `Variant #${index + 1}`}
                    {isPendingRemoval && (
                      <span className="block text-[10px] text-red-500">
                        Marked for deletion
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={variant.sku ?? ""}
                      disabled={!variant.enabled}
                      onChange={(e) => updateRow(index, { sku: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-xs disabled:bg-gray-100"
                      placeholder="SKU"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price ?? ""}
                      disabled={!variant.enabled}
                      onChange={(e) =>
                        updateRow(index, {
                          price:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                      className="w-20 px-2 py-1 border rounded text-xs disabled:bg-gray-100"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={activeCurrency}
                      disabled={!variant.enabled}
                      onChange={(e) =>
                        updateRow(index, {
                          currencyCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="px-2 py-1 border rounded text-xs disabled:bg-gray-100 bg-white"
                    >
                      <option value="INR">INR ({getCurrencySymbol("INR")})</option>
                      <option value="USD">USD ({getCurrencySymbol("USD")})</option>
                      <option value="EUR">EUR ({getCurrencySymbol("EUR")})</option>
                      <option value="GBP">GBP ({getCurrencySymbol("GBP")})</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={variant.inventoryQuantity ?? ""}
                      disabled={!variant.enabled}
                      onChange={(e) =>
                        updateRow(index, {
                          inventoryQuantity:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                      className="w-16 px-2 py-1 border rounded text-xs disabled:bg-gray-100"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={variant.enabled}
                      onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pendingRemovalCount > 0 && (
        <p className="text-[11px] text-red-600 text-right">
          {pendingRemovalCount} saved variant(s) will be deleted on submission.
        </p>
      )}
    </div>
  )
}