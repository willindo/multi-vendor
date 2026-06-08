import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { addToCartWorkflow } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";

type AddLineItemBody = {
  variant_id: string;
  quantity: number;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cartId = req.params.id;
  const { variant_id, quantity } = req.body as AddLineItemBody;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // 1. Fetch Vendor details (ID and Name) through the Link
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "variants.id",
      "vendor.id",
      "vendor.handle",
      "vendor.name", // Added name for your UI
    ],
    filters: {
      variants: { id: [variant_id] },
    },
  });

  const product = products[0];
  const vendor = Array.isArray(product?.vendor)
    ? product.vendor[0]
    : product?.vendor;

  if (!vendor?.id) {
    return res
      .status(400)
      .json({ message: "This product is not linked to a vendor." });
  }

  // 2. Run Workflow with full metadata
  // This ensures the line item is created/updated with the correct parcel info
  const { result, errors } = await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      items: [
        {
          variant_id,
          quantity,
          metadata: {
            vendor_id: vendor.id,
            vendor_name: vendor.name || vendor.handle || "Unknown Vendor",
          },
        },
      ],
    },
    throwOnError: false,
  });

  if (errors?.length) {
    return res.status(400).json({ message: "Workflow Error", errors });
  }

  // 3. Retrieve the specific line item from the workflow result securely
  const cartModule = req.scope.resolve(Modules.CART);

  // Ensure relations are loaded safely if your service configuration requires it
  const cart = await cartModule.retrieveCart(cartId, {
    select: ["items.*"],
  });

  // ⚡ TypeScript Fix: Use optional chaining (?.) and fallback to an empty array
  const latestItem = (cart?.items || []).find(
    (i) => i.variant_id === variant_id,
  );

  if (!latestItem) {
    return res.status(404).json({
      success: false,
      message: `Variant ${variant_id} was not found inside the updated cart array.`,
    });
  }

  return res.json({
    success: true,
    item: latestItem,
  });
}
