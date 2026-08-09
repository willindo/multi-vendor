// lib/util/vendor/validation.ts

export const ERROR_MESSAGES = {
    PRODUCT_TITLE_REQUIRED: "Product title is required.",
    VARIANTS_REQUIRED: "At least one variant is required.",
    SKU_REQUIRED: "SKU is required.",
    PRICE_REQUIRED: "Price is required.",
    INVENTORY_REQUIRED: "Inventory quantity is required.",
    UNKNOWN: "Something went wrong.",
} as const

export function sanitizeSku(value: string) {
    return value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-")
        .replace(/[^A-Z0-9-_]/g, "")
}

