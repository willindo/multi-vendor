export function normalizeInventory(quantity?: number) {
    return Math.max(0, quantity ?? 0)
}

export function shouldManageInventory(value?: boolean) {
    return value ?? true
}