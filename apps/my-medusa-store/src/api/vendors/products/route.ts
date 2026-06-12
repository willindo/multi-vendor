// src/api/vendors/products/route.ts
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import createVendorProductWorkflow from "../../../workflows/marketplace/create-vendor-product";
import { validateAndCleanApparelInput } from "../../../utils/apparel-guard";

export const POST = async (
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse,
) => {
  // 1. Run the guard check (Returns normalized object with database column names)
  const apparelData = validateAndCleanApparelInput(req.body);

  // 2. Destructure and slice req.body to strip apparel_detail from core product data
  const { apparel_detail, ...coreProductData } = req.body;

  // 3. Trigger the workflow pipeline with perfectly split payloads
  const { result } = await createVendorProductWorkflow(req.scope).run({
    input: {
      vendor_admin_id: req.auth_context.actor_id,
      product: coreProductData,    // 🟢 Clean: Standard Medusa fields only
      apparel_detail: apparelData, // 🟢 Clean: Custom database-ready representation
    },
  });

  return res.json({
    product: result.product,
  });
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [vendorAdmin],
  } = await query.graph({
    entity: "vendor_admin",
    fields: [
      "vendor.id",
      "vendor.products.*",
      "vendor.products.apparel_detail.*", // Maps to custom link definition
    ],
    filters: {
      id: [req.auth_context.actor_id],
    },
  });

  if (!vendorAdmin) {
    throw new Error("Vendor admin context unresolved");
  }

  // 4. Extract and filter out broken relational pointers safely
  const cleanProducts = (vendorAdmin.vendor?.products || []).filter(Boolean);

  return res.json({
    products: cleanProducts, // 🟢 Clean: Wipes zombie records from array delivery
  });
};