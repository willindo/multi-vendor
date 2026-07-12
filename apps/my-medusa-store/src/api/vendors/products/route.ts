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

  const locationId = req.body.location_id ||
    process.env.MEDUSA_STOCK_LOCATION_ID;
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
        location_id: locationId,
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

  // 1. Resolve vendor admin context
  const { data: [vendorAdmin] } = await query.graph({
    entity: "vendor_admin",
    fields: ["vendor.id"],
    filters: { id: [actorId] },
  });

  if (!vendorAdmin || !vendorAdmin.vendor?.id) {
    throw new Error("Vendor admin context unresolved");
  }

  const vendorId = vendorAdmin.vendor.id;

  // 2. Fetch all product IDs linked to this vendor
  const linkQuery = {
    entity: "vendor_product",
    fields: ["product_id"],
    filters: { vendor_id: [vendorId] },
  };

  const linkedRecords = await remoteQuery(linkQuery);
  const productIds = linkedRecords.map((record: any) => record.product_id);

  if (!productIds.length) {
    return res.json({ products: [] });
  }

  // 3. Query the products using the array of productIds (Renamed variable to plural 'products')
  const { data: products } = await query.graph({
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
      "variants.price_set.prices.amount",
      "variants.inventory_items.*",
      // "variants.inventory_items.invent?ory_item.inventory_levels.stocked_quantity",
      "apparel_detail.id",
      "apparel_detail.*",
    ],
    filters: {
      id: productIds // 🌟 Pass the entire array of product IDs here
      // id: product_id 
    }
  });

  // Optional debugging log (safely checks if products exist before logging)
  if (products.length > 0 && products[0].variants?.length > 0) {
    console.dir(products[0].variants[0], { depth: null });
  }

  // 4. Return the plural array to match your endpoint's collection purpose
  return res.json({
    products
  });
};