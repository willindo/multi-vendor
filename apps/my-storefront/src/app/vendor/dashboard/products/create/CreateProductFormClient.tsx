// ==== ./src/app/vendor/dashboard/products/create/CreateProductFormClient.tsx ====
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface CreateProductFormClientProps {
  serverToken?: string
}

export default function CreateProductFormClient({ serverToken }: CreateProductFormClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resolvedToken, setResolvedToken] = useState(serverToken || "")

  // --- CORE SYSTEM FIELDS ---
  const [title, setTitle] = useState("")
  const [handle, setHandle] = useState("")
  const [description, setDescription] = useState("")
  const [priceAmount, setPriceAmount] = useState<number>(0)
  const [currencyCode, setCurrencyCode] = useState("USD")
  const [sku, setSku] = useState("")
  const [inventoryQuantity, setInventoryQuantity] = useState<number>(10)
  const [manageInventory, setManageInventory] = useState(true)
  const [weight, setWeight] = useState<number>(0)

  // --- FULL SCHEMA APPAREL DETAILS MATRIX ---
  const [gender, setGender] = useState("UNISEX")
  const [ageGroup, setAgeGroup] = useState("ADULT")
  const [sizingGroup, setSizingGroup] = useState("REGULAR")
  
  const [productType, setProductType] = useState("TOP")
  const [fit, setFit] = useState("REGULAR")
  const [pattern, setPattern] = useState("SOLID")
  const [styleType, setStyleType] = useState("CASUAL")

  const [materialType, setMaterialType] = useState("NATURAL")
  const [materialComposition, setMaterialComposition] = useState("")
  const [careInstructions, setCareInstructions] = useState("")

  const [season, setSeason] = useState("ALL_SEASON")
  const [condition, setCondition] = useState("NEW")

  useEffect(() => {
    if (!resolvedToken) {
      const clientToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("medusa_vendor_jwt="))
        ?.split("=")[1] || localStorage.getItem("vendor_token")
      if (clientToken) setResolvedToken(clientToken)
    }
  }, [resolvedToken])

  const handleHandleChange = (val: string) => {
    const cleanSlug = val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")
    setHandle(cleanSlug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      title,
      handle,
      description,
      status: "draft",
      weight: Number(weight),
      variants: [{
        title: "Default Variant",
        sku: sku || `${handle}-default`,
        inventory_quantity: Number(inventoryQuantity),
        manage_inventory: manageInventory,
        prices: [{ amount: Math.round(priceAmount * 100), currency_code: currencyCode.toLowerCase() }]
      }],
      apparel_detail: {
        gender,
        age_group: ageGroup,
        sizing_group: sizingGroup,
        product_type: productType,
        fit,
        pattern,
        style_type: styleType,
        material_type: materialType,
        material_composition: materialComposition || null,
        care_instructions: careInstructions || null,
        season,
        condition
      }
    }

    try {
      const backendUrl = window.location.hostname === "localhost" ? "http://localhost:9000" : `http://${window.location.hostname}:9000`
      const response = await fetch(`${backendUrl}/vendors/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${resolvedToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to save full schema composition.")
      router.push("/vendor/dashboard/products")
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error creating profile record.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6 shadow-xs">
      
      {/* 01. CORE IDENTITY */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">01. Identity Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Product Title</label>
            <input type="text" required placeholder="e.g., Raw Silk Hand-Weaved Kaftan" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Route Slug Handle</label>
            <input type="text" required value={handle} onChange={(e) => handleHandleChange(e.target.value)} placeholder="raw-silk-hand-weaved-kaftan" className="w-full px-4 py-2 border font-mono rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden transition-all" />
          </div>
        </div>
      </div>

      {/* 02. FINANCIALS & METRICS */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">02. Commerce Base</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Retail Price</label>
            <input type="number" step="0.01" required value={priceAmount || ""} onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-md text-xs focus:outline-hidden" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Currency</label>
            <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} className="w-full p-2 border rounded-md text-xs bg-white focus:outline-hidden">
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">SKU</label>
            <input type="text" placeholder="SKU-REF" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full p-2 border rounded-md text-xs font-mono focus:outline-hidden" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Stock Vol</label>
            <input type="number" required value={inventoryQuantity} onChange={(e) => setInventoryQuantity(parseInt(e.target.value) || 0)} className="w-full p-2 border rounded-md text-xs focus:outline-hidden" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Weight (g)</label>
            <input type="number" value={weight || ""} onChange={(e) => setWeight(parseInt(e.target.value) || 0)} className="w-full p-2 border rounded-md text-xs focus:outline-hidden" />
          </div>
        </div>
      </div>

      {/* 03. FULL SCHEMA EXTENDED ATTRIBUTES */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">03. Production Specifications Matrix</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-50 p-4 rounded-xl border">
          
          {/* Sizing & Demographics */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Gender Segment</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="UNISEX">Unisex</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Age Bracket</label>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="ADULT">Adult</option>
              <option value="TEEN">Teen</option>
              <option value="KIDS">Kids</option>
              <option value="TODDLER">Toddler</option>
              <option value="INFANT">Infant</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Sizing Category</label>
            <select value={sizingGroup} onChange={(e) => setSizingGroup(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="REGULAR">Regular Fit</option>
              <option value="PETITE">Petite</option>
              <option value="TALL">Tall</option>
              <option value="PLUS_SIZE">Plus Size</option>
            </select>
          </div>

          {/* Design Layout Specs */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Garment Structural Type</label>
            <select value={productType} onChange={(e) => setProductType(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="TOP">Top / Shirt</option>
              <option value="BOTTOM">Bottom / Pants</option>
              <option value="SET">Matching Set</option>
              <option value="OUTERWEAR">Outerwear / Coat</option>
              <option value="FABRIC_ROLL">Uncut Fabric Roll</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Silhouette Cut / Fit</label>
            <select value={fit} onChange={(e) => setFit(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="REGULAR">Regular</option>
              <option value="SLIM">Slim</option>
              <option value="OVERSIZED">Oversized</option>
              <option value="RELAXED">Relaxed</option>
              <option value="SKINNY">Skinny</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Pattern Profile</label>
            <select value={pattern} onChange={(e) => setPattern(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="SOLID">Solid Tone</option>
              <option value="STRIPED">Striped</option>
              <option value="CHECKED">Checked / Plaid</option>
              <option value="FLORAL">Floral / Botanical</option>
              <option value="DYED">Natural Indigo / Organic Dyed</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Style Presentation</label>
            <select value={styleType} onChange={(e) => setStyleType(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="CASUAL">Casual Wear</option>
              <option value="FORMAL">Formal / Traditional</option>
              <option value="SPORT">Sportswear</option>
              <option value="STREETWEAR">Streetwear</option>
            </select>
          </div>

          {/* Contextual Meta Tracking */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Target Season Matrix</label>
            <select value={season} onChange={(e) => setSeason(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="ALL_SEASON">All Season</option>
              <option value="SUMMER">Summer</option>
              <option value="WINTER">Winter</option>
              <option value="SPRING">Spring</option>
              <option value="AUTUMN">Autumn</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Stock Physical Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="NEW">Brand New / Pristine</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GENTLY_USED">Gently Used</option>
            </select>
          </div>

          {/* Fiber Processing Base */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Material Origin Classification</label>
            <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="NATURAL">100% Organic / Natural Fiber</option>
              <option value="SYNTHETIC">Synthetic Yarn</option>
              <option value="BLEND">Composite Fiber Blend</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Material Composition Detail</label>
            <input type="text" placeholder="e.g., 80% Raw Silk, 20% Organic Cotton" value={materialComposition} onChange={(e) => setMaterialComposition(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden" />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Care & Preservation Protocols</label>
            <input type="text" placeholder="e.g., Hand wash cold with natural extracts, dry flat in shade" value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden" />
          </div>
        </div>
      </div>

      {/* 04. COPYWRITING */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Product Copy / Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe production origin, extraction compound references, and structural weave details..." className="w-full p-4 border rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden" />
      </div>

      {/* SYSTEM FOOTER ACTIONS */}
      <div className="pt-4 border-t flex justify-end gap-x-4">
        <button type="button" onClick={() => router.push("/vendor/dashboard/products")} className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-neutral-50 transition-colors">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all">
          {isSubmitting ? "Generating Complete Profile Entry..." : "Publish Full Composition"}
        </button>
      </div>
    </form>
  )
}