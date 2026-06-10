import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { addToCartWorkflow } from "@medusajs/medusa/core-flows";

type AddLineItemBody = {
  variant_id: string;
  quantity: number;
};

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const cartId = req.params.id;
  const { variant_id, quantity } = req.body as AddLineItemBody;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  try {
    // 1. Fetch Vendor details securely through the Medusa Graph Link
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "variants.id",
        "vendor.id",
        "vendor.handle",
        "vendor.name",
      ],
      filters: {
        variants: { id: [variant_id] },
      },
    });

    const product = products?.[0];
    const vendor = Array.isArray(product?.vendor)
      ? product.vendor[0]
      : product?.vendor;

    if (!vendor?.id) {
      res.status(400).json({ message: "This product is not linked to a valid vendor profile." });
      return;
    }

    // 2. Run standard Core Workflow to keep inventory/pricing states healthy
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
      res.status(400).json({ message: "Workflow processing execution failed.", errors });
      return;
    }

    // 3. Fetch line items using the cart module
    const cartModule = req.scope.resolve(Modules.CART);
    const cart = await cartModule.retrieveCart(cartId, {
      select: ["items.*"],
    });

    const latestItem = (cart?.items || []).find(
      (item) => item.variant_id === variant_id
    );

    if (!latestItem) {
      res.status(404).json({
        success: false,
        message: `Variant ${variant_id} was not found inside the updated cart context arrays.`,
      });
      return;
    }

    res.json({
      success: true,
      item: latestItem,
    });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to manage cart item updates.", error: (error as Error).message });
    return;
  }
}