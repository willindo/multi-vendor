import type { ApparelDetails } from "@shared/apparel/apparel-types"
import {
    DEFAULT_APPAREL_DETAILS,
} from "@shared/apparel/apparel-defaults"
/**
 * Build apparel payload before sending to the backend.
 *
 * - removes undefined fields
 * - removes empty optional fields
 * - strips attributes not applicable to the selected garment category
 */
export function hydrateApparel(
    apparel?: ApparelDetails
): ApparelDetails {

    return {
        ...DEFAULT_APPAREL_DETAILS,
        ...(apparel ?? {}),
    }
}

export function buildApparelPayload(
    apparel: ApparelDetails
): Partial<ApparelDetails> {
    const payload: Partial<ApparelDetails> = {
        ...apparel,
    }

    // Remove empty optional values
    if (!payload.garment_subcategory) {
        delete payload.garment_subcategory
    }

    // Bottom garments don't use upper-body attributes
    if (payload.garment_category === "BOTTOM") {
        delete payload.sleeve_type
        delete payload.neck_type
    }

    // Remove undefined values
    for (const key of Object.keys(payload) as Array<keyof ApparelDetails>) {
        if (payload[key] === undefined) {
            delete payload[key]
        }
    }

    return payload
}