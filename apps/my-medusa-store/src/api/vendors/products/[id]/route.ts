import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { validateAndCleanApparelInput } from "@/utils/apparel-guard";
import { validateVendorProductOwnership } from "@/utils/validate-vendor-ownership";
import deleteVendorProductWorkflow from "@/workflows/marketplace/delete-vendor-product";
import updateVendorProductWorkflow from "@/workflows/marketplace/update-vendor-product";

export const PATCH = async (
  req: AuthenticatedMedusaRequest<any>,
  res: MedusaResponse,
) => {
  const product_id = req.params.id;
  const actor_id = req.auth_context.actor_id;

  // 1. Ownership security gate
  await validateVendorProductOwnership(req.scope, actor_id, product_id);

  // 2. Clear & normalize custom apparel properties if present in the payload
  const apparelData = req.body.apparel_detail 
    ? validateAndCleanApparelInput(req.body) 
    : undefined;

  // 3. Map standard core product metadata entries
  const updateData: any = {};
  const coreFields = ["title", "handle", "description", "status", "subtitle", "weight"];
  for (const field of coreFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  // 4. Run the state-based reconciliation pipeline
  const { result } = await updateVendorProductWorkflow(req.scope).run({
    input: {
      product_id,
      product: updateData,
      variants: req.body.variants || [], // Declared target state for variants matrix
      options: req.body.options || [],   // Reconstructed product options matrix
      apparel_detail: apparelData,
    },
  });

  return res.json({ 
    product: result.product 
  });
};

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const product_id = req.params.id;
  const actor_id = req.auth_context.actor_id;

  // 1. Ownership security gate
  await validateVendorProductOwnership(req.scope, actor_id, product_id);

  // 2. Trigger the cascading hard-purge workflow pipeline
  await deleteVendorProductWorkflow(req.scope).run({
    input: { product_id }
  });

  return res.json({ 
    deleted: true 
  });
};