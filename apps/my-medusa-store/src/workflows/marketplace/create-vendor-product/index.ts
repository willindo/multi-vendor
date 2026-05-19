import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types";
import {
  createWorkflow,
  transform,
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
};

const createVendorProductWorkflow = createWorkflow(
  "create-vendor-product",
  (input: Input) => {
    // 1️⃣ Get default sales channel
    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["default_sales_channel_id"],
    }).config({ name: "get-store" });

    // 2️⃣ Prepare product
    const productData = transform({ input, stores }, (data) => ({
      products: [
        {
          ...data.input.product,
          sales_channels: [{ id: data.stores[0].default_sales_channel_id }],
        },
      ],
    }));

    // 3️⃣ Create product
    const created = createProductsWorkflow.runAsStep({
      input: productData as CreateProductsWorkflowInput,
    });

    // 4️⃣ Get vendor_id from vendor_admin

    const { data: vendorAdmins } = useQueryGraphStep({
      entity: "vendor_admin",
      // fields: ["id"],
      //  fields: ["vendor.id"],
      fields: ["id", "vendor.id"],
      filters: {
        id: input.vendor_admin_id,
      },
    }).config({ name: "get-vendor-admin" });

    // 5️⃣ Create link (THIS IS THE CORE)
    const links = transform({ created, vendorAdmins }, (data) => {
      if (!data.vendorAdmins.length || !data.vendorAdmins[0].vendor) {
        throw new Error("Vendor not found for vendor_admin");
      }

      return data.created.map((product) => ({
        [MARKETPLACE_MODULE]: {
          vendor_id: data.vendorAdmins[0].vendor.id,
        },
        [Modules.PRODUCT]: {
          product_id: product.id,
        },
      }));
    });
    createRemoteLinkStep(links);

    // 6️⃣ Return product
    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: ["*", "variants.*"],
      filters: {
        id: created[0].id,
      },
    }).config({ name: "get-product" });

    return new WorkflowResponse({
      product: products[0] as any ,
    });
  },
);

export default createVendorProductWorkflow;

