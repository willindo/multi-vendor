// src/utils/normalize-product.ts

// Helper to convert strings to Title Case ("size" -> "Size", "COLOR" -> "Color")

const toTitleCase = (str: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ""

const slugify = (str: string) =>
    (str || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")

// --- MAIN NORMALIZER ---
export function normalizeProductForVendor(product: any, vendorId: string) {
    // 1. Sanitize Vendor ID for SKU prefixing
    const cleanVendorId =
        (vendorId || "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase()
            .slice(0, 8) || "vendor"

    // 2. Handle & Title Normalization
    const title = product.title?.trim() || "Untitled Product"
    const handle = product.handle?.trim()
        ? slugify(product.handle)
        : slugify(title)

    // 3. Normalize Product Options (delineating titles & unique values)
    const normalizedOptions = (product.options ?? [])
        .map((option: any) => {
            const optionTitle = String(
                option.title ?? option.name ?? ""
            ).trim()

            const values = Array.isArray(option.values)
                ? option.values
                    .map((val: any) => {
                        if (typeof val === "string") return val.trim()
                        if (val && typeof val === "object" && typeof val.value === "string") {
                            return val.value.trim()
                        }
                        return ""
                    })
                    .filter(Boolean)
                : []

            return {
                title: toTitleCase(optionTitle),
                values: [...new Set(values)], // Deduplicate
            }
        })
        .filter((option: any) => option.title && option.values.length > 0)

    // 4. Normalize Variants (Options, Titles, SKUs, and Inventory)
    const normalizedVariants = (product.variants ?? []).map(
        (variant: any, index: number) => {
            const extractedValues: string[] = []
            const normalizedVariantOptions: Record<string, string> = {}

            // Extract variant options (handles both Array and Key-Value Object shapes)
            if (Array.isArray(variant.options)) {
                for (const opt of variant.options) {
                    const key =
                        opt.optionName ??
                        opt.option_name ??
                        opt.title ??
                        opt.name

                    const value = opt.value

                    if (
                        typeof key === "string" &&
                        typeof value === "string" &&
                        key.trim() &&
                        value.trim()
                    ) {
                        const formattedKey = toTitleCase(key.trim())
                        normalizedVariantOptions[formattedKey] = value.trim()
                        extractedValues.push(value.trim())
                    }
                }
            } else if (variant.options && typeof variant.options === "object") {
                for (const [key, value] of Object.entries(variant.options)) {
                    if (typeof value === "string" && value.trim()) {
                        const formattedKey = toTitleCase(key)
                        normalizedVariantOptions[formattedKey] = value.trim()
                        extractedValues.push(value.trim())
                    }
                }
            }

            // SKU Logic: generate system-wide SKU with vendor prefix
            const rawMerchantSku = variant.sku?.trim()?.toUpperCase()
            const fallbackSuffix = extractedValues.length
                ? extractedValues.join("-")
                : `${index + 1}`
            const fallbackMerchantSku = `${handle}-${fallbackSuffix}`.toUpperCase()

            const merchantSku = rawMerchantSku || fallbackMerchantSku
            const finalSystemSku = `${cleanVendorId}-${merchantSku}`

            // Variant Title Fallback
            const variantTitle =
                variant.title?.trim() ||
                (extractedValues.length
                    ? extractedValues.join(" / ")
                    : `Variant ${index + 1}`)

            return {
                ...variant,
                title: variantTitle,
                sku: finalSystemSku,
                options: normalizedVariantOptions,
                manage_inventory: variant.manage_inventory ?? true,
                allow_backorder: variant.allow_backorder ?? false,
                inventory_quantity: variant.inventory_quantity ?? 0,
                metadata: {
                    ...(variant.metadata ?? {}),
                    merchant_sku: merchantSku,
                    vendor_id: vendorId,
                },
            }
        }
    )

    return {
        ...product,
        title,
        handle,
        metadata: {
            ...(product.metadata ?? {}),
            vendor_id: vendorId,
        },
        options: normalizedOptions,
        variants: normalizedVariants,
    }
}

// 2. Normalize Handle
// const originalHandle = product.handle?.trim().toLowerCase();
// const cleanHandle = originalHandle
//     ?.replace(/[^a-z0-9-_]/g, '-')
//     .replace(/-+/g, '-')    // Remove multiple hyphens
//     .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
// const vendorScopedHandle = `${cleanVendorId}-${cleanHandle}`;

// return {
//     ...product,
//     variants: normalizedVariants,
//     handle: vendorScopedHandle,
//     metadata: {
//         ...(product.metadata ?? {}),
//         original_handle: originalHandle,
//     },
// };
// }