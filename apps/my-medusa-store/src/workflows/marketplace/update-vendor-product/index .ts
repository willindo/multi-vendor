// src/workflows/marketplace/update-vendor-product/index.ts
import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk";
import {
  createProductVariantsWorkflow,
  updateProductVariantsWorkflow,
  deleteProductVariantsWorkflow,
  createRemoteLinkStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../../../modules/marketplace";
import { reconcileVariantsStep } from "./reconcile";
import type { ApparelDetails } from "@shared/index";

type WorkflowInput = {
  product_id: string;
  product: any;
  variants: any[];
  variants_to_delete?: string[];
  options: any[];
  apparel_detail?: ApparelDetails;
  location_id?: string;
  vendor_admin_id: string;
};

// ============================================================
// STEP: Update Product
// ============================================================
const updateProductStep = createStep(
  "update-product-step",
  async (input: { product_id: string; updateData: any }, { container }) => {
    const productService = container.resolve(Modules.PRODUCT);
    const updated = await productService.updateProducts(
      input.product_id,
      input.updateData
    );
    return new StepResponse(updated);
  }
);

// ============================================================
// STEP: Sync Apparel Detail
// ============================================================
const syncApparelDetailStep = createStep(
  "sync-apparel-detail-step",
  async (input: { product_id: string; apparel_detail: any }, { container }) => {
    const marketplaceService = container.resolve("marketplace");
    const query = container.resolve("query");

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "apparel_detail.id"],
      filters: { id: input.product_id }
    });

    const existingApparelId = products[0]?.apparel_detail?.id;

    if (existingApparelId) {
      await marketplaceService.updateApparelDetails([
        {
          id: existingApparelId,
          ...input.apparel_detail,
        },
      ]);
      return new StepResponse({ apparel_detail_id: existingApparelId, isNew: false });
    } else {
      const newDetail = await marketplaceService.createApparelDetails({
        product_id: input.product_id,
        ...input.apparel_detail,
      });
      return new StepResponse({ apparel_detail_id: newDetail.id, isNew: true });
    }
  }
);

// ============================================================
// STEP: Ensure Product Options
// ============================================================
const ensureProductOptionsStep = createStep(
  "ensure-product-options-step",
  async (input: { product_id: string; missingOptions: any[] }, { container }) => {
    if (!input.missingOptions?.length) {
      return new StepResponse([]);
    }
    const productService = container.resolve(Modules.PRODUCT);

    const createdOptions = await productService.createProductOptions(
      input.missingOptions.map((opt) => ({
        product_id: input.product_id,
        title: opt.title,
        values: opt.values || [],
      }))
    );
    return new StepResponse(createdOptions);
  }
);

// ============================================================
// STEP: Ensure Product Option Values
// ============================================================
const ensureProductOptionValuesStep = createStep(
  "ensure-product-option-values-step",
  async (input: { product_id: string; missingOptionValues: Record<string, string[]> }, { container }) => {
    const valuesMap = input.missingOptionValues || {};
    if (Object.keys(valuesMap).length === 0) {
      return new StepResponse(false);
    }

    const productService = container.resolve(Modules.PRODUCT);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "options.id", "options.title", "options.values.id", "options.values.value"],
      filters: { id: [input.product_id] },
    });

    const product = products[0];
    if (product && Array.isArray(product.options)) {
      for (const option of product.options) {
        const newValues = valuesMap[option.title];
        if (!newValues?.length) continue;

        const existingValues = (option.values || []).map((v: any) => v.value);
        const combinedValues = Array.from(new Set([...existingValues, ...newValues]));

        await productService.updateProductOptions(option.id, {
          values: combinedValues,
        });
      }
    }

    return new StepResponse(true);
  }
);

// ============================================================
// STEP: Update Inventory
// ============================================================
const updateInventoryStep = createStep(
  "update-inventory-step",
  async (input: {
    inventoryUpdates: { inventory_item_id: string; stocked_quantity: number }[];
    location_id?: string;
  }, { container }) => {
    const inventoryService = container.resolve(Modules.INVENTORY);

    if (!input.inventoryUpdates?.length) {
      return new StepResponse({ updatedCount: 0, createdCount: 0 });
    }

    const locationId = input.location_id ?? "default_location";
    const itemIds = input.inventoryUpdates.map((iu) => iu.inventory_item_id);

    const existingLevels = await inventoryService.listInventoryLevels({
      inventory_item_id: itemIds,
    });

    const levelMap = new Map(
      existingLevels.map(level => [
        level.inventory_item_id,
        level,
      ])
    );

    const levelsToUpdate: any[] = [];
    const levelsToCreate: any[] = [];

    for (const update of input.inventoryUpdates) {
      const existingLevel = levelMap.get(update.inventory_item_id);

      if (existingLevel) {
        levelsToUpdate.push({
          id: existingLevel.id,
          inventory_item_id: update.inventory_item_id,
          location_id: existingLevel.location_id,
          stocked_quantity: update.stocked_quantity,
        });
      } else {
        levelsToCreate.push({
          inventory_item_id: update.inventory_item_id,
          location_id: locationId,
          stocked_quantity: update.stocked_quantity,
        });
      }
    }

    if (levelsToUpdate.length > 0) {
      await inventoryService.updateInventoryLevels(levelsToUpdate);
    }

    if (levelsToCreate.length > 0) {
      await inventoryService.createInventoryLevels(levelsToCreate);
    }

    return new StepResponse({
      updatedCount: levelsToUpdate.length,
      createdCount: levelsToCreate.length,
    });
  }
);

// ============================================================
// STEP: Get Updated Product
// ============================================================
const getUpdatedProductStep = createStep(
  "get-updated-product-step",
  async (input: { product_id: string }, { container }) => {
    const query = container.resolve("query");

    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "variants.*",
        "variants.options.*",
        "variants.price_set.*",
        "variants.price_set.prices.*",
        "variants.inventory_items.inventory_item.inventory_levels.*",
        "apparel_detail.*",
      ],
      filters: { id: [input.product_id] },
    });

    return new StepResponse(products[0]);
  }
);

// ============================================================
// WORKFLOW
// ============================================================
export const updateVendorProductWorkflow = createWorkflow(
  "update-vendor-product",
  (input: WorkflowInput) => {
    // ✅ Get vendor
    const { data: vendorAdmins } = useQueryGraphStep({
      entity: "vendor_admin",
      fields: ["id", "vendor.id"],
      filters: { id: input.vendor_admin_id },
    }).config({ name: "get-update-vendor" });

    // ✅ Normalize incoming variant SKUs only
    const normalizedVariants = transform({ input, vendorAdmins }, (data) => {
      const vendorId = data.vendorAdmins[0]?.vendor?.id;
      if (!vendorId) throw new Error("Vendor context not found");

      return (data.input.variants || []).map((v: any) => {
        const merchantSku = v.sku?.trim().toUpperCase();
        const cleanVendorId = vendorId.replace(/[^a-zA-Z0-9]/g, '');
        const isAlreadyPrefixed = v.sku?.startsWith(`${cleanVendorId}-`);

        return {
          ...v,
          sku: isAlreadyPrefixed ? v.sku : `${cleanVendorId}-${merchantSku}`,
          metadata: {
            ...(v.metadata ?? {}),
            merchant_sku: merchantSku,
          }
        };
      });
    });

    // 1. Update core product fields
    updateProductStep({
      product_id: input.product_id,
      updateData: input.product,
    });

    // 2. Sync apparel detail
    const apparelResult = syncApparelDetailStep({
      product_id: input.product_id,
      apparel_detail: input.apparel_detail,
    });

    // 3. Create remote link if apparel is new
    const apparelLinkPayload = transform({ input, apparelResult }, (data) => {
      if (!data.apparelResult?.isNew) {
        return [];
      }
      return [{
        [Modules.PRODUCT]: { product_id: data.input.product_id },
        [MARKETPLACE_MODULE]: { apparel_detail_id: data.apparelResult.apparel_detail_id },
      }];
    });
    createRemoteLinkStep(apparelLinkPayload);

    // ✅ C. Reconcile variants with normalized SKUs
    const diffPlan = reconcileVariantsStep({
      product_id: input.product_id,
      variants: normalizedVariants,
      variants_to_delete: input.variants_to_delete || [],
      options: input.options || [],
    });

    // 5. Ensure options and values
    const missingOptionsResult = transform({ diffPlan }, (data) => data.diffPlan.missingOptions || []);
    ensureProductOptionsStep({
      product_id: input.product_id,
      missingOptions: missingOptionsResult,
    });

    const missingValuesResult = transform({ diffPlan }, (data) => data.diffPlan.missingOptionValues || {});
    ensureProductOptionValuesStep({
      product_id: input.product_id,
      missingOptionValues: missingValuesResult,
    });

    // 6. Prepare payloads
    const createsPayload = transform({ diffPlan, input }, (data) => {
      return (data.diffPlan.creates || []).map((v: any) => ({
        ...v,
        product_id: data.input.product_id,
      }));
    });

    const updatesPayload = transform({ diffPlan }, (data) => data.diffPlan.updates || []);
    const deletesPayload = transform({ diffPlan }, (data) => data.diffPlan.deletes || []);
    const inventoryPayload = transform({ diffPlan }, (data) => data.diffPlan.inventoryUpdates || []);

    // 7. Execute operations
    createProductVariantsWorkflow.runAsStep({
      input: { product_variants: createsPayload },
    });

    updateProductVariantsWorkflow.runAsStep({
      input: { product_variants: updatesPayload },
    });

    updateInventoryStep({
      inventoryUpdates: inventoryPayload,
      location_id: input.location_id,
    });

    const deletedVariantIds = transform(
      { diffPlan },
      (data) => data.diffPlan.deletes ?? []
    );

    deleteProductVariantsWorkflow.runAsStep({
      input: { ids: deletedVariantIds },
    });

    // 8. Get final product
    const product = getUpdatedProductStep({
      product_id: input.product_id,
    });

    return new WorkflowResponse({
      product: product as any,
    });
  }
);

export default updateVendorProductWorkflow;