// src/utils/normalize-product.ts
export function normalizeProductForVendor(
    product: any,
    vendorId: string
) {
    const cleanVendorId = vendorId
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 8); // ✅ Only use first 8 chars

    // 1. Normalize SKUs
    const normalizedVariants = product.variants?.map((variant: any) => {
        const merchantSku = variant.sku?.trim().toUpperCase();
        return {
            ...variant,
            sku: `${cleanVendorId}-${merchantSku}`,
            metadata: {
                ...(variant.metadata ?? {}),
                merchant_sku: merchantSku,
            },
        };
    }) || [];

    // 2. Normalize Handle
    const originalHandle = product.handle?.trim().toLowerCase();
    const cleanHandle = originalHandle
        ?.replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')    // Remove multiple hyphens
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    const vendorScopedHandle = `${cleanVendorId}-${cleanHandle}`;

    return {
        ...product,
        variants: normalizedVariants,
        handle: vendorScopedHandle,
        metadata: {
            ...(product.metadata ?? {}),
            original_handle: originalHandle,
        },
    };
}