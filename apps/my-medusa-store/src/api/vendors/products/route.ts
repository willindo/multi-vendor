import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { HttpTypes } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import createVendorProductWorkflow from "../../../workflows/marketplace/create-vendor-product";

export const POST = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminCreateProduct>,
  res: MedusaResponse,
) => {
  const { result } = await createVendorProductWorkflow(req.scope).run({
    input: {
      vendor_admin_id: req.auth_context.actor_id, // 🔥 key
      product: req.validatedBody,
    },
  });

  res.json({
    product: result.product,
  });
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  // const query = req.scope.resolve("query")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [vendorAdmin],
  } = await query.graph({
    entity: "vendor_admin",
    // fields: ["vendor.products.*"],?
    fields: ["vendor.id", "vendor.products.*"],
    filters: {
      id: [req.auth_context.actor_id],
    },
  });
  if (!vendorAdmin) {
    throw new Error("Vendor admin not found");
  }

  return res.json({
    products: vendorAdmin.vendor?.products || [],
  });
};
