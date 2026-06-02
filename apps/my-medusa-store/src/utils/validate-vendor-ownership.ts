import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function validateVendorProductOwnership(
  scope: any,
  actorId: string,
  productId: string
) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);

  // 1. Resolve vendor context from the authenticated actor ID
  const { data: [vendorAdmin] } = await query.graph({
    entity: "vendor_admin",
    fields: ["vendor.id"],
    filters: { id: [actorId] },
  });

  if (!vendorAdmin || !vendorAdmin.vendor) {
    throw new Error("Unauthorized: No vendor context linked to this user account.");
  }

  const vendorId = vendorAdmin.vendor.id;

  // 2. Query the exact link entry table to verify ownership cleanly
  const { data: links } = await query.graph({
    entity: "vendor_product", // Matches your link module table registration name
    fields: ["vendor_id", "product_id"],
    filters: {
      vendor_id: [vendorId],
      product_id: [productId],
    },
  });

  if (!links || links.length === 0) {
    throw new Error("Unauthorized: You do not own this product resource configuration.");
  }

  return true;
}