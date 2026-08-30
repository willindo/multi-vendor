import { normalizeInventory, shouldManageInventory } from "./inventory"
import { normalizePrice, ensureCurrencyCode } from "./pricing"
import { sanitizeSku } from "./validation"

export interface ProductOptionPayload {
    title: string
    values: string[]
}

export function buildProductOptionsPayload(
    variantRows: Array<{
        options?: Array<{
            optionName: string
            value: string
        }>
    }>
): ProductOptionPayload[] {
    const map = new Map<string, Set<string>>()

    for (const row of variantRows) {
        for (const option of row.options ?? []) {
            const optionName = option.optionName?.trim()
            const value = option.value?.trim()

            if (!optionName || !value) {
                continue
            }

            if (!map.has(optionName)) {
                map.set(optionName, new Set<string>())
            }

            map.get(optionName)!.add(value)
        }
    }

    return Array.from(map.entries()).map(([title, values]) => ({
        title,
        values: Array.from(values),
    }))
}

export interface MedusaVariantOptionMap {
    [optionName: string]: string
}

export interface VariantRowPayload {
    id?: string
    title: string
    sku?: string
    enabled?: boolean
    manageInventory?: boolean
    inventoryQuantity?: number
    currencyCode?: string
    price?: number
    options?: Array<{
        optionName: string
        value: string
    }>
}

export interface VariantPayloadConfig {
    defaultCurrency?: string
    fallbackPrice?: number
    fallbackCurrency?: string
    fallbackInventory?: number
    fallbackManageInventory?: boolean
    fallbackSku?: string
}

export function buildVariantPayload(
    variantRows: VariantRowPayload[],
    config: VariantPayloadConfig = {}
) {
    return variantRows
        .filter((row) => row.enabled !== false)
        .map((row) => {
            const variantOptions: MedusaVariantOptionMap = {}

            for (const option of row.options ?? []) {
                const optionName = option.optionName?.trim()
                const value = option.value?.trim()

                if (!optionName || !value) {
                    continue
                }

                variantOptions[optionName] = value
            }

            // Determine effective values using row data first, then fallbacks
            const effectivePrice = row.price ?? config.fallbackPrice ?? 0
            const effectiveCurrency = row.currencyCode ?? config.fallbackCurrency ?? config.defaultCurrency ?? "usd"
            const effectiveInventory = row.inventoryQuantity ?? config.fallbackInventory ?? 0
            const effectiveManageInventory = row.manageInventory ?? config.fallbackManageInventory ?? true
            const effectiveSku = row.sku ?? config.fallbackSku ?? ""

            return {
                ...(row.id ? { id: row.id } : {}),

                title: row.title.trim(),

                sku: sanitizeSku(effectiveSku),

                manage_inventory: shouldManageInventory(
                    effectiveManageInventory
                ),

                inventory_quantity: normalizeInventory(
                    effectiveInventory
                ),

                prices: [
                    {
                        currency_code: ensureCurrencyCode(
                            effectiveCurrency
                        ),
                        amount: normalizePrice(effectivePrice),
                    },
                ],

                options: variantOptions,
            }
        })
}



