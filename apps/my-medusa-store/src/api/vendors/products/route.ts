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
  const actorId = req.auth_context?.actor_id;

  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized: Missing authentication context." });
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const locationId = req.body.location_id || process.env.MEDUSA_STOCK_LOCATION_ID;

  try {
    // 0. Ensure Actor is attached to a Vendor before processing payload
    const { data: [vendorAdmin] } = await query.graph({
      entity: "vendor_admin",
      fields: ["vendor.id"],
      filters: { id: [actorId] },
    });

    if (!vendorAdmin?.vendor?.id) {
      return res.status(403).json({ message: "Forbidden: No vendor context linked to this user." });
    }

    // 1. Run the guard check
    const apparelData = validateAndCleanApparelInput(req.body);

    // 2. Destructure and slice req.body
    const { apparel_detail, ...coreProductData } = req.body;

    // 3. Trigger the workflow pipeline
    const { result } = await createVendorProductWorkflow(req.scope).run({
      input: {
        vendor_admin_id: actorId,
        product: coreProductData,
        apparel_detail: apparelData,
        location_id: locationId,
      },
    });

    return res.status(201).json({
      product: result.product,
    });
  } catch (error: any) {
    console.error(`[API POST ERROR] Product creation engine halted: ${error.message}`, error);
    return res.status(500).json({ message: error.message || "Failed to create product" });
  }
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const actorId = req.auth_context?.actor_id;

  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized: Missing authentication context." });
  }

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
      return res.status(403).json({ message: "Forbidden: Vendor admin context unresolved." });
    }

    const vendorId = vendorAdmin.vendor.id;

    // 2. Fetch product IDs linked strictly to this vendor (Ownership guard)
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
        id: productIds,
      },
    });

    // 4. Hydrate inventory quantities
    const inventoryService = req.scope.resolve(Modules.INVENTORY);

    const inventoryItemIds = products.flatMap((product: any) =>
      (product.variants ?? []).flatMap((variant: any) =>
        (variant.inventory_items ?? [])
          .map((item: any) => item.inventory_item_id)
          .filter(Boolean)
      )
    );

    const inventoryLevels = inventoryItemIds.length
      ? await inventoryService.listInventoryLevels({
        inventory_item_id: inventoryItemIds,
      })
      : [];

    const inventoryMap = new Map(
      inventoryLevels.map((level: any) => [
        level.inventory_item_id,
        level.stocked_quantity,
      ])
    );

    for (const product of products as ExtendedProduct[]) {
      for (const variant of (product.variants ?? []) as ExtendedVariant[]) {
        const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id;
        variant.inventory_quantity = inventoryMap.get(inventoryItemId) ?? 0;
        variant.stocked_quantity = variant.inventory_quantity;

        variant.inventory_items = (variant.inventory_items ?? []).map((item: any) => ({
          ...item,
          stocked_quantity: inventoryMap.get(item.inventory_item_id) ?? 0,
        }));
      }

      product.inventory_quantity = (product.variants ?? []).reduce(
        (sum: number, variant: any) => sum + (variant.inventory_quantity ?? 0),
        0
      );
    }

    return res.json({ products });
  } catch (error: any) {
    console.error("[API GET ERROR]", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch products",
    });
  }
};