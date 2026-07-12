// utils/normalize-variant-sku.ts

export function normalizeVariantSku(
    variants: any[],
    vendorId: string
) {
    const cleanVendorId = vendorId.replace(/[^a-zA-Z0-9]/g, '');
    return variants.map((variant) => {
        const merchantSku = variant.sku?.trim().toUpperCase();
        return {
            ...variant,
            sku: `${cleanVendorId}-${merchantSku}`,
            metadata: {
                ...(variant.metadata ?? {}),
                merchant_sku: merchantSku,
            },
        };
    });
}