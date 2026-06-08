// src/workflows/marketplace/create-vendor-product/index.ts
import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types";
import {
  createWorkflow,
  transform,
  createStep, // 👈 Import step generator tools
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

// 1️⃣ Type Definition Updated here
type Input = {
  vendor_admin_id: string;
  product: CreateProductWorkflowInputDTO;
  apparel_detail: any; // 👈 Add property to layout definition parameters
};

// 2️⃣ Create a dedicated transactional step to persist Apparel DNA inside the custom module
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
    // Compensation logic for transactional rollback
    const marketplaceService = container.resolve("marketplace");
    if (detailId) {
      await marketplaceService.deleteApparelDetails([detailId]);
    }
  }
);

const createVendorProductWorkflow = createWorkflow(
  "create-vendor-product",
  (input: Input) => {
    // Get default sales channel
    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["default_sales_channel_id"],
    }).config({ name: "get-store" });

    // Prepare product
    const productData = transform({ input, stores }, (data) => ({
      products: [
        {
          ...data.input.product,
          sales_channels: [{ id: data.stores[0].default_sales_channel_id }],
        },
      ],
    }));

    // Create product
    const created = createProductsWorkflow.runAsStep({
      input: productData as CreateProductsWorkflowInput,
    });

    // 3️⃣ EXECUTE: Save Apparel DNA and establish Module Links
    const apparelDetail = createApparelDetailStep({
      product_id: created[0].id,
      apparel_detail: input.apparel_detail
    });

    // Get vendor_id from vendor_admin
    const { data: vendorAdmins } = useQueryGraphStep({
      entity: "vendor_admin",
      fields: ["id", "vendor.id"],
      filters: {
        id: input.vendor_admin_id,
      },
    }).config({ name: "get-vendor-admin" });

    // Assemble dual links targeting both Vendor assignment and Apparel specs 
    const links = transform({ created, vendorAdmins, apparelDetail }, (data) => {
      if (!data.vendorAdmins.length || !data.vendorAdmins[0].vendor) {
        throw new Error("Vendor not found for vendor_admin");
      }

      const product_id = data.created[0].id;
      const vendor_id = data.vendorAdmins[0].vendor.id;
      const apparel_detail_id = data.apparelDetail.id;

      return [
        // Link 1: Connects Vendor to Core Product
        {
          [MARKETPLACE_MODULE]: { vendor_id },
          [Modules.PRODUCT]: { product_id },
        },
        // Link 2: Connects Apparel Custom Details to Core Product
        {
          [Modules.PRODUCT]: { product_id },
          [MARKETPLACE_MODULE]: { apparel_detail_id }
        }
      ];
    });
    
    createRemoteLinkStep(links);

    // Return product
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