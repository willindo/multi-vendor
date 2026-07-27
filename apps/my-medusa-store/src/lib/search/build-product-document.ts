// src/lib/search/build-product-document.ts
import { Modules } from "@medusajs/framework/utils";
export async function buildProductDocument(
    product: any,
    inventoryService: any,
) {
    const vendor = Array.isArray(product.vendor)
        ? product.vendor[0]
        : product.vendor;
    const apparel = Array.isArray(product.apparel_detail)
        ? product.apparel_detail[0]
        : product.apparel_detail;
    //
    // Inventory
    //
    const inventoryItemIds: string[] = (product.variants ?? [])
        .flatMap((variant: any) =>
            (variant.inventory_items ?? []).map(
                (item: any) =>
                    item.inventory_item_id ?? item.inventory_item?.id ?? item.id,
            ),
        )
        .filter(Boolean);
    const inventoryMap = new Map<string, number>();
    if (inventoryItemIds.length > 0) {
        const levels = await inventoryService.listInventoryLevels({
            inventory_item_id: inventoryItemIds,
        });
        for (const level of levels) {
            inventoryMap.set(
                level.inventory_item_id,
                (inventoryMap.get(level.inventory_item_id) ?? 0) +
                (level.stocked_quantity ?? 0),
            );
        }
    }
    const inventory_quantity = (product.variants ?? []).reduce(
        (sum: number, variant: any) => {
            const stock = (variant.inventory_items ?? []).reduce(
                (s: number, inv: any) => {
                    const id = inv.inventory_item_id ?? inv.inventory_item?.id ?? inv.id;
                    return s + (inventoryMap.get(id) ?? 0);
                },
                0,
            );
            return sum + stock;
        },
        0,
    );
    //
    // Prices
    //
    const prices = (product.variants ?? []).flatMap(
        (variant: any) =>
            variant.price_set?.prices?.map((price: any) => price.amount) ?? [],
    );
    //
    // Product options
    //
    const sizeOption = product.options?.find(
        (o: any) => o.title?.toLowerCase() === "size",
    );
    const colorOption = product.options?.find(
        (o: any) => o.title?.toLowerCase() === "color",
    );
    return {
        id: product.id,
        title: product.title,
        description: product.description ?? "",
        handle: product.handle,
        thumbnail: product.thumbnail ?? "",
        variants: (product.variants ?? []).map((variant: any) => ({
            id: variant.id,
            internal_sku: variant.sku,
            merchant_sku: variant.metadata?.merchant_sku ?? variant.sku,
            options: (variant.options ?? []).map((vo: any) => ({
                id: vo.id,
                value: vo.value,
                option_value_id: vo.option_value_id,
                option_value: {
                    id: vo.option_value?.id,
                    value: vo.option_value?.value,
                    option_id: vo.option_value?.option_id,
                    option: {
                        id: vo.option_value?.option?.id,
                        title: vo.option_value?.option?.title,
                    },
                },
            })),
        })),
        merchant_skus: (product.variants ?? [])
            .map((v: any) => v.metadata?.merchant_sku ?? v.sku)
            .filter(Boolean),
        sizes: sizeOption?.values?.map((v: any) => v.value) ?? [],
        colors: colorOption?.values?.map((v: any) => v.value) ?? [],
        vendor_id: vendor?.id ?? "platform",
        vendor_name: vendor?.name ?? "Platform Store",
        vendor_handle: vendor?.handle ?? null,
        gender: apparel?.gender ?? "UNISEX",
        age_group: apparel?.age_group ?? null,
        sizing_group: apparel?.sizing_group ?? null,
        garment_category: apparel?.garment_category ?? null,
        garment_subcategory: apparel?.garment_subcategory ?? null,
        fit: apparel?.fit ?? "REGULAR",
        pattern: apparel?.pattern ?? "SOLID",
        style_type: apparel?.style_type ?? "CASUAL",
        occasion: apparel?.occasion ?? null,
        sleeve_type: apparel?.sleeve_type ?? null,
        neck_type: apparel?.neck_type ?? null,
        material_type: apparel?.material_type ?? "NATURAL",
        material_composition: apparel?.material_composition ?? null,
        season: apparel?.season ?? "ALL_SEASON",
        condition: apparel?.condition ?? "NEW",
        price: prices.length > 0 ? Math.min(...prices) : 0,
        inventory_quantity,
    };
}
