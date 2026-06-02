"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface StockTier {
  id: string
  tierName: string
  price: number
  quantity: number
}

// Strictly Typed Category Configurations
type ProductClassification = "CLOTH_WEAR" | "CLOTH_MATERIAL"

const APPAREL_CATEGORIES = ["casual", "party", "summer", "winter", "night", "ethnic", "formal"]
const GARMENT_TYPES = ["top", "bottom", "full(gown)", "shirt", "pants", "shorts", "trousers", "skirt", "blazer"]
const FABRIC_MATERIALS = ["cotton roll", "linen roll", "silk", "khadi", "denim", "chiffon", "velvet", "satin", "wool blend"]

export default function CreateProductForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentVendor, setCurrentVendor] = useState<{ id: string; name: string } | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  // Core Form Parameters
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [handle, setHandle] = useState("")

  // Multi-Vendor Apparel Targeting States
  const [classification, setClassification] = useState<ProductClassification>("CLOTH_WEAR")
  const [apparelCategory, setApparelCategory] = useState("casual")
  const [garmentType, setGarmentType] = useState("shirt")
  const [fabricMaterial, setFabricMaterial] = useState("cotton roll")

  const [stockTiers, setStockTiers] = useState<StockTier[]>([
    { id: "default-tier-id", tierName: "Standard Size", price: 0.0, quantity: 10 }
  ])

  useEffect(() => {
    async function resolveVendorSession() {
      try {
        const vendorToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("vendor_token_client="))
          ?.split("=")[1]

        if (!vendorToken || vendorToken === "null") {
          setIsLoadingAuth(false)
          return
        }

        const backendUrl = window.location.hostname === "localhost" ? "http://localhost:9000" : `http://${window.location.hostname}:9000`
        const response = await fetch(`${backendUrl}/vendors/me`, {
          headers: { Authorization: `Bearer ${vendorToken}` },
        })

        if (response.ok) {
          const data = await response.json()
          setCurrentVendor({ id: data.vendor.id, name: data.vendor.name })
        }
      } catch (err) {
        console.error("Failed to verify vendor context:", err)
      } finally {
        setIsLoadingAuth(false)
      }
    }
    resolveVendorSession()
  }, [])

  const handleTierChange = (id: string, field: keyof StockTier, value: string | number) => {
    setStockTiers(stockTiers.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentVendor) {
      alert("Authentication session expired. Please re-authenticate.")
      return
    }
    setIsSubmitting(true)

    // Automatically construct search and index filters based on item classification selection
    const productFilters = classification === "CLOTH_WEAR" 
      ? { classification, style_category: apparelCategory, garment_cut: garmentType }
      : { classification, fabric_base: fabricMaterial }

    const payload = {
      title,
      handle: handle.toLowerCase().replace(/\s+/g, "-"),
      description,
      status: "published",
      options: [{ title: "Size Configuration", values: ["S", "M", "L", "XL", "Standard"] }],
      variants: stockTiers.map((tier) => ({
        title: tier.tierName || "Standard",
        options: { "Size Configuration": "Standard" },
        prices: [{ currency_code: "inr", amount: Math.round(tier.price * 100) }],
        manage_inventory: true
      })),
      metadata: {
        ...productFilters,
        vendor_id: currentVendor.id,
        vendor_name: currentVendor.name,
      },
    }

    try {
      const backendUrl = window.location.hostname === "localhost" ? "http://localhost:9000" : `http://${window.location.hostname}:9000`
      const vendorToken = document.cookie.split("; ").find((row) => row.startsWith("vendor_token_client="))?.split("=")[1]

      if (!vendorToken) throw new Error("Active session configuration context missing.")

      const response = await fetch(`${backendUrl}/vendors/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vendorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to persist entry ledger data on backend nodes.")
      router.push("/vendor/dashboard/products")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Sync runtime exception encountered.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingAuth) {
    return <div className="max-w-4xl mx-auto my-12 p-8 text-center text-xs font-mono text-neutral-400">Verifying security configurations...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 my-8 bg-white border border-neutral-200 rounded-2xl shadow-sm">
      <div className="border-b border-neutral-100 pb-6 mb-8">
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Create Textile & Apparel Listing</h1>
        <p className="text-xs text-neutral-400 mt-1">Configure premium apparel structures and raw fabrics maps.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Text Input Group Block */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Basic Attributes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Product Title</label>
              <input
                type="text"
                required
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/30"
                placeholder="e.g., Pure Linen Summer Casual Shirt"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">URL Route Handle</label>
              <input
                type="text"
                required
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/30"
                placeholder="pure-linen-summer-casual-shirt"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Product Context/Description</label>
            <textarea
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/30 min-h-[80px]"
              placeholder="Describe composition details, weave patterns, thread metrics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        <hr className="border-neutral-100" />

        {/* Dedicated Apparel Targeting Categorization Dropdown Selectors */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Apparel Architecture Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50/50 p-5 rounded-xl border border-neutral-200/50">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Catalog Classification</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as ProductClassification)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="CLOTH_WEAR">Ready-to-Wear (Garment Apparel)</option>
                <option value="CLOTH_MATERIAL">Raw Textile Material (Fabric Roll)</option>
              </select>
            </div>

            {classification === "CLOTH_WEAR" ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Aesthetic Category</label>
                  <select
                    value={apparelCategory}
                    onChange={(e) => setApparelCategory(e.target.value)}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white uppercase tracking-wider"
                  >
                    {APPAREL_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Garment Silhouette Cut</label>
                  <select
                    value={garmentType}
                    onChange={(e) => setGarmentType(e.target.value)}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white uppercase tracking-wider"
                  >
                    {GARMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Fabric Composition Core</label>
                <select
                  value={fabricMaterial}
                  onChange={(e) => setFabricMaterial(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white uppercase tracking-wider"
                >
                  {FABRIC_MATERIALS.map((mat) => <option key={mat} value={mat}>{mat}</option>)}
                </select>
              </div>
            )}
          </div>
        </section>

        <hr className="border-neutral-100" />

        {/* Pricing Architecture Subsection */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Inventory Sizing Allocation</h2>
          {stockTiers.map((tier) => (
            <div key={tier.id} className="flex flex-col sm:flex-row items-end gap-4 bg-neutral-50/20 p-4 rounded-xl border border-neutral-200/60">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-medium text-neutral-400 uppercase mb-1">Classification Target Name</label>
                <input
                  type="text"
                  required
                  className="w-full border border-neutral-200 rounded-md px-3 py-1.5 text-xs bg-white"
                  placeholder="e.g., Medium Size Slim / 10 Meter Roll"
                  value={tier.tierName}
                  onChange={(e) => handleTierChange(tier.id, "tierName", e.target.value)}
                />
              </div>
              <div className="w-full sm:w-36">
                <label className="block text-[10px] font-medium text-neutral-400 uppercase mb-1">Base Price (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full border border-neutral-200 rounded-md px-3 py-1.5 text-xs bg-white"
                  placeholder="0.00"
                  value={tier.price}
                  onChange={(e) => handleTierChange(tier.id, "price", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-[10px] font-medium text-neutral-400 uppercase mb-1">Available Units</label>
                <input
                  type="number"
                  required
                  className="w-full border border-neutral-200 rounded-md px-3 py-1.5 text-xs bg-white"
                  placeholder="0"
                  value={tier.quantity}
                  onChange={(e) => handleTierChange(tier.id, "quantity", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          ))}
        </section>

        <div className="pt-6 border-t border-neutral-100 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-neutral-900 hover:bg-black text-white font-semibold rounded-lg text-xs transition-all shadow-sm disabled:opacity-40"
          >
            {isSubmitting ? "Syncing Workspace Grid..." : "Publish Apparel Listing"}
          </button>
        </div>
      </form>
    </div>
  )
}