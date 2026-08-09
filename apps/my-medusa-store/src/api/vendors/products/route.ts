// /src/api/vendors/products/route.ts
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import createVendorProductWorkflow from "../../../workflows/marketplace/create-vendor-product";
import { validateAndCleanApparelInput } from "../../../utils/apparel-guard";
import { resolveVendorContext } from "../../../utils/resolve-vendor-context";
import { hydrateVendorProduct } from "@/lib/vendor/product-hydration";

export const POST = async (
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse,
) => {
  console.log(
    "[API POST /vendors/products] Incoming Request Body:\n",
    JSON.stringify(req.body, null, 2)
  );

  const actorId = req.auth_context?.actor_id;
  if (!actorId) {
    console.warn(
      "[API POST /vendors/products] Unauthorized - Missing actor_id in auth_context"
    );
    return res.status(401).json({
      message: "Unauthorized: Missing authentication context."
    });
  }

  const locationId = req.body.location_id || process.env.MEDUSA_STOCK_LOCATION_ID;

  try {
    console.log(
      `[API POST /vendors/products] Resolving vendor context for actorId: "${actorId}"...`
    );
    const { vendorAdminId } = await resolveVendorContext(req.scope, actorId);

    if (!vendorAdminId) {
      console.warn(
        `[API POST /vendors/products] Forbidden - No vendor admin context found for actorId: "${actorId}"`
      );
      return res.status(403).json({
        message: "Forbidden: No vendor context linked to this user."
      });
    }

    console.log(
      `[API POST /vendors/products] Resolved context -> vendorAdminId: "${vendorAdminId}", locationId: "${locationId}"`
    );

    const apparelData = validateAndCleanApparelInput(req.body);
    const { apparel_detail, ...coreProductData } = req.body;

    console.log(
      "[API POST /vendors/products] Cleaned Apparel Data:\n",
      JSON.stringify(apparelData, null, 2)
    );

    console.log("[API POST /vendors/products] Executing createVendorProductWorkflow...");
    const { result } = await createVendorProductWorkflow(req.scope).run({
      input: {
        vendor_admin_id: vendorAdminId,
        product: coreProductData,
        apparel_detail: apparelData,
        location_id: locationId,
      },
    });

    console.log(
      `[API POST /vendors/products] Workflow Success! Created Product ID: "${result.product?.id}"`
    );

    return res.status(201).json({
      product: result.product,
    });
  } catch (error: any) {
    console.error(
      `[API POST ERROR] Failed to create product for actorId "${actorId}":`,
      error.message,
      error
    );
    return res.status(500).json({
      message: error.message || "Failed to create product"
    });
  }
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const actorId = req.auth_context?.actor_id;

  if (!actorId) {
    console.warn(
      "[API GET /vendors/products] Unauthorized - Missing actor_id in auth_context"
    );
    return res.status(401).json({
      message: "Unauthorized: Missing authentication context."
    });
  }

  const remoteQuery = req.scope.resolve("remoteQuery");

  try {
    console.log(
      `[API GET /vendors/products] Resolving vendor context for actorId: "${actorId}"...`
    );
    const { vendorId } = await resolveVendorContext(req.scope, actorId);
    console.log(`[API GET /vendors/products] Resolved vendorId: "${vendorId}"`);

    const linkQuery = {
      entity: "vendor_product",
      fields: ["product_id"],
      filters: { vendor_id: [vendorId] },
    };

    const linkedRecords = await remoteQuery(linkQuery);
    const productIds = linkedRecords.map((record: any) => record.product_id);

    console.log(
      `[API GET /vendors/products] Found ${productIds.length} linked product record(s):`,
      productIds
    );

    if (!productIds.length) {
      return res.json({ products: [] });
    }

    console.log(`[API GET /vendors/products] Hydrating ${productIds.length} product(s)...`);
    const hydratedProducts = await Promise.all(
      productIds.map((pid) => hydrateVendorProduct(req.scope, pid))
    );

    console.log(
      `[API GET /vendors/products] Successfully hydrated ${hydratedProducts.length} product(s). Returning response.`
    );

    return res.json({ products: hydratedProducts });
  } catch (error: any) {
    console.error(
      `[API GET ERROR] Failed to fetch products for actorId "${actorId}":`,
      error
    );
    return res.status(500).json({
      message: error.message || "Failed to fetch products",
    });
  }
};