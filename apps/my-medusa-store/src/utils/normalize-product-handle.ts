// src/utils/normalize-product-handle.ts
export function normalizeProductHandle(
    handle: string,
    vendorId: string
): string {
    const cleanHandle = handle?.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const cleanVendorId = vendorId.replace(/[^a-zA-Z0-9]/g, '');

    // ✅ Vendor-scoped handle: vendor_01-classic-linen-t-shirt-white
    return `${cleanVendorId}-${cleanHandle}`;
}