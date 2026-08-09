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

            return {
                ...(row.id ? { id: row.id } : {}),

                title: row.title.trim(),

                sku: sanitizeSku(row.sku ?? ""),

                manage_inventory: shouldManageInventory(
                    row.manageInventory
                ),

                inventory_quantity: normalizeInventory(
                    row.inventoryQuantity
                ),

                prices: [
                    {
                        currency_code: ensureCurrencyCode(
                            row.currencyCode ?? config.defaultCurrency
                        ),
                        amount: normalizePrice(row.price),
                    },
                ],

                options: variantOptions,
            }
        })
}

