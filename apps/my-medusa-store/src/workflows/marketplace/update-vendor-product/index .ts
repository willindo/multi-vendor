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
};

interface InventoryUpdateInput {
  inventory_item_id: string;
  stocked_quantity: number;
}

interface StepOutput {
  updatedCount: number;
  createdCount: number;
}

// ============================================================
// STEP DEFINITIONS
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

const syncApparelDetailStep = createStep(
  "sync-apparel-detail-step",
  async (input: { product_id: string; apparel_detail: any }, { container }) => {
    const marketplaceService = container.resolve("marketplace");
    const query = container.resolve("query");

    // Query the remote link layer safely using the global graph engine 
    // to bypass the module isolation error
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
      // If it doesn't exist yet, create a clean standalone record
      const newDetail = await marketplaceService.createApparelDetails({
        ...input.apparel_detail,
      });
      return new StepResponse({ apparel_detail_id: newDetail.id, isNew: true });
    }
  }
);

const ensureProductOptionsStep = createStep(
  "ensure-product-options-step",
  async (input: { product_id: string; missingOptions: any[] }, { container }) => {
    if (!input.missingOptions || input.missingOptions.length === 0) {
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

export const updateInventoryStep = createStep(
  "update-inventory-step",
  async (input: { inventoryUpdates: InventoryUpdateInput[] }, { container }): Promise<StepResponse<StepOutput>> => {
    const inventoryService = container.resolve(Modules.INVENTORY);

    if (!input.inventoryUpdates || input.inventoryUpdates.length === 0) {
      return new StepResponse({ updatedCount: 0, createdCount: 0 });
    }

    const itemIds = input.inventoryUpdates.map((iu) => iu.inventory_item_id);

    const existingLevels = await inventoryService.listInventoryLevels({
      inventory_item_id: itemIds,
    });

    const levelMap = new Map<string, any>();
    for (const lvl of existingLevels) {
      levelMap.set(lvl.inventory_item_id, lvl);
    }

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
          location_id: "default",
          stocked_quantity: update.stocked_quantity,
        });
      }
    }

    const executionPromises: Promise<any>[] = [];

    if (levelsToUpdate.length > 0) {
      executionPromises.push(inventoryService.updateInventoryLevels(levelsToUpdate));
    }

    if (levelsToCreate.length > 0) {
      const creationPromises = levelsToCreate.map((lc) =>
        inventoryService.createInventoryLevels(lc)
      );
      executionPromises.push(...creationPromises);
    }

    await Promise.all(executionPromises);

    return new StepResponse({
      updatedCount: levelsToUpdate.length,
      createdCount: levelsToCreate.length,
    });
  }
);

// FIX: Explicitly list nested properties instead of deeply chaining wildcards (.*)
const getUpdatedProductStep = createStep(
  "get-updated-product-step",
  async (input: { product_id: string }, { container }) => {
    const query = container.resolve("query");

    // Explicitly define fields just like your successful GET handler
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
        "apparel_detail.*",
      ],
      filters: {
        id: [input.product_id],
      },
    });

    return new StepResponse(products[0]);
  }
);
// ============================================================
// WORKFLOW DEFINITION
// ============================================================

export const updateVendorProductWorkflow = createWorkflow(
  "update-vendor-product",
  (input: WorkflowInput) => {
    // 1. Update core product fields
    updateProductStep({
      product_id: input.product_id,
      updateData: input.product,
    });

    // 2. Sync apparel detail (only if provided)
    const apparelResult = syncApparelDetailStep({
      product_id: input.product_id,
      apparel_detail: input.apparel_detail,
    });

    // Create remote link if apparel is new
    const apparelLinkPayload = transform({ input, apparelResult }, (data) => {
      if (!data.apparelResult || !data.apparelResult.isNew) {
        return [];
      }
      return [
        {
          [Modules.PRODUCT]: { product_id: data.input.product_id },
          [MARKETPLACE_MODULE]: { apparel_detail_id: data.apparelResult.apparel_detail_id },
        },
      ];
    });
    // const createRemoteLinkStep = container.resolve("createRemoteLinkStep");
    createRemoteLinkStep(apparelLinkPayload);

    // 3. Reconcile variants
    const diffPlan = reconcileVariantsStep({
      product_id: input.product_id,
      variants: input.variants || [],
      variants_to_delete: input.variants_to_delete || [],
      options: input.options || [],
    });

    // 4. Ensure options and values
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

    // 5. Prepare payloads purely for orchestration execution
    const createsPayload = transform({ diffPlan, input }, (data) => {
      return (data.diffPlan.creates || []).map((v: any) => ({
        ...v,
        product_id: data.input.product_id,
      }));
    });

    const updatesPayload = transform({ diffPlan }, (data) => data.diffPlan.updates || []);
    const deletesPayload = transform({ diffPlan }, (data) => data.diffPlan.deletes || []);
    const inventoryPayload = transform({ diffPlan }, (data) => data.diffPlan.inventoryUpdates || []);

    // 6. Execute variant operations safely outside transforms
    // Core sub-flows safely bypass operations natively if array collections are empty
    createProductVariantsWorkflow.runAsStep({
      input: { product_variants: createsPayload },
    });

    updateProductVariantsWorkflow.runAsStep({
      input: { product_variants: updatesPayload },
    });

    updateInventoryStep({
      inventoryUpdates: inventoryPayload,
    });

    deleteProductVariantsWorkflow.runAsStep({
      input: { ids: deletesPayload },
    });

    // 7. Get final enriched item state
    const product = getUpdatedProductStep({
      product_id: input.product_id,
    });

    return new WorkflowResponse({
      product: product as any,
    });
  }
);

export default updateVendorProductWorkflow;