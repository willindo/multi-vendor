// src/app/api/vendor/products/[id]/route.ts
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { validateVendorProductOwnership } from "../../../../utils/validate-vendor-ownership";
import deleteVendorProductWorkflow from "../../../../workflows/marketplace/delete-vendor-product";

export const PATCH = async (
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse,
) => {
  const product_id = req.params.id;
  const actor_id = req.auth_context.actor_id;

  // Ownership validation gate
  await validateVendorProductOwnership(req.scope, actor_id, product_id);

  const productService = req.scope.resolve(Modules.PRODUCT);
  const marketplaceService = req.scope.resolve("marketplace");

  const updateData: any = {};
  const coreFields = ['title', 'handle', 'description', 'status', 'subtitle', 'variants'];
  for (const field of coreFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  const updatedProduct = await productService.updateProducts(
    product_id,
    updateData,
  );

  if (req.body.apparel_detail !== undefined) {
    const [existingDetail] = await marketplaceService.listApparelDetails({ product_id });

    if (existingDetail) {
      await marketplaceService.updateApparelDetails([
        {
          id: existingDetail.id,
          ...req.body.apparel_detail,
        },
      ]);
    } else {
      await marketplaceService.createApparelDetails({
        product_id,
        ...req.body.apparel_detail,
      });
    }
  }

  res.json({ product: updatedProduct });
};

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const product_id = req.params.id;
  const actor_id = req.auth_context.actor_id;

  // 1. Ownership security gate
  await validateVendorProductOwnership(req.scope, actor_id, product_id);

  // 2. RUN WORKFLOW (Must pass req.scope into the instantiation function!)
  await deleteVendorProductWorkflow(req.scope).run({
    input: { product_id }
  });

  res.json({ deleted: true });
};