// src/utils/resolve-vendor-context.ts
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export interface VendorContext {
    vendorId: string
    vendorAdminId: string
}

export async function resolveVendorContext(
    scope: any,
    actorId: string
): Promise<VendorContext> {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)

    // Try 1: actorId = vendor_admin.id
    let { data: [vendorAdmin] } = await query.graph({
        entity: "vendor_admin",
        fields: ["id", "vendor.id"],
        filters: {
            id: [actorId]
        },
    })

    // Try 2: actorId = user_id
    if (!vendorAdmin?.vendor?.id) {
        const { data: [vendorAdminByUser] } = await query.graph({
            entity: "vendor_admin",
            fields: ["id", "vendor.id"],
            filters: {
                user_id: [actorId]
            },
        })
        vendorAdmin = vendorAdminByUser
    }

    if (!vendorAdmin?.vendor?.id) {
        throw new Error("Unauthorized: authenticated actor is not linked to a vendor.")
    }

    return {
        vendorId: vendorAdmin.vendor.id,
        vendorAdminId: vendorAdmin.id,
    }
}