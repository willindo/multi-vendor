"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"

import type {
  VariantCombination,
} from "@shared/index"

import { generateVariantCombinations } from "@shared/variants/variant-generator"
import { DEFAULT_APPAREL_DETAILS } from "@shared/apparel/apparel-defaults"
import type { ApparelDetails } from "@shared/apparel/apparel-types"
import ApparelDetailsSection from "@/components/vendor/products/apparel/ApparelDetailsSection"
import VariantMatrixBuilder from "@/components/vendor/products/VariantMatrixBuilder"
import VariantMatrixTable, {
  VariantMatrixRow,
} from "@/components/vendor/products/VariantMatrixTable"
import {
  resolveVendorToken,
  sanitizeSku,
  buildApparelPayload,
  buildProductOptionsPayload,
  buildVariantPayload,
  enrichVariantCombinations,
  validateVariantOptions,
  validateProductForm,
  getBackendUrl,
  getErrorMessage,
  ERROR_MESSAGES,
} from "@/lib/vendor/product-utils"

// Import from hydration
import {
  hydrateVariantRows,
  hydrateApparelDetails,
  hydrateFormState,
  hydrateCommerceFields,
  detectDeletedVariants,
  extractOriginalVariantIds,
} from "@/lib/vendor/product-hydration"

// ============================================================================
// TYPES
// ============================================================================
interface EditProductFormClientProps {
  initialProduct?: Product | null
  serverToken?: string
  productId?: string
  onSuccess?: (product: Product) => void
  onError?: (error: Error) => void
}

interface Product {
  id: string
  title: string
  handle: string
  description?: string
  status: string
  weight?: number
  thumbnail?: string
  type_id?: string | null
  collection_id?: string | null
  metadata?: Record<string, any>
  options?: ProductOption[]
  variants?: ProductVariant[]
  apparel_detail?: ApparelDetails
}

interface ProductOption {
  id: string
  title: string
  values: ProductOptionValue[]
}

interface ProductOptionValue {
  id: string
  value: string
}

interface ProductVariant {
  id: string
  title: string
  sku: string
  inventory_quantity: number
  manage_inventory: boolean
  currency_code: string
  prices: Array<{
    id: string
    amount: number
    currency_code: string
  }>
  options?: Array<{
    option_id: string
    option_value_id: string
    option_name: string
    value: string
  }>
}

// ============================================================================
// LOADING COMPONENT
// ============================================================================
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function EditProductFormClient({
  initialProduct,
  serverToken,
  productId: propProductId,
  onSuccess,
  onError,
}: EditProductFormClientProps) {
  const router = useRouter()
  const params = useParams()

  // Get product ID from props or URL params
  const productId = propProductId || (params?.productId as string)

  // --- STATE ---
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formTouched, setFormTouched] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // --- TOKEN MANAGEMENT ---
  const [resolvedToken, setResolvedToken] = useState<string>(() =>
    resolveVendorToken(serverToken)
  )

  useEffect(() => {
    if (!resolvedToken) {
      const token = resolveVendorToken()
      if (token) setResolvedToken(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- FORM STATE ---
  const [title, setTitle] = useState("")
  const [handle, setHandle] = useState("")
  const [description, setDescription] = useState("")
  const [priceAmount, setPriceAmount] = useState<number>(0)
  const [currencyCode, setCurrencyCode] = useState("USD")
  const [sku, setSku] = useState("")
  const [inventoryQuantity, setInventoryQuantity] = useState<number>(10)
  const [manageInventory, setManageInventory] = useState(true)
  const [weight, setWeight] = useState<number>(0)
  const [typeId, setTypeId] = useState<string | null>(null)
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [thumbnail, setThumbnail] = useState("")

  // --- APPAREL STATE ---
  const [apparel, setApparel] = useState<ApparelDetails>(() => {
    if (initialProduct?.apparel_detail) {
      return {
        ...DEFAULT_APPAREL_DETAILS,
        ...initialProduct.apparel_detail,
      }
    }
    return { ...DEFAULT_APPAREL_DETAILS }
  })

  // --- VARIANTS STATE ---
  const [variantRows, setVariantRows] = useState<VariantMatrixRow[]>([])
  const [originalVariantIds, setOriginalVariantIds] = useState<Set<string>>(new Set())

  // --- LOAD PRODUCT DATA ---
  useEffect(() => {
    console.log("📋 Starting product load...")
    console.log("📌 Product ID:", productId)
    console.log("🔑 Token present:", !!resolvedToken)
    if (!productId || !resolvedToken) return

    // ✅ FIXED: Add proper error handling for empty product
    const loadProduct = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const backendUrl = getBackendUrl()
        const endpoint = `${backendUrl}/vendors/products/${productId}`

        console.log(`🔍 Fetching product from: ${endpoint}`)

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${resolvedToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          let errorMessage = `Failed to load product (${response.status})`
          try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorMessage
          } catch (e) {
            // Ignore
          }

          if (response.status === 404) {
            throw new Error(`Product with ID "${productId}" not found.`)
          }

          throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log("📦 Product data received:", data)

        // ✅ The product is directly in the response
        const product = data.product || data

        if (!product || !product.id) {
          throw new Error("Invalid product data received")
        }

        console.log(`✅ Product found: ${product.title}`)

        // ✅ Hydrate form state using utilities
        const formState = hydrateFormState(product)
        setTitle(formState.title)
        setHandle(formState.handle)
        setDescription(formState.description || "")
        setWeight(formState.weight)
        setThumbnail(formState.thumbnail)
        setTypeId(formState.type_id)
        setCollectionId(formState.collection_id)

        // ✅ Hydrate apparel
        setApparel(formState.apparel)

        // ✅ Hydrate variants
        console.log(`📦 Variants: ${formState.variants.length}`)
        setVariantRows(formState.variants)

        // ✅ Store original variant IDs
        const ids = extractOriginalVariantIds(formState.variants)
        setOriginalVariantIds(ids)

        // ✅ Hydrate commerce fields
        const commerceFields = hydrateCommerceFields(product)
        setSku(commerceFields.sku)
        setInventoryQuantity(commerceFields.inventoryQuantity)
        setManageInventory(commerceFields.manageInventory)
        setPriceAmount(commerceFields.priceAmount)
        setCurrencyCode(commerceFields.currencyCode)

        setFormTouched(false)
        console.log(`✅ Product loaded successfully: ${product.title}`)

      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load product"
        console.error("❌ Load error:", message)
        setLoadError(message)
        if (onError) {
          onError(error instanceof Error ? error : new Error(message))
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadProduct()
  }, [productId, resolvedToken, onError])

  // --- MEMOIZED VALUES ---
  const apparelCategory = useMemo(() => apparel.garment_category, [apparel.garment_category])
  const apparelSubcategory = useMemo(() => apparel.garment_subcategory, [apparel.garment_subcategory])

  // --- SAFEGUARD: Auto-purge variants on taxonomy change ---
  useEffect(() => {
    if (variantRows.length > 0 && formTouched) {
      // Only clear if user has made changes (not initial load)
      setVariantRows([])
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

    // Only auto-generate handle if user hasn't manually edited it
    const autoHandle = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")

    // Check if handle was auto-generated from title before
    const wasAutoGenerated = handle && handle === title.toLowerCase().replace(/\s+/g, "-")

    if (!handle || wasAutoGenerated) {
      setHandle(autoHandle)
    }
  }, [handle, title])

  const handleGenerateVariants = useCallback(
    (combinations: VariantCombination[]) => {
      if (!combinations || combinations.length === 0) {
        setVariantRows([])
        return
      }

      const skuPrefix = handle?.trim() || "sku"

      const enrichedCombinations = combinations.map((combination) => {
        const derivedSku = combination.sku
          ? sanitizeSku(combination.sku)
          : sanitizeSku(`${skuPrefix}-${combination.title}`)

        return {
          ...combination,
          id: undefined, // New variants don't have IDs yet
          sku: derivedSku,
          price: combination.price ?? priceAmount,
          inventoryQuantity: combination.inventoryQuantity ?? inventoryQuantity,
          currencyCode: currencyCode.toLowerCase(),
          enabled: true,
        }
      })

      setVariantRows(enrichedCombinations)
      setFormTouched(true)
    },
    [handle, priceAmount, inventoryQuantity, currencyCode]
  )

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
      errors.push(`${invalidVariants.length} variant(s) have no options.`)
    }

    return { valid: errors.length === 0, errors }
  }, [variantRows])

  // --- DELETE HANDLER ---
  const handleDelete = useCallback(async () => {
    if (!productId) return

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`
    )

    if (!confirmDelete) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const backendUrl = getBackendUrl()

      const response = await fetch(`${backendUrl}/vendors/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete product (${response.status})`)
      }

      router.push("/vendor/dashboard/products")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete product"
      setSubmitError(message)
      if (onError) {
        onError(error instanceof Error ? error : new Error(message))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [productId, title, resolvedToken, router, onError])

  // --- SUBMIT HANDLER ---
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

      if (priceAmount <= 0) {
        setSubmitError("Please enter a valid price greater than 0.")
        setIsSubmitting(false)
        return
      }

      const validation = validateOptions()
      if (!validation.valid) {
        setSubmitError(validation.errors.join(" "))
        setIsSubmitting(false)
        return
      }

      // --- DETECT DELETED VARIANTS ---
      const deletedVariantIds = detectDeletedVariants(originalVariantIds, variantRows)

      // --- BUILD PAYLOAD ---
      const options = buildProductOptionsPayload(variantRows)

      // ✅ FIXED: Use correct property names
      const variants = buildVariantPayload(variantRows, {
        skuPrefix: handle?.trim() || "sku",  // ← Use skuPrefix
        defaultPrice: priceAmount,
        defaultCurrency: currencyCode,
        defaultInventory: inventoryQuantity,
        manageInventory,
      })

      const apparelDetail = buildApparelPayload(apparel)

      const payload = {
        title: title.trim(),
        handle: handle.toLowerCase().trim(),
        description: description.trim(),
        status: "published",
        weight: weight || 0,
        thumbnail: thumbnail || "",
        type_id: typeId,
        collection_id: collectionId,
        metadata: {
          vendor_id: resolvedToken ? "authenticated" : "pending",
          updated_from: "vendor_dashboard",
          source: "edit_product_form",
          updated_at: new Date().toISOString(),
        },
        options: options.map((option) => ({
          title: option.title,
          values: option.values,
        })),
        variants,
        apparel_detail: apparelDetail,
        deleted_variant_ids: deletedVariantIds,
      }

      // --- SUBMIT ---
      try {
        const backendUrl = getBackendUrl()

        const response = await fetch(`${backendUrl}/vendors/products/${productId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${resolvedToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          let errorData = {}
          try {
            errorData = await response.json()
          } catch {
            // Ignore JSON parse errors
          }

          const errorCode = (errorData as any)?.code || response.status.toString()
          const message = getErrorMessage(errorCode)

          if (response.status === 409) {
            throw new Error(`A product with the handle "${handle}" already exists. Please choose a different handle.`)
          }

          throw new Error(message)
        }

        const result = await response.json()

        if (onSuccess) {
          onSuccess(result.product)
        }

        router.push("/vendor/dashboard/products")
        router.refresh()
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unexpected error while updating product."
        setSubmitError(message)

        if (onError) {
          onError(error instanceof Error ? error : new Error(message))
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      title,
      handle,
      description,
      priceAmount,
      currencyCode,
      inventoryQuantity,
      manageInventory,
      weight,
      typeId,
      collectionId,
      thumbnail,
      apparel,
      variantRows,
      originalVariantIds,
      resolvedToken,
      productId,
      router,
      onSuccess,
      onError,
      validateOptions,
    ]
  )

  // --- LOADING STATE ---
  if (isLoading) {
    return <LoadingState />
  }

  // --- ERROR STATE ---
  if (loadError) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
        <div className="text-red-600 text-lg font-semibold mb-2">⚠️ Failed to Load Product</div>
        <p className="text-neutral-600 text-sm mb-4">{loadError}</p>
        <button
          onClick={() => router.push("/vendor/dashboard/products")}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm hover:bg-neutral-800 transition-colors"
        >
          Return to Products
        </button>
      </div>
    )
  }

  // --- RENDER ---
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6 shadow-xs"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Edit Product</h2>
          <p className="text-sm text-neutral-500">
            Editing: <span className="font-medium text-neutral-700">{title || "Untitled"}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
          <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
            ID: {productId?.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* 01. IDENTITY MATRIX */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
          01. Identity Matrix
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Product Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Raw Silk Hand-Weaved Kaftan"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Route Slug Handle *
            </label>
            <input
              type="text"
              required
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
              placeholder="raw-silk-hand-weaved-kaftan"
              className="w-full px-4 py-2 border font-mono rounded-lg text-xs focus:border-neutral-900 focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* 02. COMMERCE BASE */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
          02. Commerce Base
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Retail Price ($) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={priceAmount || ""}
              onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded-md text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Currency
            </label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full p-2 border rounded-md text-xs bg-white focus:outline-none"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              SKU
            </label>
            <input
              type="text"
              placeholder="SKU-REF"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full p-2 border rounded-md text-xs font-mono focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Stock Vol *
            </label>
            <input
              type="number"
              required
              min="0"
              value={inventoryQuantity}
              onChange={(e) =>
                setInventoryQuantity(parseInt(e.target.value) || 0)
              }
              className="w-full p-2 border rounded-md text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Manage Stock
            </label>
            <select
              value={manageInventory ? "true" : "false"}
              onChange={(e) => setManageInventory(e.target.value === "true")}
              className="w-full p-2 border rounded-md text-xs bg-white focus:outline-none"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Weight (g)
            </label>
            <input
              type="number"
              min="0"
              value={weight || ""}
              onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
              className="w-full p-2 border rounded-md text-xs focus:outline-none"
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
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
          04. Variant Matrix Builder
        </h3>
        <VariantMatrixBuilder
          category={apparel.garment_category}
          subcategory={apparel.garment_subcategory}
          initialOptions={variantRows.reduce((acc, v) => {
            if (v.options) {
              v.options.forEach(opt => {
                const existing = acc.find(o => o.name === opt.optionName)
                if (existing) {
                  if (!existing.values.includes(opt.value)) {
                    existing.values.push(opt.value)
                  }
                } else {
                  acc.push({ name: opt.optionName, values: [opt.value] })
                }
              })
            }
            return acc
          }, [] as Array<{ name: string; values: string[] }>)}
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
          disabled={isSubmitting || !title.trim() || !handle.trim() || priceAmount <= 0}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating Product...
            </>
          ) : (
            "Update Product"
          )}
        </button>
      </div>
    </form>
  )
}