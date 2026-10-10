// src/lib/search/build-product-document.ts
import { Modules } from "@medusajs/framework/utils"

export async function buildProductDocument(
    product: any,
    inventoryService: any,
) {
    const vendor = Array.isArray(product.vendor)
        ? product.vendor[0]
        : product.vendor

    const apparel = Array.isArray(product.apparel_detail)
        ? product.apparel_detail[0]
        : product.apparel_detail

    // ──────────────────────────────────────────────────────────
    // 1. Build optionValueId → { optionId, optionTitle, value }
    //    from product.options — no graph expansion needed
    // ──────────────────────────────────────────────────────────
    const valueLookup = new Map<
        string,
        { optionId: string; optionTitle: string; value: string }
    >()

    for (const opt of product.options ?? []) {
        for (const val of opt.values ?? []) {
            valueLookup.set(val.id, {
                optionId: opt.id,
                optionTitle: opt.title,
                value: val.value,
            })
        }
    }

    // ──────────────────────────────────────────────────────────
    // 2. Inventory aggregation (unchanged, still correct)
    // ──────────────────────────────────────────────────────────
    const inventoryItemIds: string[] = (product.variants ?? [])
        .flatMap((variant: any) =>
            (variant.inventory_items ?? []).map(
                (item: any) =>
                    item.inventory_item_id ?? item.inventory_item?.id ?? item.id,
            ),
        )
        .filter(Boolean)

    const inventoryMap = new Map<string, number>()
    if (inventoryItemIds.length > 0) {
        const levels = await inventoryService.listInventoryLevels({
            inventory_item_id: inventoryItemIds,
        })
        for (const level of levels) {
            inventoryMap.set(
                level.inventory_item_id,
                (inventoryMap.get(level.inventory_item_id) ?? 0) +
                (level.stocked_quantity ?? 0),
            )
        }
    }

    const perVariantStock = (variant: any): number => {
        if (variant.manage_inventory === false) return 9999
        return (variant.inventory_items ?? []).reduce(
            (s: number, inv: any) => {
                const id =
                    inv.inventory_item_id ?? inv.inventory_item?.id ?? inv.id
                return s + (inventoryMap.get(id) ?? 0)
            },
            0,
        )
    }

    const totalInventory = (product.variants ?? []).reduce(
        (sum: number, v: any) => sum + perVariantStock(v),
        0,
    )

    // ──────────────────────────────────────────────────────────
    // 3. Prices
    // ──────────────────────────────────────────────────────────
    const prices = (product.variants ?? []).flatMap((variant: any) =>
        (variant.price_set?.prices ?? []).map((p: any) => p.amount),
    )
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0

    const variantPrice = (variant: any) => {
        const p = variant.price_set?.prices?.[0]
        return {
            amount: p?.amount ?? 0,
            currency: (p?.currency_code ?? "usd").toLowerCase(),
        }
    }

    // ──────────────────────────────────────────────────────────
    // 4. Product options — flattened, easy for ProductActions
    // ──────────────────────────────────────────────────────────
    const sizeOption = product.options?.find(
        (o: any) => o.title?.toLowerCase() === "size",
    )
    const colorOption = product.options?.find(
        (o: any) => o.title?.toLowerCase() === "color",
    )

    return {
        id: product.id,
        title: product.title,
        description: product.description ?? "",
        handle: product.handle,
        thumbnail: product.thumbnail ?? "",
        created_at: product.created_at,

        // ────────────────────────────────────────────────────────
        // Options — top-level, mirrors Medusa's StoreProductOption
        // ────────────────────────────────────────────────────────
        options: (product.options ?? []).map((opt: any) => ({
            id: opt.id,
            title: opt.title,
            values: (opt.values ?? []).map((v: any) => ({
                id: v.id,
                value: v.value,
            })),
        })),

        // ────────────────────────────────────────────────────────
        // Variants — flat, with option_id at the TOP of each option
        // ────────────────────────────────────────────────────────
        variants: (product.variants ?? []).map((variant: any) => {
            const { amount, currency } = variantPrice(variant)

            return {
                id: variant.id,
                sku: variant.sku,
                internal_sku: variant.sku,
                merchant_sku: variant.metadata?.merchant_sku ?? variant.sku,

                manage_inventory: variant.manage_inventory ?? false,
                allow_backorder: variant.allow_backorder ?? false,
                inventory_quantity: perVariantStock(variant),

                calculated_price: {
                    calculated_amount: amount,
                    original_amount: amount,
                    currency_code: currency,
                },

                options: (variant.options ?? []).map((vo: any) => {
                    // Resolve parent option id via the product.options map
                    const resolved = valueLookup.get(
                        vo.option_value_id ?? vo.option_value?.id,
                    )

                    return {
                        id: vo.id ?? null,
                        value: vo.value ?? resolved?.value ?? null,
                        option_value_id:
                            vo.option_value_id ?? vo.option_value?.id ?? null,
                        // ✅ top-level option_id — what ProductActions reads
                        option_id:
                            resolved?.optionId ??
                            vo.option_id ??
                            vo.option_value?.option_id ??
                            null,
                    }
                }),
            }
        }),

        // ────────────────────────────────────────────────────────
        // Facet-flattened convenience fields
        // ────────────────────────────────────────────────────────
        merchant_skus: (product.variants ?? [])
            .map((v: any) => v.metadata?.merchant_sku ?? v.sku)
            .filter(Boolean),
        sizes: sizeOption?.values?.map((v: any) => v.value) ?? [],
        colors: colorOption?.values?.map((v: any) => v.value) ?? [],

        vendor_id: vendor?.id ?? "platform",
        vendor_name: vendor?.name ?? "Platform Store",
        vendor_handle: vendor?.handle ?? null,

        // ✅ nested shape for ExtendedMarketplaceProduct compatibility
        apparel_detail: apparel ? {
            gender: apparel.gender,
            age_group: apparel.age_group,
            sizing_group: apparel.sizing_group,
            garment_category: apparel.garment_category,
            garment_subcategory: apparel.garment_subcategory,
            fit: apparel.fit,
            pattern: apparel.pattern,
            style_type: apparel.style_type,
            occasion: apparel.occasion,
            sleeve_type: apparel.sleeve_type,
            neck_type: apparel.neck_type,
            material_type: apparel.material_type,
            material_composition: apparel.material_composition,
            season: apparel.season,
            condition: apparel.condition,
        } : null,

        price: minPrice,
        inventory_quantity: totalInventory,
    }
}
