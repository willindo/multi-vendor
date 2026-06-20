import { 
  createWorkflow, 
  createStep, 
  StepResponse, 
  WorkflowResponse,
  transform
} from "@medusajs/framework/workflows-sdk";
import { 
  updateProductsWorkflow, 
  createProductVariantsWorkflow, 
  updateProductVariantsWorkflow, 
  deleteProductVariantsWorkflow,
  createRemoteLinkStep,
  useQueryGraphStep 
} from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import { MARKETPLACE_MODULE } from "../../../modules/marketplace";
import { reconcileVariantsStep } from "./reconcile";

type WorkflowInput = {
  product_id: string;
  product: any;
  variants: any[];
  options: any[];
  apparel_detail?: any;
};

// Isolated mutation step for apparel data properties
const syncApparelDetailStep = createStep(
  "sync-apparel-detail-step",
  async (input: { product_id: string; apparel_detail: any }, { container }) => {
    const marketplaceService = container.resolve("marketplace");
    const [existing] = await marketplaceService.listApparelDetails({ product_id: input.product_id });

    if (existing) {
      await marketplaceService.updateApparelDetails([{ id: existing.id, ...input.apparel_detail }]);
      return new StepResponse({ apparel_detail_id: existing.id, isNew: false });
    } else {
      const newDetail = await marketplaceService.createApparelDetails({ 
        product_id: input.product_id, 
        ...input.apparel_detail 
      });
      return new StepResponse({ apparel_detail_id: newDetail.id, isNew: true });
    }
  }
);

const ensureProductOptionsStep = createStep(
  "ensure-product-options-step",
  async (input: { product_id: string; missingOptions: any[] }, { container }) => {
    if (!input.missingOptions || input.missingOptions.length === 0) {
      return new StepResponse([] as any[]);
    }
    const productService = container.resolve(Modules.PRODUCT);
    
    const createdOptions = await productService.createProductOptions(
      input.missingOptions.map(opt => ({
        product_id: input.product_id,
        title: opt.title,
        values: opt.values || []
      }))
    );
    return new StepResponse(createdOptions);
  }
);

export const updateVendorProductWorkflow = createWorkflow(
  "update-vendor-product",
  (input: WorkflowInput) => {
    // 1. Update core fields via native step execution paths
    updateProductsWorkflow.runAsStep({
      input: {
        products: [
          { 
            id: input.product_id, 
            ...input.product 
          }
        ]
      }
    });

    // 2. Compute the pure state difference plan matrix wrapper proxy
    const diffPlan = reconcileVariantsStep({
      product_id: input.product_id,
      variants: input.variants,
      options: input.options,
    });

    // 3. Register missing option parameters if adding items to options list
    ensureProductOptionsStep({
      product_id: input.product_id,
      missingOptions: diffPlan.missingOptions
    });

    // 4. Synchronize apparel metadata rows cleanly
    let apparelLinkPayload: any = null;
    if (input.apparel_detail) {
      const apparelResult = syncApparelDetailStep({ 
        product_id: input.product_id, 
        apparel_detail: input.apparel_detail 
      });

      // 5. Build secure remote link payload via transform
      apparelLinkPayload = transform({ input, apparelResult }, (data) => {
        if (!data.apparelResult.isNew) return [];
        return [
          {
            [Modules.PRODUCT]: { product_id: data.input.product_id },
            [MARKETPLACE_MODULE]: { apparel_detail_id: data.apparelResult.apparel_detail_id }
          }
        ];
      });
      
      createRemoteLinkStep(apparelLinkPayload);
    }

    // 🔀 6. TRANSFORM STEP LOGIC: Safely unwrap and map variant payload properties at runtime
    const variantsPayloads = transform({ input, diffPlan }, (data) => {
      const createsPayload = (data.diffPlan.creates || []).map((v: any) => ({
        ...v,
        product_id: data.input.product_id,
      }));

      return {
        creates: createsPayload,
        updates: data.diffPlan.updates || [],
        deletes: data.diffPlan.deletes || []
      };
    });

    // 7. Run native variant creation pipelines with runtime-safe transformed data
    createProductVariantsWorkflow.runAsStep({
      input: {
        product_variants: variantsPayloads.creates
      }
    });

    // 8. Run native variant update pipelines
    updateProductVariantsWorkflow.runAsStep({
      input: {
        product_variants: variantsPayloads.updates
      }
    });

    // 9. Run native variant removal flows for elements removed from state
    deleteProductVariantsWorkflow.runAsStep({
      input: {
        ids: variantsPayloads.deletes
      }
    });

    // 10. Fetch the final updated product graph across all custom/native databases
    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "description",
        "status",
        "weight",
        "variants.*",
        "variants.options.*",
        "apparel_detail.*"
      ],
      filters: {
        id: input.product_id,
      },
    }).config({ name: "get-resolved-updated-product" });

    return new WorkflowResponse({
      product: products[0],
    });
  }
);

export default updateVendorProductWorkflow;