// ==== ./src/app/vendor/dashboard/products/edit/EditProductFormClient.tsx ====
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import type {
  VariantCombination,
  VariantOption,
  ApparelDetails,
} from "@shared/index"
import { DEFAULT_APPAREL_DETAILS } from "@shared/index"

import ApparelDetailsSection from "@/components/vendor/products/apparel/ApparelDetailsSection"
import VariantMatrixBuilder from "@/components/vendor/products/VariantMatrixBuilder"
import VariantMatrixTable, {
  VariantMatrixRow,
} from "@/components/vendor/products/VariantMatrixTable"

interface EditProductFormClientProps {
  productId: string
  initialProduct: any | null
  serverToken?: string
}

export default function EditProductFormClient({
  productId,
  initialProduct,
  serverToken,
}: EditProductFormClientProps) {
  const router = useRouter()
  const [product, setProduct] = useState(initialProduct)
  const [loading, setLoading] = useState(!initialProduct)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resolvedToken, setResolvedToken] = useState(serverToken || "")

  // --- CORE IDENTIFIERS ---
  const [title, setTitle] = useState(initialProduct?.title || "")
  const [handle, setHandle] = useState(initialProduct?.handle || "")
  const [description, setDescription] = useState(
    initialProduct?.description || ""
  )
  const [weight, setWeight] = useState<number>(initialProduct?.weight || 0)

  // --- MULTI-VARIANT RUNTIME ENGINE ---
  const [variantRows, setVariantRows] = useState<VariantMatrixRow[]>([])
  const [builderOptions, setBuilderOptions] = useState<VariantOption[]>([])
  const [manageInventory, setManageInventory] = useState(true)
  // --- APPAREL DETAILS SPECS ---
  const [apparel, setApparel] = useState<ApparelDetails>(
    DEFAULT_APPAREL_DETAILS
  )

  useEffect(() => {
    if (!resolvedToken) {
      const clientToken =
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("medusa_vendor_jwt="))
          ?.split("=")[1] || localStorage.getItem("vendor_token")
      if (clientToken) setResolvedToken(clientToken)
    }
  }, [resolvedToken])

  useEffect(() => {
    if (product) {
      setTitle(product.title || "")
      setHandle(product.handle || "")
      setDescription(product.description || "")
      setWeight(product.weight || 0)

      if (product?.variants) {
        const rows: VariantMatrixRow[] = product.variants.map(
          (variant: any) => ({
            id: variant.id,
            title: variant.title,
            sku: variant.sku ?? "",
            // Verification check: Medusa prices array structure translation
            price: variant.prices?.[0]?.amount
              ? variant.prices[0].amount / 100
              : 0,
            currencyCode:
              variant.prices?.[0]?.currency_code?.toLowerCase() || "usd",
            inventoryQuantity: variant.inventory_quantity ?? 0,
            manageInventory: variant.manage_inventory ?? true,
            // DB entries are initialized as enabled
            enabled: variant.enabled ?? true,
            // Mapping options relationship array: variants -> pivot options -> option titles
            options:
              variant.options?.map((option: any) => ({
                optionName: option.option?.title || option.title || "",
                value: option.value,
              })) ?? [],
          })
        )

        setVariantRows(rows)
        setBuilderOptions(reconstructOptionsFromVariants(rows))
      }

      const apparelDetail = Array.isArray(product.apparel_detail)
        ? product.apparel_detail[0]
        : product.apparel_detail

      if (apparelDetail) {
        setApparel({
          ...DEFAULT_APPAREL_DETAILS,
          ...apparelDetail,
        })
      }
    }
  }, [product])

  useEffect(() => {
    if (initialProduct) return
    const fetchProductClientSide = async () => {
      try {
        const clientToken =
          document.cookie
            .split("; ")
            .find((row) => row.startsWith("medusa_vendor_jwt="))
            ?.split("=")[1] || localStorage.getItem("vendor_token")
        if (!clientToken) return
        setResolvedToken(clientToken)

        const backendUrl =
          window.location.hostname === "localhost"
            ? "http://localhost:9000"
            : `http://${window.location.hostname}:9000`
        const response = await fetch(`${backendUrl}/vendors/products`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${clientToken}`,
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          const data = await response.json()
          const productList =
            data.products || data.vendor_products || data.data || []
          const match = productList.find((p: any) => p && p.id === productId)
          if (match) setProduct(match)
        }
      } catch (err) {
        console.error("Client resolution error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProductClientSide()
  }, [initialProduct, productId])

  function variantKey(options: { optionName: string; value: string }[]) {
    return options
      .slice()
      .sort((a, b) => a.optionName.localeCompare(b.optionName))
      .map((o) => `${o.optionName}:${o.value}`)
      .join("|")
  }

  const handleHandleChange = (val: string) => {
    const cleanSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
    setHandle(cleanSlug)
  }

  function reconstructOptionsFromVariants(
    rows: VariantMatrixRow[]
  ): VariantOption[] {
    const map = new Map<string, Set<string>>()

    rows.forEach((row) => {
      if (!row.enabled) return // Skip dead configurations
      row.options.forEach((option) => {
        if (!option.optionName) return
        if (!map.has(option.optionName)) {
          map.set(option.optionName, new Set())
        }
        map.get(option.optionName)!.add(option.value)
      })
    })

    return Array.from(map.entries()).map(([name, values]) => ({
      name,
      values: Array.from(values),
    }))
  }

  function handleGenerateVariants(combinations: VariantCombination[]) {
    setVariantRows((existing) => {
      const existingMap = new Map(
        existing.map((row) => [variantKey(row.options), row])
      )

      const merged = combinations.map((combination) => {
        const key = variantKey(combination.options)
        const old = existingMap.get(key)

        if (old) {
          return {
            ...old,
            title: combination.title,
            options: combination.options,
            enabled: true, // Reactivated if regenerated
          }
        }

        return {
          title: combination.title,
          sku:
            combination.sku ??
            `${handle}-${combination.title
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/\//g, "-")}`,
          price: combination.price ?? 0,
          currencyCode: "usd",
          inventoryQuantity: combination.inventoryQuantity ?? 0,
          manageInventory: combination.manageInventory ?? true,
          enabled: true,
          options: combination.options,
        }
      })

      // Soft delete: flag unselected rows to notify DB layer of removal
      existing.forEach((row) => {
        const key = variantKey(row.options)
        const stillExists = combinations.some(
          (combination) => variantKey(combination.options) === key
        )

        if (!stillExists) {
          merged.push({
            ...row,
            enabled: false,
          })
        }
      })

      return merged
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Dynamic clean-up logic of payload properties to prevent validation schema conflicts
    const finalizedApparelDetail = { ...apparel } as Partial<typeof apparel>
    if (!finalizedApparelDetail.garment_subcategory) {
      delete finalizedApparelDetail.garment_subcategory
    }
    if (finalizedApparelDetail.garment_category === "BOTTOM") {
      delete finalizedApparelDetail.sleeve_type
      delete finalizedApparelDetail.neck_type
    }

    const payload = {
      id: productId,
      title,
      handle,
      description,
      weight: Number(weight),
      variants: variantRows.map((v) => ({
        ...(v.id && { id: v.id }),
        title: v.title,
        sku: v.sku,
        inventory_quantity: v.inventoryQuantity ?? 0,
        manage_inventory: v.manageInventory ?? true,
        prices: [
          {
            amount: Math.round((v.price ?? 0) * 100),
            currency_code: (v.currencyCode || "usd").toLowerCase(),
          },
        ],
        options: v.options.map((o) => ({
          optionName: o.optionName,
          value: o.value,
        })),
        enabled: v.enabled,
      })),
      apparel_detail: finalizedApparelDetail,
    }
    console.log("Payload:", payload)
    try {
      const backendUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:9000"
          : `http://${window.location.hostname}:9000`
      const response = await fetch(
        `${backendUrl}/vendors/products/${productId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${resolvedToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
      if (!response.ok)
        throw new Error("Synchronization failure on complex metadata links.")
      router.push("/vendor/dashboard/products")
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error syncing edits.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center font-mono text-xs text-neutral-400 animate-pulse">
        Resolving operational layout...
      </div>
    )

  return (
    <form
      onSubmit={handleUpdate}
      className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6 shadow-xs"
    >
      {/* 01. IDENTITY */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
          01. Identity Matrix
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Product Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Route Slug Handle
            </label>
            <input
              type="text"
              required
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
              className="w-full px-4 py-2 border font-mono rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden transition-all"
            />
          </div>
        </div>
      </div>

      {/* 02. APPAREL CLASSIFICATION */}
      <ApparelDetailsSection value={apparel} onChange={setApparel} />

      {/* 03. VARIANT MATRIX COMPOSER */}
      <VariantMatrixBuilder
        category={apparel.garment_category}
        subcategory={apparel.garment_subcategory}
        initialOptions={builderOptions}
        onGenerate={handleGenerateVariants}
      />
      <VariantMatrixTable variants={variantRows} onChange={setVariantRows} />

      {/* ACTIONS */}
      <div className="pt-4 border-t flex justify-end gap-x-4">
        <button
          type="button"
          onClick={() => router.push("/vendor/dashboard/products")}
          className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
        >
          {isSubmitting
            ? "Syncing Global Profile Records..."
            : "Save Product Details"}
        </button>
      </div>
    </form>
  )
}
