// ==== ./src/workflows / marketplace / update - vendor - product / reconcile.ts ====
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export type ReconcileSalesChannelsInput = {
  product_id: string;
  sales_channel_ids?: string[]; // Desired target channel IDs
};

type ReconcileSalesChannelsOutput = {
  linked: string[];
  unlinked: string[];
};

type ReconcileSalesChannelsRollback = {
  product_id: string;
  previously_linked: string[];
  previously_unlinked: string[];
};

export const reconcileSalesChannelsStep = createStep(
  "reconcile-sales-channels-step",
  async (
    input: ReconcileSalesChannelsInput,
    { container }
  ): Promise<StepResponse<ReconcileSalesChannelsOutput, ReconcileSalesChannelsRollback>> => {
    if (!input.sales_channel_ids) {
      return new StepResponse(
        { linked: [], unlinked: [] },
        { product_id: input.product_id, previously_linked: [], previously_unlinked: [] }
      );
    }

    const query = container.resolve("query");
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    // 1. Get currently linked sales channels for the product
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "sales_channels.id"],
      filters: { id: input.product_id },
    });

    const product = products[0] as {
      id: string;
      sales_channels?: { id: string }[];
    } | undefined;

    const currentChannelIds = new Set(
      product?.sales_channels?.map((sc) => sc.id) || []
    );
    const targetChannelIds = new Set(input.sales_channel_ids);

    const toLink: string[] = [];
    const toUnlink: string[] = [];

    // Determine channels to add
    for (const channelId of targetChannelIds) {
      if (!currentChannelIds.has(channelId)) {
        toLink.push(channelId);
      }
    }

    // Determine channels to remove
    for (const channelId of currentChannelIds) {
      if (!targetChannelIds.has(channelId)) {
        toUnlink.push(channelId);
      }
    }

    // 2. Execute Linking
    const linksToCreate = toLink.map((channelId) => ({
      [Modules.PRODUCT]: { product_id: input.product_id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: channelId },
    }));

    if (linksToCreate.length) {
      await remoteLink.create(linksToCreate);
    }

    // 3. Execute Unlinking
    const linksToDismiss = toUnlink.map((channelId) => ({
      [Modules.PRODUCT]: { product_id: input.product_id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: channelId },
    }));

    if (linksToDismiss.length) {
      await remoteLink.dismiss(linksToDismiss);
    }

    return new StepResponse(
      { linked: toLink, unlinked: toUnlink },
      {
        product_id: input.product_id,
        previously_linked: toUnlink, // Restore unlinked channels on rollback
        previously_unlinked: toLink, // Remove newly linked channels on rollback
      }
    );
  },
  // Rollback Compensation
  async (rollbackData, { container }) => {
    if (!rollbackData) return;
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    // Re-link what was unlinked
    if (rollbackData.previously_linked?.length) {
      await remoteLink.create(
        rollbackData.previously_linked.map((channelId) => ({
          [Modules.PRODUCT]: { product_id: rollbackData.product_id },
          [Modules.SALES_CHANNEL]: { sales_channel_id: channelId },
        }))
      );
    }

    // Re-dismiss what was added
    if (rollbackData.previously_unlinked?.length) {
      await remoteLink.dismiss(
        rollbackData.previously_unlinked.map((channelId) => ({
          [Modules.PRODUCT]: { product_id: rollbackData.product_id },
          [Modules.SALES_CHANNEL]: { sales_channel_id: channelId },
        }))
      );
    }
  }
);