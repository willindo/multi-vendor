export function normalizePrice(value?: number | null): number {
    if (value == null || Number.isNaN(value)) {
        return 0
    }

    return Math.round(value * 100)
}

export function denormalizePrice(value?: number | null): number {
    if (value == null) {
        return 0
    }

    return value / 100
}

export function ensureCurrencyCode(code?: string) {
    return (code || "usd").toLowerCase()
}