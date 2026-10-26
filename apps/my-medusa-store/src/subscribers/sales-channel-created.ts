// src/subscribers/sales-channel-created.ts
import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { ensureChannelHasLocation } from "../lib/ensure-channel-location"

export default async function salesChannelCreatedHandler({
    event,
    container,
}: SubscriberArgs<{ id: string }>) {
    const channelId = event.data.id
    if (!channelId) return

    try {
        await ensureChannelHasLocation(container, channelId)
    } catch (err) {
        console.error(
            `[marketplace] Failed to ensure location for sales channel ${channelId}:`,
            err
        )
    }
}

export const config: SubscriberConfig = {
    event: "sales-channel.created",
}