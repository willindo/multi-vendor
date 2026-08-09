// src/workflows/marketplace/delete-vendor-product/index.ts
import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { deleteProductsWorkflow, emitEventStep } from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

type DeleteInput = {
  product_id: string;
};

// =================================================================
// STEP 1: HYBRID CASCADING CLEANUP STEP (SOFT & HARD PURGE)
// =================================================================
const synchronizeSoftDeleteTimestampsStep = createStep(
  "synchronize-soft-delete-timestamps-step",
  async (input: { product_id: string }, { container }) => {
    const dbConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
    const logger = container.resolve("logger");

    const syncTimestamp = new Date();
    logger.info(`🔄 Running complete deep cascade cleanup for product: ${input.product_id}`);

    try {
      await dbConnection.transaction(async (trx) => {
        // 1. Resolve variant IDs strictly connected ONLY to this specific product shell
        const relatedVariants = await trx("product_variant")
          .select("id")
          .where({ product_id: input.product_id });

        const variantIds = relatedVariants
          .map((v: any) => v.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0);

        if (variantIds.length > 0) {
          // 2. Resolve isolated asset links bound directly to our sanitized variant pool
          const inventoryLinks = await trx("product_variant_inventory_item")
            .select("inventory_item_id")
            .whereIn("variant_id", variantIds);

          const inventoryItemIds = inventoryLinks
            .map((l: any) => l.inventory_item_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0);

          const priceLinks = await trx("product_variant_price_set")
            .select("price_set_id")
            .whereIn("variant_id", variantIds);

          const priceSetIds = priceLinks
            .map((p: any) => p.price_set_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0);

          // 3. FORCE STAMP CORE VARIANTS IN DATABASE BEFORE DROPPING LINKS
          await trx("product_variant")
            .whereIn("id", variantIds)
            .whereNull("deleted_at")
            .update({ deleted_at: syncTimestamp, updated_at: syncTimestamp });

          // 4. [FIXED ORDER] FIRST: HARD-DELETE THE BRIDGE CONNECTOR TABLES
          await trx("product_variant_inventory_item")
            .whereIn("variant_id", variantIds)
            .del();

          await trx("product_variant_price_set")
            .whereIn("variant_id", variantIds)
            .del();

          // 5. SECOND: HARD-DELETE GLOBAL MODULE ASSETS (Safe from unique SKU blocks)
          if (inventoryItemIds.length > 0) {
            await trx("inventory_item")
              .whereIn("id", inventoryItemIds)
              .del();
          }

          if (priceSetIds.length > 0) {
            // Drop individual prices first due to internal prices -> price_set relation
            await trx("price")
              .whereIn("price_set_id", priceSetIds)
              .del();

            await trx("price_set")
              .whereIn("id", priceSetIds)
              .del();
          }
        }

        // 6. STAMP CORE PRODUCT OPTIONS AND ATTRIBUTE VALUES
        await trx("product_option")
          .where({ product_id: input.product_id })
          .whereNull("deleted_at")
          .update({ deleted_at: syncTimestamp, updated_at: syncTimestamp });

        await trx("product_option_value")
          .whereIn("option_id", function () {
            this.select("id")
              .from("product_option")
              .where({ product_id: input.product_id });
          })
          .whereNull("deleted_at")
          .update({ deleted_at: syncTimestamp, updated_at: syncTimestamp });

        // 7. STAMP TENANT-ISOLATED VENDOR RECOGNITION MODELS
        await trx("marketplace_vendor_product_product")
          .where({ product_id: input.product_id })
          .whereNull("deleted_at")
          .update({ deleted_at: syncTimestamp, updated_at: syncTimestamp });

        await trx("apparel_detail")
          .where({ product_id: input.product_id })
          .whereNull("deleted_at")
          .update({ deleted_at: syncTimestamp, updated_at: syncTimestamp });

        // 8. ABSOLUTE HARD-PURGE FOR CLUTTER-PRONE INTERMEDIATE NO-TIMESTAMP PIVOTS
        await trx("product_sales_channel")
          .where({ product_id: input.product_id })
          .del();

        await trx("product_product_marketplace_apparel_detail")
          .where({ product_id: input.product_id })
          .del();

        logger.info("🟢 Fully validated hybrid soft/hard cascade transaction committed.");
      });
    } catch (error: any) {
      logger.error(`❌ Balanced cascade task encountered an error: ${error.message}`);
      throw error;
    }

    return new StepResponse({ success: true });
  },
);

// =================================================================
// MAIN MARKETPLACE DELETE WORKFLOW
// =================================================================
export const deleteVendorProductWorkflow = createWorkflow(
  "delete-vendor-product",
  (input: DeleteInput) => {
    // Execute custom balanced data synchronization step first
    synchronizeSoftDeleteTimestampsStep({ product_id: input.product_id });

    // Yield flow management to the core engine to safely mark the root node dead
    deleteProductsWorkflow.runAsStep({
      input: { ids: [input.product_id] },
    });
    emitEventStep({
      eventName: "product.deleted",
      data: {
        product_id: input.product_id,
      },
    })

    return new WorkflowResponse({ success: true });
  },
);

export default deleteVendorProductWorkflow;