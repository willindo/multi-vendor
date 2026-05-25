"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { searchMarketplaceProducts } from "@lib/meilisearch-client"

export default function InstantSearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([])
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      try {
        // This function handles the network boundary directly, keeping secrets out of the browser
        const hits = await searchMarketplaceProducts(searchTerm)
        setResults(hits)
      } catch (error) {
        console.error("Search extraction error:", error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 200) // 200ms debounce buffer to limit excessive server calls

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* 📥 Input Shell */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search items, vendor lines, categories..."
          className="w-full px-4 py-2.5 bg-white border border-ui-border-base rounded-md text-small-regular placeholder-ui-fg-muted focus:outline-none focus:border-ui-fg-interactive transition-colors shadow-sm text-black"
        />
        {isSearching && (
          <div className="absolute right-3 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-ui-border-base border-t-ui-fg-interactive" />
        )}
      </div>

      {/* 📤 Live Result Overlay Dropdown */}
      {results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-ui-border-base rounded-lg shadow-xl overflow-hidden z-50 divide-y divide-ui-border-base max-h-80 overflow-y-auto">
          {results.map((hit) => (
            <Link
              key={hit.id}
              href={`/products/${hit.handle}`}
              className="block p-4 hover:bg-ui-bg-subtle/40 transition-colors group"
              onClick={() => setResults([])}
            >
              <div className="flex flex-col">
                <span className="text-small-semi text-ui-fg-base group-hover:text-ui-fg-interactive transition-colors">
                  {hit.title}
                </span>
                {hit.description && (
                  <span className="text-xsmall-regular text-ui-fg-subtle line-clamp-1 mt-0.5">
                    {hit.description}
                  </span>
                )}
                {/* Custom multi-vendor meta attribute if sync'd down */}
                {hit.vendor_handle && (
                  <span className="inline-block mt-1 text-[10px] font-mono uppercase bg-ui-bg-subtle text-ui-fg-muted px-1.5 py-0.5 rounded w-fit">
                    Merchant: {hit.vendor_handle}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}