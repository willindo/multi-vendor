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

type Input = {
  vendor_admin_id: string;
  product: CreateProductWorkflowInputDTO;
  apparel_detail: any;
};

// =================================================================
// STEP پاس: PERSIST APPAREL METADATA DATA INTO CUSTOM STORAGE MODULE
// =================================================================
const createApparelDetailStep = createStep(
  "create-apparel-detail-step",
  async (input: { product_id: string; apparel_detail: any }, { container }) => {
    const marketplaceService = container.resolve("marketplace");
    
    const detail = await marketplaceService.createApparelDetails({
      product_id: input.product_id,
      ...input.apparel_detail
    });

    return new StepResponse(detail, detail.id);
  },
  async (detailId, { container }) => {
    const marketplaceService = container.resolve("marketplace");
    if (detailId) {
      await marketplaceService.deleteApparelDetails([detailId]);
    }
  }
);

// =================================================================
// WORKFLOW ENTRYPOINT
// =================================================================
export const createVendorProductWorkflow = createWorkflow(
  "create-vendor-product",
  (input: Input) => {
    // 1. Fetch sales channels
    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["default_sales_channel_id"],
    }).config({ name: "get-store" });

    // 2. Clear payload transitions using standard schemas
    const productData = transform({ input, stores }, (data) => ({
      products: [
        {
          ...data.input.product,
          sales_channels: [{ id: data.stores[0].default_sales_channel_id }],
        },
      ],
    }));

    // 3. Hand off core structural setup tasks to Medusa engine
    const created = createProductsWorkflow.runAsStep({
      input: productData as CreateProductsWorkflowInput,
    });

    // 4. Save clean data representation into apparel_detail table
    const apparelDetail = createApparelDetailStep({
      product_id: created[0].id,
      apparel_detail: input.apparel_detail
    });

    // 5. Look up corresponding system vendor admins
    const { data: vendorAdmins } = useQueryGraphStep({
      entity: "vendor_admin",
      fields: ["id", "vendor.id"],
      filters: {
        id: input.vendor_admin_id,
      },
    }).config({ name: "get-vendor-admin" });

    // 6. Generate secure remote links
    const links = transform({ created, vendorAdmins, apparelDetail }, (data) => {
      if (!data.vendorAdmins.length || !data.vendorAdmins[0].vendor) {
        throw new Error("Vendor context validation failed for this actor.");
      }

      const product_id = data.created[0].id;
      const vendor_id = data.vendorAdmins[0].vendor.id;
      const apparel_detail_id = data.apparelDetail.id;

      return [
        {
          [MARKETPLACE_MODULE]: { vendor_id },
          [Modules.PRODUCT]: { product_id },
        },
        {
          [Modules.PRODUCT]: { product_id },
          [MARKETPLACE_MODULE]: { apparel_detail_id }
        }
      ];
    });
    
    createRemoteLinkStep(links);

    // 7. Resolve compiled database elements
    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: ["*", "variants.*"],
      filters: {
        id: created[0].id,
      },
    }).config({ name: "get-product" });

    return new WorkflowResponse({
      product: products[0] as any,
    });
  },
);

export default createVendorProductWorkflow;