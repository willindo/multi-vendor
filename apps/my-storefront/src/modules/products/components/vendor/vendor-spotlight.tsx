// src/modules/products/components/vendor/vendor-spotlight.tsx
import React from "react"
import Link from "next/link"

interface VendorSpotlightProps {
  vendorId?: string
  vendorName?: string
  countryCode: string
}

export default function VendorSpotlight({ vendorId, vendorName, countryCode }: VendorSpotlightProps) {
  if (!vendorId) return null

  const displayName = vendorName || "Featured Artisan"

  return (
    <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl flex flex-col gap-y-3 transition-all hover:border-neutral-200 shadow-sm">
      <div className="flex items-start gap-x-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-semibold tracking-wider select-none">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-emerald-600 font-bold block">
            Direct Partner
          </span>
          <h4 className="text-sm font-semibold text-neutral-950 leading-tight">
            {displayName}
          </h4>
        </div>
      </div>

      <p className="text-xs text-neutral-500 leading-normal">
        This premium composition fulfills and ships directly from the partner's dedicated facility.
      </p>

      <Link
        href={`/${countryCode}/vendors/${vendorId}`}
        className="block w-full text-center py-2 bg-white border border-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all shadow-xs"
      >
        View Collection
      </Link>
    </div>
  )
}