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

export function normalizeProductForVendor(product: any, vendorId: string) {
    const cleanVendorId =
        (vendorId || "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase()
            .slice(0, 8) || "vendor"

    const title = product.title?.trim() || "Untitled Product"
    const handle = product.handle?.trim() ? slugify(product.handle) : slugify(title)

    const normalizedOptions = (product.options || []).map((opt: any) => ({
        ...opt,
        title: toTitleCase(opt.title || opt.name),
    }))

    const normalizedVariants = (product.variants || []).map((variant: any, index: number) => {
        // Safely extract string values regardless of whether options is an object or array
        let extractedValues: string[] = []
        let normalizedVariantOptions: Record<string, string> = {}

        if (variant.options) {
            if (Array.isArray(variant.options)) {
                variant.options.forEach((opt: any) => {
                    const key = opt.option_name || opt.title || opt.name
                    if (key && opt.value) {
                        const formattedKey = toTitleCase(key)
                        normalizedVariantOptions[formattedKey] = opt.value
                        extractedValues.push(String(opt.value))
                    }
                })
            } else if (typeof variant.options === "object") {
                Object.entries(variant.options).forEach(([k, v]) => {
                    const formattedKey = toTitleCase(k)
                    normalizedVariantOptions[formattedKey] = v as string
                    extractedValues.push(String(v))
                })
            }
        }

        // SKU Generation Logic
        const rawMerchantSku = variant.sku?.trim()?.toUpperCase()
        const fallbackSuffix = extractedValues.length ? extractedValues.join("-") : `${index + 1}`
        const fallbackMerchantSku = `${handle}-${fallbackSuffix}`.toUpperCase()

        const merchantSku = rawMerchantSku || fallbackMerchantSku
        const finalSystemSku = `${cleanVendorId}-${merchantSku}`

        const variantTitle =
            variant.title?.trim() || (extractedValues.length ? extractedValues.join(" / ") : `Variant ${index + 1}`)

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
    })

    return {
        ...product,
        title,
        handle,
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