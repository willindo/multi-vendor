// /src/api/store/carts/[id]/line-items/route.ts
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
    // 1. Fetch Vendor details securely through Medusa Graph Link
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "variants.id",
        "variants.metadata",
        "vendor.id",
        "vendor.handle",
        "vendor.name",
      ],
      filters: {
        variants: { id: [variant_id] },
      },
    });

    console.log(`📦 [Line Item] Found ${products?.length || 0} products`);
    const product = products?.[0];
    const vendor = Array.isArray(product?.vendor)
      ? product.vendor[0]
      : product?.vendor;

    console.log(`📦 [Line Item] Found vendor ${JSON.stringify(vendor)}`);
    if (!vendor?.id) {
      res.status(400).json({ message: "This product is not linked to a valid vendor profile." });
      return;
    }

    // 2. Run standard Core Workflow
    const { result, errors } = await addToCartWorkflow(req.scope).run({
      input: {
        cart_id: cartId,
        items: [
          {
            variant_id,
            quantity: Number(quantity),
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
      console.error("❌ [addToCartWorkflow] Errors:", JSON.stringify(errors, null, 2));
      const firstError = errors[0]?.error?.message || "Workflow processing execution failed.";

      res.status(400).json({
        message: firstError,
        errors,
      });
      return;
    }
    // Fetch line item via Query Graph for accurate, fresh relations
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "items.*", "items.metadata"],
      filters: { id: cartId },
    });

    const cart = carts?.[0];
    const latestItem = cart?.items?.find((item: any) => item.variant_id === variant_id);

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
    console.error("❌ [Line Item Route Exception]:", error);
    res.status(500).json({
      message: "Failed to manage cart item updates.",
      error: (error as Error).message,
    });
    return;
  }
}