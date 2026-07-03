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
  const actorId = req.auth_context.actor_id;
  console.log(`[API POST /vendors/products] Incoming request from Actor ID: ${actorId}`);

  try {
    // 1. Run the guard check (Returns normalized object with database column names)
    console.log("[API POST] Validating and normalizing apparel metadata payload...");
    const apparelData = validateAndCleanApparelInput(req.body);

    // 2. Destructure and slice req.body to strip apparel_detail from core product data
    const { apparel_detail, ...coreProductData } = req.body;
    console.log(`[API POST] Payload successfully segregated. Core fields count: ${Object.keys(coreProductData).length}`);

    // 3. Trigger the workflow pipeline with perfectly split payloads
    console.log(`[API POST] Invoking createVendorProductWorkflow pipeline for actor: ${actorId}`);
    const { result } = await createVendorProductWorkflow(req.scope).run({
      input: {
        vendor_admin_id: actorId,
        product: coreProductData,    // 🟢 Clean: Standard Medusa fields only
        apparel_detail: apparelData, // 🟢 Clean: Custom database-ready representation
      },
    });

    console.log(`[API POST] Workflow completed successfully. Returning created product ID: ${result?.product?.id}`);
    return res.json({
      product: result.product,
    });
  } catch (error: any) {
    console.error(`[API POST ERROR] Product creation engine halted: ${error.message}`, error);
    throw error; // Let Medusa's global error handler format the error response
  }
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const actorId = req.auth_context.actor_id;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const remoteQuery = req.scope.resolve("remoteQuery");

  const { data: [vendorAdmin] } = await query.graph({
    entity: "vendor_admin",
    fields: ["vendor.id"],
    filters: { id: [actorId] },
  });

  if (!vendorAdmin || !vendorAdmin.vendor?.id) {
    throw new Error("Vendor admin context unresolved");
  }

  const productId = req.params.id;
  const vendorId = vendorAdmin.vendor.id;

  // 2. Safely capture the exact IDs linking your vendor to your products.
  // This extracts raw records from the link module mapping table directly.
  const linkQuery = {
    entity: "vendor_product", // Matches your link definition name (e.g., [VendorModule, ProductModule])
    fields: ["product_id"],
    filters: { vendor_id: [vendorId] },
  };

  const linkedRecords = await remoteQuery(linkQuery);
  const productIds = linkedRecords.map((record: any) => record.product_id);

  if (!productIds.length) {
    return res.json({ products: [] });
  }

  // 3. Query your products collection with their full nested relations safely using explicit IDs
  const { data: [product] } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "subtitle",
      "description",
      "status",
      "thumbnail",
      "weight",
      "length",
      "height",
      "width",
      "origin_country",
      "material",
      "metadata",
      "options.*",
      "options.values.*",
      "variants.*",
      "variants.options.*",
      "variants.price_set.*",
      "variants.price_set.prices.*",
      "variants.inventory_items.*",
      "variants.inventory_items.inventory_item.*",

      // 1. Fetch the properties of the link entry itself
      "apparel_detail.id",

      // 2. Traversal: Instruct Medusa to reach through the link entry 
      // directly into the nested apparel_detail table properties
      "apparel_detail.*",
      // "apparel_detail.apparel_detail.*",
    ],
    filters: {
      id: [productId]
    }
  });


  return res.json({
    product
  });
};