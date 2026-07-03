// ./src/lib/util/product-utils.ts
// or ./src/lib/vendor/product-utils.ts

import type { VariantMatrixRow } from "@/components/vendor/products/VariantMatrixTable"
import type { ApparelDetails } from "@shared/apparel/apparel-types"
import type { VariantCombination } from "@shared/index"

// ============================================================================
// TYPES
// ============================================================================

export interface ProductVariantPayload {
    id?: string
    title: string
    sku: string
    inventory_quantity: number
    manage_inventory: boolean
    currency_code: string
    prices: Array<{
        id?: string
        amount: number
        currency_code: string
    }>
    options: Array<{
        option_name: string
        value: string
    }>
}

export interface ProductOptionPayload {
    title: string
    values: string[]
}

export interface VariantGenerationConfig {
    skuPrefix: string
    defaultSku?: string
    defaultHandle?: string
    defaultPrice: number
    defaultCurrency: string
    defaultInventory: number
    manageInventory: boolean
}

// ============================================================================
// TOKEN UTILITIES
// ============================================================================

/**
 * Resolve vendor JWT from multiple sources
 * Priority: SSR token → cookie → localStorage
 */
export function resolveVendorToken(serverToken?: string): string {
    if (serverToken) return serverToken
    if (typeof window === "undefined") return ""

    const cookieToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("medusa_vendor_jwt="))
        ?.split("=")[1]

    return cookieToken || localStorage.getItem("vendor_token") || ""
}

// ============================================================================
// SKU UTILITIES
// ============================================================================

/**
 * Sanitize a raw string into a URL-safe SKU segment
 */
export function sanitizeSku(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/\s*\/\s*/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
}

/**
 * Generate a SKU from handle and title
 */
export function generateSku(handle: string, title: string): string {
    return sanitizeSku(`${handle}-${title}`)
}

// ============================================================================
// APPAREL UTILITIES
// ============================================================================

/**
 * Build apparel payload with category-specific cleanup
 */
export function buildApparelPayload(apparel: ApparelDetails): Partial<ApparelDetails> {
    const payload: Partial<ApparelDetails> = { ...apparel }

    // Remove empty subcategory
    if (!payload.garment_subcategory) {
        delete payload.garment_subcategory
    }

    // BOTTOM garments have no sleeve/neck construction fields
    if (payload.garment_category === "BOTTOM") {
        delete payload.sleeve_type
        delete payload.neck_type
    }

    // Remove undefined fields
    Object.keys(payload).forEach((key) => {
        if (payload[key as keyof ApparelDetails] === undefined) {
            delete payload[key as keyof ApparelDetails]
        }
    })

    return payload
}

// ============================================================================
// OPTIONS UTILITIES
// ============================================================================

/**
 * Build product options payload from variant rows
 */
export function buildProductOptionsPayload(
    variantRows: VariantMatrixRow[]
): ProductOptionPayload[] {
    const map = new Map<string, Set<string>>()

    variantRows.forEach((v) => {
        if (!v.options) return
        v.options.forEach((option) => {
            const canonicalName = option.optionName.toUpperCase()
            if (!map.has(canonicalName)) {
                map.set(canonicalName, new Set())
            }
            map.get(canonicalName)!.add(option.value)
        })
    })

    return Array.from(map.entries())
        .filter(([_, values]) => values.size > 0)
        .map(([title, values]) => ({
            title,
            values: Array.from(values).filter(v => v.trim()),
        }))
}

/**
 * Extract options from variant rows in the format expected by VariantMatrixBuilder
 */
export function extractInitialOptions(variantRows: VariantMatrixRow[]): Array<{ name: string; values: string[] }> {
    const map = new Map<string, Set<string>>()

    variantRows.forEach((v) => {
        if (!v.options) return
        v.options.forEach((option) => {
            const key = option.optionName
            if (!map.has(key)) {
                map.set(key, new Set())
            }
            map.get(key)!.add(option.value)
        })
    })

    return Array.from(map.entries()).map(([name, values]) => ({
        name,
        values: Array.from(values),
    }))
}

// ============================================================================
// VARIANT UTILITIES
// ============================================================================

/**
 * Build variant payload for API submission (Create/Update)
 */

export function buildVariantPayload(
    variantRows: VariantMatrixRow[],
    config: VariantGenerationConfig
): ProductVariantPayload[] {
    // Use skuPrefix for SKU generation
    const skuPrefix = config.skuPrefix || config.defaultHandle || "sku"

    if (variantRows.length === 0) {
        return [
            {
                id: undefined,
                title: "Default Variant",
                sku: config.defaultSku || `${skuPrefix}-default`,
                inventory_quantity: config.defaultInventory || 0,
                manage_inventory: config.manageInventory,
                currency_code: config.defaultCurrency.toLowerCase(),
                prices: [
                    {
                        id: undefined,
                        amount: Math.round((config.defaultPrice || 0) * 100),
                        currency_code: config.defaultCurrency.toLowerCase(),
                    },
                ],
                options: [],
            },
        ]
    }

    return variantRows
        .filter((v) => v.enabled !== false)
        .map((v) => ({
            id: (v as any).id,
            title: v.title,
            sku: v.sku || config.defaultSku || generateSku(skuPrefix, v.title),
            inventory_quantity: v.inventoryQuantity ?? config.defaultInventory ?? 0,
            manage_inventory: config.manageInventory,
            currency_code: (v.currencyCode || config.defaultCurrency).toLowerCase(),
            prices: [
                {
                    id: (v as any).priceId,
                    amount: Math.round((v.price ?? config.defaultPrice ?? 0) * 100),
                    currency_code: (v.currencyCode || config.defaultCurrency).toLowerCase(),
                },
            ],
            options: v.options?.map((opt) => ({
                option_name: opt.optionName,
                value: opt.value,
            })) || [],
        }))
}

/**
 * Enrich variant combinations with default values
 */
export function enrichVariantCombinations(
    combinations: VariantCombination[],
    config: {
        skuPrefix: string
        defaultPrice: number
        defaultCurrency: string
        defaultInventory: number
    }
): VariantMatrixRow[] {
    if (!combinations || combinations.length === 0) {
        return []
    }

    return combinations.map((combination) => ({
        ...combination,
        id: undefined,
        sku: combination.sku
            ? sanitizeSku(combination.sku)
            : generateSku(config.skuPrefix, combination.title),
        price: combination.price ?? config.defaultPrice,
        inventoryQuantity: combination.inventoryQuantity ?? config.defaultInventory,
        currencyCode: config.defaultCurrency.toLowerCase(),
        enabled: true,
    }))
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate variant options
 */
export function validateVariantOptions(
    variantRows: VariantMatrixRow[]
): { valid: boolean; errors: string[] } {
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
}

/**
 * Validate product form fields
 */
export function validateProductForm(data: {
    title: string
    handle: string
    priceAmount: number
}): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.title?.trim()) {
        errors.push("Please enter a product title.")
    }

    if (!data.handle?.trim()) {
        errors.push("Please enter a product handle/slug.")
    }

    if (data.priceAmount <= 0) {
        errors.push("Please enter a valid price greater than 0.")
    }

    return { valid: errors.length === 0, errors }
}

// ============================================================================
// MISC UTILITIES
// ============================================================================

// ./src/lib/vendor/product-utils.ts

/**
 * ✅ FIXED: Get backend URL with fallback
 */
export function getBackendUrl(): string {
    if (typeof window === "undefined") {
        return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    }

    // Handle different environments
    const hostname = window.location.hostname
    const port = process.env.NEXT_PUBLIC_API_PORT || "9000"

    // For local development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `http://localhost:${port}`
    }

    // For production/staging
    return `http://${hostname}:${port}`
}

/**
 * Create metadata object for product
 */
export function createProductMetadata(
    source: "create_product_form" | "edit_product_form",
    token?: string
): Record<string, any> {
    return {
        vendor_id: token ? "authenticated" : "pending",
        source,
        timestamp: new Date().toISOString(),
    }
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES: Record<string, string> = {
    "400": "Invalid product data. Please check all required fields.",
    "401": "Authentication expired. Please log in again.",
    "403": "You don't have permission to perform this action.",
    "404": "Product not found.",
    "409": "A product with this handle already exists. Please choose a different handle.",
    "422": "Validation failed. Please check your input.",
    "500": "Server error. Please try again later.",
    default: "An unexpected error occurred. Please try again.",
}

/**
 * Get error message for a status code
 */
export function getErrorMessage(status: number | string, customMessage?: string): string {
    if (customMessage) return customMessage
    return ERROR_MESSAGES[status.toString()] || ERROR_MESSAGES.default
}