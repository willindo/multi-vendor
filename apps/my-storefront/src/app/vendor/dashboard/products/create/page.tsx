"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Item } from "@radix-ui/react-accordion"

interface StockTier {
  id: string
  tierName: string
  price: number
  quantity: number
}

interface MetadataItem {
  id: string
  key: string
  value: string
}

export default function CreateProductForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Mock Vendor Association (Replace with your actual auth context hook)
  const currentVendor = {
    id: "01KQFQ4RA5SZ61CFJGCK4EYT1Q",
    name: "Acme Distribution",
  }

  // 2. Form States
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [handle, setHandle] = useState("")

  // Advanced tracking states
  const [stockTiers, setStockTiers] = useState<StockTier[]>([
    {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 9),
      tierName: "Standard Retail",
      price: 0.0,
      quantity: 10,
    },
  ])
  const [metadata, setMetadata] = useState<MetadataItem[]>([
    {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 9),
      key: "",
      value: "",
    },
  ])
  const generateId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9)
  // 3. Dynamic Handlers
  const handleAddTier = () => {
    setStockTiers([
      ...stockTiers,
      { id: generateId(), tierName: "", price: 0.0, quantity: 0 },
    ])
  }

  const handleRemoveTier = (id: string) => {
    setStockTiers(stockTiers.filter((tier) => tier.id !== id))
  }

  const handleTierChange = (
    id: string,
    field: keyof StockTier,
    value: string | number
  ) => {
    setStockTiers(
      stockTiers.map((tier) =>
        tier.id === id ? { ...tier, [field]: value } : tier
      )
    )
  }

  const handleAddMetadata = () => {
    setMetadata([...metadata, { id: generateId(), key: "", value: "" }])
  }

  const handleRemoveMetadata = (id: string) => {
    setMetadata(metadata.filter((item) => item.id !== id))
  }

  const handleMetadataChange = (
    id: string,
    field: keyof MetadataItem,
    value: string
  ) => {
    setMetadata(
      metadata.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  // 4. Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Format metadata arrays into a clean lookup object
    const cleanMetadata = metadata.reduce((acc, curr) => {
      if (curr.key.trim()) acc[curr.key.trim()] = curr.value.trim()
      return acc
    }, {} as Record<string, string>)

    // Medusa v2 native schema payload mapping
    const payload = {
      title,
      handle: handle.toLowerCase().replace(/\s+/g, "-"),
      description,
      status: "published",
      options: [
        {
          title: "Default",
          values: ["Default"],
        },
      ],
      variants: stockTiers.map((tier) => ({
        title: tier.tierName || "Default",
        options: { Default: "Default" },
        prices: [
          {
            currency_code: "usd", // Update dynamically if needed
            amount: Math.round(tier.price * 100), // Medusa stores prices in minor subunits (cents)
          },
        ],
      })),
      metadata: {
        ...cleanMetadata,
        vendor_id: currentVendor.id,
        vendor_name: currentVendor.name,
      },
    }

    try {
      // Safely matches your Medusa API host boundary dynamically
      const backendUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:9000"
          : `http://${window.location.hostname}:9000`
      // 1. Check all common key locations used by Medusa storefront kits
      const vendorToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("vendor_token_client="))
        ?.split("=")[1]

      console.log("🎯 Dynamic Target URL:", `${backendUrl}/vendors/products`)
      console.log("🔑 Resolved Token Value:", vendorToken)

      // 2. HARD STOP: Don't dispatch a dead fetch payload if token reading failed
      if (!vendorToken || vendorToken === "null") {
        console.error(
          "❌ Pre-flight Execution Blocked: Access token is missing or null."
        )
        alert(
          "Auth Context Missing! Please open your terminal, grab your token from the verification scripts, and drop it here."
        )

        // Quick Developer Fallback Override prompt so you can continue testing immediately:
        const manualToken = prompt("Enter valid JWT Auth Token:")
        if (manualToken) {
          localStorage.setItem("vendor_token", manualToken)
          window.location.reload()
        }
        setIsSubmitting(false)
        return
      }
      const response = await fetch(`${backendUrl}/vendors/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vendorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(
          errData.message || "Failed to create remote product context."
        )
      }

      const data = await response.json()
      console.log("✅ Product registered inside Medusa Engine:", data)

      router.push("/vendor/dashboard/products")
    } catch (error) {
      console.error("❌ Failed to create product listing:", error)
      alert(
        error instanceof Error
          ? error.message
          : "Network error syncing with Medusa backend"
      )
    } finally {
      setIsSubmitting(false)
    }
  }
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   setIsSubmitting(true)
  //   const vendorToken =
  //     typeof window !== "undefined"
  //       ? document.cookie
  //           .split("; ")
  //           .find((row) => row.startsWith("vendor_token_client="))
  //           ?.split("=")[1]
  //       : undefined

  //   console.log(
  //     "🔑 Resolved Token Value:",
  //     vendorToken ? `${vendorToken.substring(0, 15)}...` : "Missing"
  //   )

  //   if (!vendorToken) {
  //     console.error(
  //       "❌ Form Submission Blocked: Client-side session token is missing."
  //     )
  //     alert(
  //       "Authentication error: Please log out and log back in to refresh your vendor session."
  //     )
  //     setIsSubmitting(false)
  //     return
  //   }

  //   const backendUrl =
  //     window.location.hostname === "localhost"
  //       ? "http://localhost:9000"
  //       : `http://${window.location.hostname}:9000`

  //   console.log("🎯 Dynamic Target URL:", `${backendUrl}/vendors/products`)
  //   // Build out your premium cloth-wear payload matrix matching Medusa requirements
  //   const payload = {
  //     title: "Ethereal Silk Linen Maxi Dress",
  //     handle: "ethereal-silk-linen-maxi-dress",
  //     description:
  //       "A luxury, minimalist silhouette tailored from an exquisite blend of raw silk and organic linen.",
  //     status: "published",
  //     options: [{ title: "Default", values: ["Default"] }],
  //     variants: stockTiers.map((tier) => ({
  //       title: tier.tierName || "Default Sizing",
  //       options: { Default: "Default" },
  //       prices: [
  //         { currency_code: "usd", amount: Math.round(tier.price * 100) },
  //       ], // Safely scales floats to cents/minor units
  //     })),
  //     // Flatten out your dynamic tracking array into a clean object dictionary for Medusa
  //     metadata: metadata.reduce((acc, current) => {
  //       if (current.key.trim()) {
  //         acc[current.key.trim()] = current.value.trim()
  //       }
  //       return acc
  //     }, {} as Record<string, string>),
  //   }

  //   try {
  //     const response = await fetch(`${backendUrl}/vendors/products`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${vendorToken}`,
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(payload),
  //     })

  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({}))
  //       throw new Error(
  //         errorData.message ||
  //           "Failed to compile vendor catalog index insertion row."
  //       )
  //     }

  //     console.log("🎉 Product Catalog Entry Dispatched Successfully!")
  //     router.push("/vendor/dashboard/products")
  //   } catch (err: any) {
  //     console.error("❌ Submission Execution Error:", err.message)
  //     alert(`Failed to save product: ${err.message}`)
  //   } finally {
  //     setIsSubmitting(false)
  //   }
  // }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 my-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
      {/* Context Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Catalog Listing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Publish an item directly into the shared marketplace index.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-xs">
          <span className="text-gray-500 block font-medium">
            Acting Vendor Context:
          </span>
          <span className="font-bold text-emerald-800">
            {currentVendor.name} ({currentVendor.id.slice(0, 8)}...)
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Block */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Basic Attributes
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Title
            </label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., Premium Wireless Headphones"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Handle / Slug
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="premium-wireless-headphones"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Description
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
              placeholder="Provide a compelling item description details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Inventory Stock Tiers */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Inventory Allocation & Pricing Tiers
            </h2>
            <button
              type="button"
              onClick={handleAddTier}
              className="text-xs bg-gray-100 text-gray-700 font-medium px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
            >
              + Add Pricing Tier
            </button>
          </div>

          <div className="space-y-3">
            {stockTiers.map((tier) => (
              /* ✅ SAFE: Key remains locked to the record layout model instance */
              <div
                key={tier.id}
                className="flex flex-col sm:flex-row items-end gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100"
              >
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Tier Classification Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
                    placeholder="e.g., Retail Single"
                    value={tier.tierName}
                    onChange={(e) =>
                      handleTierChange(tier.id, "tierName", e.target.value)
                    }
                  />
                </div>

                <div className="w-full sm:w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
                    placeholder="0.00"
                    value={tier.price}
                    onChange={(e) =>
                      handleTierChange(
                        tier.id,
                        "price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>

                <div className="w-full sm:w-28">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
                    placeholder="0"
                    value={tier.quantity}
                    onChange={(e) =>
                      handleTierChange(
                        tier.id,
                        "quantity",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>

                {stockTiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(tier.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-md text-xs font-semibold h-9"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Filter Mapping Metadata */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Search Filter Attributes (Metadata)
            </h2>
            <button
              type="button"
              onClick={handleAddMetadata}
              className="text-xs bg-gray-100 text-gray-700 font-medium px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
            >
              + Add Attribute Rule
            </button>
          </div>
          {/* The Fix: Give your state items a simple random id or timestamp string when generated (crypto.randomUUID() or Math.random().toString()) instead of mapping index keys. */}
          <div className="space-y-2">
            {metadata.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  placeholder="Key (e.g., Material)"
                  value={item.key}
                  onChange={(e) =>
                    handleMetadataChange(item.id, "key", e.target.value)
                  }
                />
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  placeholder="Value (e.g., Premium Leather)"
                  value={item.value}
                  onChange={(e) =>
                    handleMetadataChange(item.id, "value", e.target.value)
                  }
                />
                {metadata.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMetadata(item.id)}
                    className="text-red-500 hover:text-red-700 text-xs px-2"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Action Controls */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Publishing Listing..." : "Publish Product Listing"}
          </button>
        </div>
      </form>
    </div>
  )
}
