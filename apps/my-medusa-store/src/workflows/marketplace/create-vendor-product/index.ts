// src/workflows/marketplace/create-vendor-product/index.ts
import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types";
import {
  createWorkflow,
  transform,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createProductsWorkflow,
  CreateProductsWorkflowInput,
  createRemoteLinkStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../../../modules/marketplace";
import type { ApparelDetails } from "@shared/index";
import { normalizeProductForVendor } from "@/utils/normalize-product";

type Input = {
  vendor_admin_id: string;
  product: CreateProductWorkflowInputDTO;
  apparel_detail: ApparelDetails;
  location_id?: string;
};

// ============================================================
// STEP: Create Apparel Detail
// ============================================================
const createApparelDetailStep = createStep(
  "create-apparel-detail-step",
  async (input: { product_id: string; apparel_detail: ApparelDetails }, { container }) => {
    const marketplaceService = container.resolve(MARKETPLACE_MODULE);
    const detail = await marketplaceService.createApparelDetails({
      product_id: input.product_id,
      ...input.apparel_detail,
    });
    return new StepResponse(detail, detail.id);
  },
  async (detailId, { container }) => {
    if (!detailId) return;
    const marketplaceService = container.resolve(MARKETPLACE_MODULE);
    await marketplaceService.deleteApparelDetails([detailId]);
  }
);

// ============================================================
// STEP: Initialize Inventory Levels with Rollback
// ============================================================
const initializeInventoryStep = createStep(
  "initialize-inventory-step",
  async (
    input: {
      levels: {
        inventory_item_id: string;
        location_id: string;
        stocked_quantity: number;
      }[];
    },
    { container }
  ) => {
    if (!input.levels || input.levels.length === 0) {
      return new StepResponse({ initialized: 0 }, []);
    }

    const inventoryService = container.resolve(Modules.INVENTORY);
    const createdLevels = await inventoryService.createInventoryLevels(input.levels);

    return new StepResponse(
      { initialized: createdLevels.length },
      createdLevels.map((l: any) => l.id)
    );
  },
  async (createdLevelIds, { container }) => {
    if (!createdLevelIds?.length) return;
    const inventoryService = container.resolve(Modules.INVENTORY);
    await inventoryService.deleteInventoryLevels(createdLevelIds);
  }
);

// ============================================================
// WORKFLOW
// ============================================================
export const createVendorProductWorkflow = createWorkflow(
  "create-vendor-product",
  (input: Input) => {
    // 1. Get vendor
    const { data: vendorAdmins } = useQueryGraphStep({
      entity: "vendor_admin",
      fields: ["id", "vendor.id"],
      filters: { id: input.vendor_admin_id },
    }).config({ name: "get-vendor-admin" });

    // 2. Normalize SKUs and Handle
    const normalizedProduct = transform({ input, vendorAdmins }, (data) => {
      const vendor = data.vendorAdmins[0]?.vendor;
      if (!vendor) throw new Error("Vendor context not found");
      return normalizeProductForVendor(data.input.product, vendor.id);
    });

    // 3. Fetch sales channels
    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["default_sales_channel_id"],
    }).config({ name: "get-store" });

    // 4. Prepare product data with sales channel
    const productData = transform({ normalizedProduct, stores }, (data) => ({
      products: [
        {
          ...data.normalizedProduct,
          sales_channels: [{ id: data.stores[0].default_sales_channel_id }],
        },
      ],
    }));

    // console.log(
    //   "[WORKFLOW] normalizedProduct:",
    //   JSON.stringify(data.normalizedProduct, null, 2)
    // )
    // console.log(
    //   "[WORKFLOW] productData:",
    //   JSON.stringify(
    //     {
    //       products: [
    //         {
    //           ...data.normalizedProduct,
    //           sales_channels: [
    //             {
    //               id: data.stores[0].default_sales_channel_id,
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //     null,
    //     2
    //   )
    // )
    // 5. Create product
    const productResult = createProductsWorkflow.runAsStep({
      input: productData as CreateProductsWorkflowInput,
    });

    // 6. Fetch auto-generated inventory links for created variants
    const productGraphData = useQueryGraphStep({
      entity: "product",
      fields: [
        "variants.sku",
        "variants.manage_inventory",
        "variants.inventory_items.inventory_item_id",
      ],
      filters: { id: productResult[0].id },
    }).config({ name: "get-created-product-inventory-links" });

    // Build inventory initialization payload
    const initialInventoryPayload = transform(
      { productGraphData, normalizedProduct, input },
      (data) => {
        const product = data.productGraphData?.data?.[0];
        const locationId =
          data.input.location_id || process.env.MEDUSA_STOCK_LOCATION_ID;

        if (!locationId) {
          throw new Error("Missing stock location ID for inventory initialization.");
        }

        const levels: {
          inventory_item_id: string;
          location_id: string;
          stocked_quantity: number;
        }[] = [];

        if (!product) return { levels };

        for (const variant of product.variants || []) {
          if (!variant.manage_inventory) continue;

          const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id;
          if (!inventoryItemId) continue;

          const originalInput = data.normalizedProduct.variants.find(
            (v: any) => v.sku === variant.sku
          );
          const initialQuantity = originalInput?.inventory_quantity ?? 0;

          levels.push({
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: Number(initialQuantity),
          });
        }

        return { levels };
      }
    );

    // Run inventory initialization with rollback support
    initializeInventoryStep({
      levels: initialInventoryPayload.levels,
    });

    // 7. Create apparel detail
    const apparelDetail = createApparelDetailStep({
      product_id: productResult[0].id,
      apparel_detail: input.apparel_detail,
    });

    // 8. Create remote links
    const links = transform({ productResult, vendorAdmins, apparelDetail }, (data) => {
      if (!data.vendorAdmins.length || !data.vendorAdmins[0].vendor) {
        throw new Error("Vendor context validation failed.");
      }

      return [
        {
          [MARKETPLACE_MODULE]: { vendor_id: data.vendorAdmins[0].vendor.id },
          [Modules.PRODUCT]: { product_id: data.productResult[0].id },
        },
        {
          [Modules.PRODUCT]: { product_id: data.productResult[0].id },
          [MARKETPLACE_MODULE]: { apparel_detail_id: data.apparelDetail.id },
        },
      ];
    });

    createRemoteLinkStep(links);

    // 9. Fetch final product representation
    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: ["*", "variants.*"],
      filters: { id: productResult[0].id },
    }).config({ name: "get-product" });

    return new WorkflowResponse({
      product: products[0] as any,
    });
  }
);

export default createVendorProductWorkflow;