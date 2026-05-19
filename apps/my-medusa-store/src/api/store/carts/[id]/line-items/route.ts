import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { addToCartWorkflow } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import { ICartModuleService } from "@medusajs/framework/types";
import vendorOrder from "../../../../../links/vendor-order";

type AddLineItemBody = {
  variant_id: string;
  quantity: number;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("CUSTOM LINE-ITEM ROUTE HIT");
  const cartId = req.params.id;
  const { variant_id, quantity } = req.body as AddLineItemBody;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  //   const { data: vendorOrders } = await query.graph({
  //   entity: vendorOrder.entryPoint,
  //   fields: ["*", "vendor.*", "order.*"],
  //   filters: {
  //     order_id: "order_01KRD8X59DV4CVSVFQ8DPYSDSC" // Your recent Order ID
  //   }
  // })

  // console.log(vendorOrders)
  /**
   * 🔍 Step 1 — Fetch vendor_id from variant
   */
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id"],
    filters: { id: variant_id },
  });
  console.log("Variant:", variant_id);

  const productId = variants[0]?.product_id;
  if (!productId) {
    throw new Error(`Could not find product_id for variant: ${variant_id}`);
  }
  /**
   * 🔗 Get vendor from link table
   */
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "vendor.*"],
    filters: { id: productId },
  });

  console.log("Full Product Data:", JSON.stringify(products[0], null, 2));
  const rawVendor = products[0]["vendor"];
  // const rawVendor = products[0]?.vendor;
  const vendorId = Array.isArray(rawVendor) ? rawVendor[0]?.id : rawVendor?.id;

  console.log("Extracted Vendor ID:", vendorId);

  if (!vendorId) {
    return res.status(400).json({ message: "Vendor not linked to product" });
  }
  /**
   * 🛒 Step 2 — Use Medusa workflow
   */
  const { result, errors } = await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      items: [{ variant_id, quantity, metadata: { vendor_id: vendorId } }],
    },
    throwOnError: false,
  });

  if (errors?.length) {
    return res.status(400).json({ message: "Workflow Error", errors });
  }
  /**
   * 🧩 Step 3 — Inject vendor_id (extend, not replace)
   */
  const cartService = req.scope.resolve(Modules.CART) as ICartModuleService;

  const cartItems = await cartService.listLineItems({
    cart_id: cartId,
    variant_id: variant_id,
  });

  if (!cartItems.length) {
    return res.status(400).json({
      message: "Item was not added. Check inventory/backorder settings.",
    });
  }

  /**
   * 📤 Step 4 — return clean response
   */
  return res.json({
    success: true,
    item: cartItems[0],
  });
}
