// /src/api/store/carts/[id]/line-items/route.ts
import { ensureChannelHasLocation } from "@/lib/ensure-channel-location";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
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
    // ── 1. Resolve the cart's sales channel FIRST, and ensure it has a location
    //       BEFORE addToCartWorkflow runs its inventory confirmation step.
    const { data: cartMeta } = await query.graph({
      entity: "cart",
      fields: ["id", "sales_channel_id"],
      filters: { id: cartId },
    });

    const salesChannelId = cartMeta?.[0]?.sales_channel_id;
    if (!salesChannelId) {
      res.status(400).json({
        message: `Cart ${cartId} has no sales channel — cannot confirm inventory.`,
      });
      return;
    }

    // Idempotent: no-ops if the channel already has a location,
    // or if it is not the store's default channel (multi-tenant safe).
    await ensureChannelHasLocation(req.scope, salesChannelId);

    // ── 2. Vendor lookup (unchanged)
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
      filters: { variants: { id: [variant_id] } },
    });

    const product = products?.[0];
    const vendor = Array.isArray(product?.vendor)
      ? product.vendor[0]
      : product?.vendor;

    if (!vendor?.id) {
      res.status(400).json({
        message: "This product is not linked to a valid vendor profile.",
      });
      return;
    }

    // ── 3. Run addToCartWorkflow (inventory confirmation will now succeed)
    const { errors } = await addToCartWorkflow(req.scope).run({
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
      console.error(
        "❌ [addToCartWorkflow] Errors:",
        JSON.stringify(errors, null, 2)
      );
      res.status(400).json({
        message: errors[0]?.error?.message || "Workflow execution failed.",
        errors,
      });
      return;
    }

    // ── 4. Re-read the cart to return the fresh line item
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "items.*", "items.metadata", "sales_channel_id"],
      filters: { id: cartId },
    });

    const cart = carts?.[0];
    const latestItem = cart?.items?.find(
      (item: any) => item.variant_id === variant_id
    );

    if (!latestItem) {
      res.status(404).json({
        success: false,
        message: `Variant ${variant_id} not found after cart update.`,
      });
      return;
    }

    res.json({ success: true, item: latestItem });
  } catch (error) {
    console.error("❌ [Line Item Route Exception]:", error);
    res.status(500).json({
      message: "Failed to manage cart item updates.",
      error: (error as Error).message,
    });
  }
}