// src/api/vendors/products/route.ts

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import createVendorProductWorkflow from "../../../workflows/marketplace/create-vendor-product";
import { validateAndCleanApparelInput } from "../../../utils/apparel-guard";

type ExtendedVariant = {
  id: string;
  sku: string;
  manage_inventory: boolean;
  inventory_items?: Array<{
    inventory_item_id: string;
    required_quantity?: number;
  }>;
  inventory_quantity?: number;
  stocked_quantity?: number;
  [key: string]: any;
};

type ExtendedProduct = {
  id: string;
  title: string;
  variants?: ExtendedVariant[];
  inventory_quantity?: number;
  [key: string]: any;
};

export const POST = async (
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse,
) => {
  const actorId = req.auth_context.actor_id;
  console.log(`[API POST /vendors/products] Incoming request from Actor ID: ${actorId}`);

  const locationId = req.body.location_id ||
    process.env.MEDUSA_STOCK_LOCATION_ID;
  try {
    console.log("==========================================");
    console.log("📝 POST PRODUCT");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("==========================================");
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

  try {
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

    // 3. Query the products with all necessary fields
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
        "options.id",
        "options.title",
        "options.values.id",
        "options.values.value",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.manage_inventory",
        "variants.allow_backorder",
        "variants.inventory_quantity",
        "variants.options.option_id",
        "variants.options.value",
        "variants.price_set.id",
        "variants.price_set.prices.id",
        "variants.price_set.prices.amount",
        "variants.price_set.prices.currency_code",
        "variants.inventory_items.inventory_item_id",
        "apparel_detail.id",
        "apparel_detail.gender",
        "apparel_detail.age_group",
        "apparel_detail.sizing_group",
        "apparel_detail.garment_category",
        "apparel_detail.garment_subcategory",
        "apparel_detail.fit",
        "apparel_detail.pattern",
        "apparel_detail.style_type",
        "apparel_detail.occasion",
        "apparel_detail.sleeve_type",
        "apparel_detail.neck_type",
        "apparel_detail.material_type",
        "apparel_detail.material_composition",
        "apparel_detail.care_instructions",
        "apparel_detail.season",
        "apparel_detail.condition",
      ],
      filters: {
        id: productIds
      }
    });

    // 4. Hydrate inventory quantities
    const inventoryService = req.scope.resolve(Modules.INVENTORY);

    // Collect all inventory item IDs
    const inventoryItemIds = products.flatMap((product: any) =>
      (product.variants ?? []).flatMap((variant: any) =>
        (variant.inventory_items ?? [])
          .map((item: any) => item.inventory_item_id)
          .filter(Boolean)
      )
    );

    // Fetch inventory levels
    const inventoryLevels = inventoryItemIds.length
      ? await inventoryService.listInventoryLevels({
        inventory_item_id: inventoryItemIds,
      })
      : [];

    // Build inventory map
    const inventoryMap = new Map(
      inventoryLevels.map((level: any) => [
        level.inventory_item_id,
        level.stocked_quantity,
      ])
    );

    // Enrich products with inventory data
    for (const product of products as ExtendedProduct[]) {
      for (const variant of (product.variants ?? []) as ExtendedVariant[]) {
        const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id;
        variant.inventory_quantity = inventoryMap.get(inventoryItemId) ?? 0;
        variant.stocked_quantity = variant.inventory_quantity;

        // Enrich inventory items
        variant.inventory_items = (variant.inventory_items ?? []).map((item: any) => ({
          ...item,
          stocked_quantity: inventoryMap.get(item.inventory_item_id) ?? 0,
        }));
      }

      // Calculate total product inventory
      product.inventory_quantity = (product.variants ?? []).reduce(
        (sum: number, variant: any) => sum + (variant.inventory_quantity ?? 0),
        0
      );
    }

    return res.json({ products });
  } catch (error: any) {
    console.error("[API GET ERROR]", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch products"
    });
  }
};