import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { HttpTypes } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import createVendorProductWorkflow from "../../../workflows/marketplace/create-vendor-product";
import { validateAndCleanApparelInput } from "../../../utils/apparel-guard";

export const POST = async (
  // req: AuthenticatedMedusaRequest<HttpTypes.AdminCreateProduct>,
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse,
) => {
  // 1. Run our target scope check before triggering workflows
  const apparelData = validateAndCleanApparelInput(req.body);

  const { result } = await createVendorProductWorkflow(req.scope).run({
    input: {
      vendor_admin_id: req.auth_context.actor_id, // 🔥 key
      // product: req.validatedBody,
      product: req.body,
      apparel_detail: apparelData,
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
    fields: [
      "vendor.id",
      "vendor.products.*",
      "vendor.products.apparel_detail.*",
    ],
    filters: {
      id: [req.auth_context.actor_id],
    },
  });
  
  if (!vendorAdmin) {
    throw new Error("Vendor admin context unresolved");
  }
  const cleanProducts = (vendorAdmin.vendor?.products || []).filter(Boolean);
  return res.json({
    products: vendorAdmin.vendor?.products || [],
  });
};
