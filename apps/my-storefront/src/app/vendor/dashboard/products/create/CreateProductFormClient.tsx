"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"

import type {
  VariantCombination,
} from "@shared/index"

import { DEFAULT_APPAREL_DETAILS } from "@shared/apparel/apparel-defaults"
import type { ApparelDetails } from "@shared/apparel/apparel-types"
import ApparelDetailsSection from "@/components/vendor/products/apparel/ApparelDetailsSection"
import VariantMatrixBuilder from "@/components/vendor/products/VariantMatrixBuilder"
import VariantMatrixTable, {
  VariantMatrixRow,
} from "@/components/vendor/products/VariantMatrixTable"
import { buildApparelPayload } from "@/lib/util/vendor/apparel"
import { buildProductOptionsPayload, buildVariantPayload } from "@/lib/util/vendor/product"
import { ERROR_MESSAGES, sanitizeSku } from "@/lib/util/vendor/validation"
import { createVendorProduct } from "@/lib/data/vendor/products"
import IdentityShellSection from "@/components/vendor/products/IdentityShellSection"

import { Product } from "@/lib/util/vendor/hydration"
// ============================================================================
// TYPES
// ============================================================================
interface CreateProductFormClientProps {
  serverToken?: string
  initialProduct?: Partial<Product>
  onSuccess?: (product: Product) => void
  onError?: (error: Error) => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CreateProductFormClient({
  serverToken,
  initialProduct,
  onSuccess,
  onError,
}: CreateProductFormClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formTouched, setFormTouched] = useState(false)
  // Root Product Shell States
  const [title, setTitle] = useState(initialProduct?.title || "")
  const [handle, setHandle] = useState(initialProduct?.handle || "")
  const [subtitle, setSubtitle] = useState(initialProduct?.subtitle || "")
  const [description, setDescription] = useState(initialProduct?.description || "")
  const [material, setMaterial] = useState(initialProduct?.material || "")
  const [originCountry, setOriginCountry] = useState(initialProduct?.origin_country || "")
  const [hsCode, setHsCode] = useState(initialProduct?.hs_code || "")
  const [status, setStatus] = useState(initialProduct?.status || "draft")
  const [priceAmount, setPriceAmount] = useState<number>(
    initialProduct?.variants?.[0]?.prices?.[0]?.amount ?
      initialProduct.variants[0].prices[0].amount / 100 : 0
  )
  const [currencyCode, setCurrencyCode] = useState(
    initialProduct?.variants?.[0]?.prices?.[0]?.currency_code?.toUpperCase() || "USD"
  )
  const [sku, setSku] = useState(initialProduct?.variants?.[0]?.sku || "")
  const [inventoryQuantity, setInventoryQuantity] = useState<number>(
    initialProduct?.variants?.[0]?.inventory_quantity || 10
  )
  const [manageInventory, setManageInventory] = useState(
    initialProduct?.variants?.[0]?.manage_inventory !== undefined ?
      initialProduct.variants[0].manage_inventory : true
  )
  const [weight, setWeight] = useState<number>(initialProduct?.weight || 0)
  const [typeId, setTypeId] = useState<string | null>(initialProduct?.type_id || null)
  const [collectionId, setCollectionId] = useState<string | null>(
    initialProduct?.collection_id || null
  )

  // --- APPAREL STATE ---
  const [apparel, setApparel] = useState<ApparelDetails>({
    ...DEFAULT_APPAREL_DETAILS,
    ...(initialProduct?.apparel_detail || {}),
  })

  // --- VARIANTS STATE ---
  const [variantRows, setVariantRows] = useState<VariantMatrixRow[]>([])

  // --- MEMOIZED VALUES ---
  const apparelCategory = useMemo(() => apparel.garment_category, [apparel.garment_category])
  const apparelSubcategory = useMemo(() => apparel.garment_subcategory, [apparel.garment_subcategory])

  // --- SAFEGUARD: Auto-purge variants on taxonomy change ---
  useEffect(() => {
    if (variantRows.length > 0) {
      setVariantRows([])
      setFormTouched(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apparelCategory, apparelSubcategory])

  // --- HANDLERS ---

  const handleHandleChange = useCallback((val: string) => {
    const cleanSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
    setHandle(cleanSlug)
    setFormTouched(true)
  }, [])

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    setFormTouched(true)

    if (!handle || handle === title.toLowerCase().replace(/\s+/g, "-")) {
      const autoHandle = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
      setHandle(autoHandle)
    }
  }, [handle, title])

  // Non-destructive append variant generator
  const handleGenerateVariants = useCallback(
    (combinations: VariantCombination[]) => {
      if (!combinations || combinations.length === 0) return

      const skuPrefix = handle?.trim() || "sku"

      setVariantRows((prevRows) => {
        const existingSkus = new Set(prevRows.map((r) => r.sku))

        const newlyAppended = combinations
          .map((combination) => {
            const derivedSku = combination.sku
              ? sanitizeSku(combination.sku)
              : sanitizeSku(`${skuPrefix}-${combination.title}`)

            return {
              ...combination,
              id: undefined,
              sku: derivedSku,
              price: combination.price ?? (priceAmount > 0 ? priceAmount : 0),
              inventoryQuantity: combination.inventoryQuantity ?? inventoryQuantity,
              currencyCode: currencyCode.toLowerCase(),
              enabled: true,
            }
          })
          .filter((row) => !existingSkus.has(row.sku))

        return [...prevRows, ...newlyAppended]
      })

      setFormTouched(true)
    },
    [handle, priceAmount, inventoryQuantity, currencyCode]
  )

  const validateOptions = useCallback((): {
    valid: boolean
    errors: string[]
  } => {
    const errors: string[] = []

    if (!variantRows.length) {
      errors.push("At least one variant is required.")
      return {
        valid: false,
        errors,
      }
    }

    for (const [index, variant] of variantRows.entries()) {
      if (!variant.options || variant.options.length === 0) {
        errors.push(`Variant ${index + 1} has no options.`)
        continue
      }

      for (const option of variant.options) {
        if (!option.optionName?.trim()) {
          errors.push(`Variant ${index + 1} has an option without a name.`)
        }

        if (!option.value?.trim()) {
          errors.push(
            `Variant ${index + 1} has an option without a value.`
          )
        }
      }
    }

    const options = buildProductOptionsPayload(variantRows)

    if (options.length === 0) {
      errors.push("Please generate at least one variant option.")
    }

    for (const option of options) {
      if (!option.title.trim()) {
        errors.push("An option is missing its name.")
      }

      if (option.values.length === 0) {
        errors.push(`Option "${option.title}" has no values.`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }, [variantRows])

  // ✅ FIXED: Submit handler with correct config
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setFormTouched(true)
      setIsSubmitting(true)
      setSubmitError(null)

      // --- VALIDATION ---
      if (!title.trim()) {
        setSubmitError("Please enter a product title.")
        setIsSubmitting(false)
        return
      }

      if (!handle.trim()) {
        setSubmitError("Please enter a product handle/slug.")
        setIsSubmitting(false)
        return
      }

      const hasValidPricing = priceAmount > 0 ||
        (variantRows.length > 0 && variantRows.every(v => !v.enabled || (v.price && v.price > 0)));

      if (!hasValidPricing) {
        setSubmitError("Please configure a valid retail price or ensure all enabled variants have a price configured.");
        setIsSubmitting(false);
        return;
      }

      const validation = validateOptions()
      if (!validation.valid) {
        setSubmitError(validation.errors.join(" "))
        setIsSubmitting(false)
        return
      }

      // --- BUILD PAYLOAD ---
      const options = buildProductOptionsPayload(variantRows)

      const variants = buildVariantPayload(variantRows, {
        defaultCurrency: currencyCode,
      })
      const apparelDetail = buildApparelPayload(apparel)

      const payload = {
        title: title.trim(),
        handle: handle.toLowerCase().trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        material: material.trim() || undefined,
        origin_country: originCountry.trim() || undefined,
        hs_code: hsCode.trim() || undefined,
        status,
        metadata: {
          // vendor_id: resolvedToken ? "authenticated" : "pending",
          created_from: "vendor_dashboard",
          source: "create_product_form",
          timestamp: new Date().toISOString(),
          ...(initialProduct?.metadata || {}),
        },
        options,
        variants,
        apparel_detail: apparelDetail,
      }

      console.log(
        "[Client] Submitting Product Payload:\n",
        JSON.stringify(payload, null, 2)
      );
      // --- SUBMIT ---
      try {

        const result = await createVendorProduct(payload)

        if (!result.success) {
          console.error("[Client] Product Creation Failed with error:", result.error);
          throw new Error(result.error)
        }
        console.log("[Client] Product Creation Success:", result.product);
        if (onSuccess) {
          onSuccess(result.product)
        }
        router.push("/vendor/dashboard/products")
        router.refresh()
      } catch (error) {
        console.error("[Client] Form Submission Catch:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Unexpected error while creating product."
        setSubmitError(message)

        if (onError) {
          onError(error instanceof Error ? error : new Error(message))
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      title, handle, subtitle, description, material, originCountry, hsCode, status,
      priceAmount,
      currencyCode,
      inventoryQuantity,
      manageInventory,
      weight,
      typeId,
      collectionId,
      apparel,
      variantRows,
      router,
      onSuccess,
      onError,
      validateOptions,
    ]
  )

  // --- RENDER ---
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6 shadow-xs"
    >
      {/* 01. PRODUCT SHELL IDENTITY & LOGISTICS */}
      <IdentityShellSection
        category={apparel.garment_category}
        subcategory={apparel.garment_subcategory}
        title={title}
        setTitle={setTitle}
        handle={handle}
        setHandle={setHandle}
        subtitle={subtitle}
        setSubtitle={setSubtitle}
        description={description}
        setDescription={setDescription}
        material={material}
        setMaterial={setMaterial}
        originCountry={originCountry}
        setOriginCountry={setOriginCountry}
        hsCode={hsCode}
        setHsCode={setHsCode}
        status={status}
        setStatus={setStatus}
        isTouched={formTouched}
        setIsTouched={setFormTouched}
      />

      {/* 03. APPAREL DETAILS */}
      <ApparelDetailsSection
        value={apparel}
        onChange={(newApparel) => {
          setApparel(newApparel)
          setFormTouched(true)
        }}
      />

      {/* 04. VARIANT MATRIX BUILDER */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
          04. Variant Matrix Builder
        </h3>
        <VariantMatrixBuilder
          category={apparel.garment_category}
          subcategory={apparel.garment_subcategory}
          onGenerate={handleGenerateVariants}
        />
      </div>

      {/* 05. VARIANT MATRIX TABLE */}
      {variantRows.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
            05. Variant Matrix Table ({variantRows.length} combinations)
          </h3>
          <VariantMatrixTable
            variants={variantRows}
            onChange={(updatedVariants) => {
              setVariantRows(updatedVariants)
              setFormTouched(true)
            }}
          />
        </div>
      )}

      {/* 06. COPYWRITING */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
          06. Product Copy
        </h3>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setFormTouched(true)
          }}
          rows={4}
          placeholder="Describe production origin, extraction compound references, and structural weave details..."
          className="w-full p-4 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none"
        />
      </div>

      {/* 07. INLINE ERROR STATE */}
      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <span className="font-semibold">Error: </span>
          {submitError}
        </div>
      )}

      {/* 08. FORM TOUCHED INDICATOR */}
      {formTouched && variantRows.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-700">
          ⚠️ You haven't generated any variants yet. Generate variants before publishing.
        </div>
      )}

      {/* 09. SYSTEM FOOTER ACTIONS */}
      <div className="pt-4 border-t flex justify-end gap-x-4">
        <button
          type="button"
          onClick={() => router.push("/vendor/dashboard/products")}
          className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-neutral-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !handle.trim()}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Complete Profile Entry...
            </>
          ) : (
            "Publish Full Composition"
          )}
        </button>
      </div>
    </form>
  )
}