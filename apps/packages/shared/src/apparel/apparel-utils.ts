import type { ApparelDetails } from "./apparel-types"
import { DEFAULT_APPAREL_DETAILS } from "./apparel-defaults"

export function createDefaultApparelDetails(): ApparelDetails {
  return {
    ...DEFAULT_APPAREL_DETAILS,
  }
}

export function mergeApparelDetails(
  partial?: Partial<ApparelDetails> | null
): ApparelDetails {
  return {
    ...DEFAULT_APPAREL_DETAILS,
    ...(partial ?? {}),
  }
}

export function normalizeApparelDetails(
  details?: Partial<ApparelDetails> | null
): ApparelDetails {
  return mergeApparelDetails(details)
}

export function isEmptyString(value?: string | null): boolean {
  return value == null || value.trim() === ""
}

export function hasApparelDetails(
  details?: Partial<ApparelDetails> | null
): boolean {
  if (!details) {
    return false
  }

  return Object.keys(details).length > 0
}

export function serializeApparelDetails(
  details: ApparelDetails
): ApparelDetails {
  return {
    ...details,
  }
}

export function deserializeApparelDetails(
  data?: unknown
): ApparelDetails {
  if (!data || typeof data !== "object") {
    return createDefaultApparelDetails()
  }

  return normalizeApparelDetails(
    data as Partial<ApparelDetails>
  )
}