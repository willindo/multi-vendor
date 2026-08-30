"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"

import type { VariantCombination } from "@shared/index"
import { DEFAULT_APPAREL_DETAILS } from "@shared/apparel/apparel-defaults"
import type { ApparelDetails } from "@shared/apparel/apparel-types"

import IdentityShellSection from "@/components/vendor/products/IdentityShellSection"
import ApparelDetailsSection from "@/components/vendor/products/apparel/ApparelDetailsSection"
import VariantMatrixBuilder from "@/components/vendor/products/VariantMatrixBuilder"
import VariantMatrixTable, {
  VariantMatrixRow,
} from "@/components/vendor/products/VariantMatrixTable"

import { buildApparelPayload } from "@/lib/util/vendor/apparel"
import { buildProductOptionsPayload, buildVariantPayload } from "@/lib/util/vendor/product"
import { ERROR_MESSAGES, sanitizeSku } from "@/lib/util/vendor/validation"
import {
  getVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
} from "@/lib/data/vendor/products"
import type {
  Product,
} from "@/lib/util/vendor/hydration"
import {
  hydrateFormState,
  hydrateCommerceFields,
  extractOriginalVariantIds,
  detectDeletedVariants,
} from "@/lib/util/vendor/hydration"

export interface EditProductFormClientProps {
  serverToken?: string
  initialProduct?: Product | null
  productId?: string
  onSuccess?: (product: Product) => void
  onError?: (error: Error) => void
}

// LOADING COMPONENT
function LoadingState() {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-12 bg-neutral-200 rounded"></div>
        <div className="h-12 bg-neutral-200 rounded"></div>
      </div>
      <div className="h-32 bg-neutral-200 rounded"></div>
      <div className="h-64 bg-neutral-200 rounded"></div>
    </div>
  )
}

// MAIN COMPONENT
export default function EditProductFormClient({
  serverToken,
  initialProduct,
  productId: propProductId,
  onSuccess,
  onError,
}: EditProductFormClientProps) {
  const router = useRouter()
  const params = useParams()

  const productId = propProductId || (params?.id as string) || (params?.productId as string) || initialProduct?.id || ""

  // Synchronously compute initial form values if initialProduct exists
  const initialFormState = useMemo(() => {
    if (!initialProduct) return null
    return hydrateFormState(initialProduct)
  }, [initialProduct])

  const initialCommerceState = useMemo(() => {
    if (!initialProduct) return null
    return hydrateCommerceFields(initialProduct)
  }, [initialProduct])

  // --- CONTROLS STATE ---
  const [isLoading, setIsLoading] = useState<boolean>(!initialProduct && !!productId)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formTouched, setFormTouched] = useState<boolean>(false)

  // --- PRODUCT SHELL STATE ---
  const [title, setTitle] = useState<string>(initialFormState?.title || "")
  const [handle, setHandle] = useState<string>(initialFormState?.handle || "")
  const [subtitle, setSubtitle] = useState<string>(initialProduct?.subtitle || "")
  const [description, setDescription] = useState<string>(initialFormState?.description || "")
  const [material, setMaterial] = useState<string>(initialProduct?.material || "")
  const [originCountry, setOriginCountry] = useState<string>(initialProduct?.origin_country || "")
  const [hsCode, setHsCode] = useState<string>(initialProduct?.hs_code || "")
  const [status, setStatus] = useState<string>(initialProduct?.status || "published")

  // --- COMMERCE & LOGISTICS STATE ---
  const [priceAmount, setPriceAmount] = useState<number>(initialCommerceState?.priceAmount || 0)
  const [currencyCode, setCurrencyCode] = useState<string>(initialCommerceState?.currencyCode || "INR")
  const [sku, setSku] = useState<string>(initialCommerceState?.sku || "")
  const [inventoryQuantity, setInventoryQuantity] = useState<number>(initialCommerceState?.inventoryQuantity ?? 10)
  const [manageInventory, setManageInventory] = useState<boolean>(initialCommerceState?.manageInventory ?? true)
  const [weight, setWeight] = useState<number>(initialFormState?.weight || 0)
  const [typeId, setTypeId] = useState<string | null>(initialFormState?.type_id || null)
  const [collectionId, setCollectionId] = useState<string | null>(initialFormState?.collection_id || null)
  const [thumbnail, setThumbnail] = useState<string>(initialFormState?.thumbnail || "")

  // --- APPAREL STATE ---
  const [apparel, setApparel] = useState<ApparelDetails>(() => {
    const rawApparel = initialProduct?.apparel_detail || initialProduct?.apparel_details
    if (rawApparel) {
      return {
        ...DEFAULT_APPAREL_DETAILS,
        ...rawApparel,
      }
    }
    return { ...DEFAULT_APPAREL_DETAILS }
  })

  // --- VARIANTS STATE ---
  const [variantRows, setVariantRows] = useState<VariantMatrixRow[]>(initialFormState?.variants || [])
  const [originalVariantIds, setOriginalVariantIds] = useState<Set<string>>(() =>
    initialFormState ? extractOriginalVariantIds(initialFormState.variants) : new Set()
  )

  // --- LOAD & HYDRATE PRODUCT DATA (Client Fetch Fallback) ---
  useEffect(() => {
    // If initialProduct was supplied by SSR/RSC, hydration is complete.
    if (initialProduct || !productId) return

    let isMounted = true

    const loadProduct = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const product = await getVendorProduct(productId)
        if (!product || !product.id) {
          throw new Error(`Product with ID "${productId}" not found.`)
        }

        if (!isMounted) return

        const formState = hydrateFormState(product, currencyCode)
        const commerceFields = hydrateCommerceFields(product, currencyCode)

        setTitle(formState.title)
        setHandle(formState.handle)
        setSubtitle(product.subtitle || "")
        setDescription(formState.description || "")
        setMaterial(product.material || "")
        setOriginCountry(product.origin_country || "")
        setHsCode(product.hs_code || "")
        setStatus(product.status || "published")
        setWeight(formState.weight)
        setThumbnail(formState.thumbnail)
        setTypeId(formState.type_id)
        setCollectionId(formState.collection_id)

        setApparel(formState.apparel)

        setVariantRows(formState.variants)
        setOriginalVariantIds(extractOriginalVariantIds(formState.variants))

        setSku(commerceFields.sku)
        setInventoryQuantity(commerceFields.inventoryQuantity)
        setManageInventory(commerceFields.manageInventory)
        setPriceAmount(commerceFields.priceAmount)
        setCurrencyCode(commerceFields.currencyCode)

        setFormTouched(false)
      } catch (error: any) {
        if (!isMounted) return
        const message = error instanceof Error ? error.message : "Failed to load product"
        setLoadError(message)
        onError?.(error instanceof Error ? error : new Error(message))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadProduct()

    return () => {
      isMounted = false
    }
  }, [productId, currencyCode, initialProduct, onError])

  // --- MEMOIZED DERIVED VALUES ---
  const apparelCategory = useMemo(() => apparel.garment_category, [apparel.garment_category])
  const apparelSubcategory = useMemo(() => apparel.garment_subcategory, [apparel.garment_subcategory])

  // Initial options extraction for VariantMatrixBuilder
  const initialBuilderOptions = useMemo(() => {
    return variantRows.reduce((acc, v) => {
      if (v.options) {
        v.options.forEach((opt) => {
          const rawName = opt.optionName || ""
          if (!rawName) return

          const existing = acc.find(
            (o) => o.name.toUpperCase() === rawName.toUpperCase()
          )
          if (existing) {
            if (!existing.values.includes(opt.value)) {
              existing.values.push(opt.value)
            }
          } else {
            acc.push({ name: rawName, values: [opt.value] })
          }
        })
      }
      return acc
    }, [] as Array<{ name: string; values: string[] }>)
  }, [variantRows])

  // Clear variant matrix if user changes classification taxonomy after form touch
  useEffect(() => {
    if (variantRows.length > 0 && formTouched) {
      setVariantRows([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apparelCategory, apparelSubcategory])

  // --- MATRIX BUILDER HANDLER ---
  const handleGenerateVariants = useCallback(
    (combinations: VariantCombination[]) => {
      if (!combinations || combinations.length === 0) return

      const skuPrefix = handle?.trim() || "sku"
      setVariantRows((prevRows) => {
        const existingSkus = new Set(prevRows.map((r) => r.sku?.toLowerCase()))
        const existingTitles = new Set(prevRows.map((r) => r.title?.toLowerCase()))

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
          .filter(
            (row) =>
              !existingSkus.has(row.sku?.toLowerCase()) &&
              !existingTitles.has(row.title?.toLowerCase())
          )

        return [...prevRows, ...newlyAppended]
      })

      setFormTouched(true)
    },
    [handle, priceAmount, inventoryQuantity, currencyCode]
  )

  // --- VALIDATION ---
  const validateOptions = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    const options = buildProductOptionsPayload(variantRows)

    if (options.length === 0) {
      errors.push("Please generate at least one variant option.")
    }

    options.forEach((option) => {
      if (option.values.length === 0) {
        errors.push(`Option "${option.title}" has no values selected.`)
      }
    })

    const invalidVariants = variantRows.filter(
      (v) => !v.options || v.options.length === 0
    )
    if (invalidVariants.length > 0) {
      errors.push(`${invalidVariants.length} variant(s) have no options configured.`)
    }

    return { valid: errors.length === 0, errors }
  }, [variantRows])

  // --- DELETE HANDLER ---
  const handleDelete = useCallback(async () => {
    if (!productId) return

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${title || "this product"}"? This action cannot be undone.`
    )
    if (!confirmDelete) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await deleteVendorProduct(productId)
      if (!result.success) {
        throw new Error(result.error || "Failed to delete product")
      }
      router.push("/vendor/dashboard/products")
      router.refresh()
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Failed to delete product"
      setSubmitError(message)
      onError?.(error instanceof Error ? error : new Error(message))
    } finally {
      setIsSubmitting(false)
    }
  }, [productId, title, router, onError])

  // --- SUBMIT HANDLER ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setFormTouched(true)
      setIsSubmitting(true)
      setSubmitError(null)

      if (!title.trim()) {
        setSubmitError(ERROR_MESSAGES.PRODUCT_TITLE_REQUIRED)
        setIsSubmitting(false)
        return
      }
      if (!handle.trim()) {
        setSubmitError("Please enter a product handle/slug.")
        setIsSubmitting(false)
        return
      }

      const hasValidPricing =
        priceAmount > 0 ||
        (variantRows.length > 0 &&
          variantRows.every((v) => !v.enabled || (v.price && v.price > 0)))

      if (!hasValidPricing) {
        setSubmitError(
          "Please configure a valid retail price or ensure all enabled variants have a price configured."
        )
        setIsSubmitting(false)
        return
      }

      const validation = validateOptions()
      if (!validation.valid) {
        setSubmitError(validation.errors.join(" "))
        setIsSubmitting(false)
        return
      }

      const deletedVariantIds = detectDeletedVariants(originalVariantIds, variantRows)
      const optionsPayload = buildProductOptionsPayload(variantRows)
      const baseVariants = buildVariantPayload(variantRows, {
        fallbackPrice: priceAmount,
        fallbackCurrency: currencyCode,
        fallbackInventory: inventoryQuantity,
        fallbackManageInventory: manageInventory,
        fallbackSku: sku,
      })

      const apparelDetailPayload = buildApparelPayload(apparel)

      const payload = {
        title: title.trim(),
        handle: handle.toLowerCase().trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        material: material.trim() || undefined,
        origin_country: originCountry.trim() || undefined,
        hs_code: hsCode.trim() || undefined,
        status,
        weight: Number(weight) || 0,
        thumbnail: thumbnail || "",
        type_id: typeId,
        collection_id: collectionId,
        metadata: {
          updated_from: "vendor_dashboard",
          source: "edit_product_form",
          updated_at: new Date().toISOString(),
        },
        options: optionsPayload,
        variants: baseVariants,
        apparel_detail: apparelDetailPayload, // Matches backend endpoint schema expectation
        deleted_variant_ids: Array.from(deletedVariantIds),
      }

      try {
        const result = await updateVendorProduct(productId, payload)
        if (!result.success) {
          throw new Error(result.error || ERROR_MESSAGES.UPDATE_FAILED)
        }

        if (onSuccess) {
          // Standardize returned product to strictly match the Product type interface
          const updatedProduct: Product = result.product
            ? (result.product as Product)
            : {
              ...(initialProduct ?? {}),
              ...payload,
              id: productId,
              options: payload.options.map((opt, idx) => ({
                id: opt.title,
                title: opt.title,
                values: opt.values.map((v, vIdx) => ({
                  id: `${idx}-${vIdx}`,
                  value: v,
                })),
              })),
              variants: (payload.variants as any) || [],
              apparel_details: apparelDetailPayload as ApparelDetails,
              apparel_detail: apparelDetailPayload as ApparelDetails,
            }

          onSuccess(updatedProduct)
        }

        router.push("/vendor/dashboard/products")
        router.refresh()
      } catch (error: any) {
        const message =
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.UNKNOWN
        setSubmitError(message)
        onError?.(error instanceof Error ? error : new Error(message))
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      title,
      handle,
      subtitle,
      description,
      material,
      originCountry,
      hsCode,
      status,
      priceAmount,
      currencyCode,
      inventoryQuantity,
      manageInventory,
      sku,
      weight,
      thumbnail,
      typeId,
      collectionId,
      apparel,
      variantRows,
      originalVariantIds,
      validateOptions,
      productId,
      initialProduct,
      onSuccess,
      onError,
      router,
    ]
  )

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  // --- ERROR STATE ---
  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl space-y-4">
        <div>
          <h4 className="font-bold text-sm">Failed to Load Product</h4>
          <p className="text-xs mt-1">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/vendor/dashboard/products")}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg transition-colors"
        >
          Return to Products
        </button>
      </div>
    )
  }

  // --- RENDER FORM ---
  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6 shadow-xs">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Editing: <span className="font-medium text-neutral-700">{title || "Untitled"}</span>
          </h2>
          <p className="text-xs text-neutral-400 font-mono">
            ID: {productId?.slice(0, 8)}..
          </p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          Delete Product
        </button>
      </div>

      {/* 01. IDENTITY MATRIX & SHELL DEFAULTS */}
      <IdentityShellSection
        category={apparelCategory}
        subcategory={apparelSubcategory}
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

      {/* 02. COMMERCE BASE */}
      <div className="space-y-4 bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-2">
          02. Commerce Base
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Retail Price *
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={priceAmount || ""}
              onChange={(e) => {
                setPriceAmount(parseFloat(e.target.value) || 0)
                setFormTouched(true)
              }}
              className="w-full px-3 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Currency
            </label>
            <select
              value={currencyCode}
              onChange={(e) => {
                setCurrencyCode(e.target.value)
                setFormTouched(true)
              }}
              className="w-full px-3 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none bg-white"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              SKU
            </label>
            <input
              type="text"
              placeholder="SKU-REF"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value)
                setFormTouched(true)
              }}
              className="w-full px-3 py-2 border font-mono rounded-lg text-xs focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Stock Vol *
            </label>
            <input
              type="number"
              required
              min="0"
              value={inventoryQuantity}
              onChange={(e) => {
                setInventoryQuantity(parseInt(e.target.value) || 0)
                setFormTouched(true)
              }}
              className="w-full px-3 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Manage Stock
            </label>
            <select
              value={manageInventory ? "true" : "false"}
              onChange={(e) => {
                setManageInventory(e.target.value === "true")
                setFormTouched(true)
              }}
              className="w-full px-3 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none bg-white"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              Weight (g)
            </label>
            <input
              type="number"
              min="0"
              value={weight || ""}
              onChange={(e) => {
                setWeight(parseInt(e.target.value) || 0)
                setFormTouched(true)
              }}
              className="w-full px-3 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 03. APPAREL DETAILS */}
      <ApparelDetailsSection
        value={apparel || DEFAULT_APPAREL_DETAILS}
        onChange={(newApparel) => {
          setApparel(newApparel)
          setFormTouched(true)
        }}
      />

      {/* 04. VARIANT MATRIX BUILDER */}
      <div className="space-y-4">
        <VariantMatrixBuilder
          category={apparel.garment_category}
          subcategory={apparel.garment_subcategory}
          // sizingGroup={apparel.sizing_group}
          initialOptions={initialBuilderOptions}
          onGenerate={handleGenerateVariants}
        />
      </div>

      {/* 05. VARIANT MATRIX TABLE */}
      {variantRows.length > 0 && (
        <div className="space-y-4">
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
      <div className="space-y-2 bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-2">
          06. Product Copy
        </h3>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setFormTouched(true)
          }}
          rows={4}
          placeholder="Detailed product information, care instructions, and sizing notes..."
          className="w-full p-3 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none"
        />
      </div>

      {/* 07. INLINE ERROR STATE */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {submitError}
        </div>
      )}

      {/* 08. FORM TOUCHED INDICATOR */}
      {formTouched && variantRows.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg font-medium">
          ⚠️ You haven't generated any variants yet. Generate variants before publishing.
        </div>
      )}

      {/* 09. SYSTEM FOOTER ACTIONS */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
        <button
          type="button"
          onClick={() => router.push("/vendor/dashboard/products")}
          disabled={isSubmitting}
          className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !handle.trim()}
          className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Updating Product..." : "Update Product"}
        </button>
      </div>
    </form>
  )
}