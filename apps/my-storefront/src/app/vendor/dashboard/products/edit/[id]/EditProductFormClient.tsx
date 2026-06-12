"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface EditProductFormClientProps {
  productId: string
  initialProduct: any | null
  serverToken?: string
}

interface UIVariantState {
  id: string
  title: string
  sku: string
  inventory_quantity: number
  priceAmount: number
  currencyCode: string
  weight: number
}

export default function EditProductFormClient({ productId, initialProduct, serverToken }: EditProductFormClientProps) {
  const router = useRouter()
  const [product, setProduct] = useState(initialProduct)
  const [loading, setLoading] = useState(!initialProduct)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resolvedToken, setResolvedToken] = useState(serverToken || "")

  // --- CORE IDENTIFIERS ---
  const [title, setTitle] = useState(initialProduct?.title || "")
  const [handle, setHandle] = useState(initialProduct?.handle || "")
  const [description, setDescription] = useState(initialProduct?.description || "")
  const [weight, setWeight] = useState<number>(initialProduct?.weight || 0)
  
  // --- MULTI-VARIANT RUNTIME ENGINE ---
  const [uiVariants, setUiVariants] = useState<UIVariantState[]>([])

  // --- APPAREL DETAILS SPECS ---
  const [gender, setGender] = useState(initialProduct?.apparel_detail?.gender || "UNISEX")
  const [ageGroup, setAgeGroup] = useState(initialProduct?.apparel_detail?.age_group || "ADULT")
  const [sizingGroup, setSizingGroup] = useState(initialProduct?.apparel_detail?.sizing_group || "REGULAR")
  const [garmentCategory, setgarmentCategory] = useState(initialProduct?.apparel_detail?.product_type || "TOP")
  const [fit, setFit] = useState(initialProduct?.apparel_detail?.fit || "REGULAR")
  const [pattern, setPattern] = useState(initialProduct?.apparel_detail?.pattern || "SOLID")
  const [styleType, setStyleType] = useState(initialProduct?.apparel_detail?.style_type || "CASUAL")
  const [materialType, setMaterialType] = useState(initialProduct?.apparel_detail?.material_type || "NATURAL")
  const [materialComposition, setMaterialComposition] = useState(initialProduct?.apparel_detail?.material_composition || "")
  const [careInstructions, setCareInstructions] = useState(initialProduct?.apparel_detail?.care_instructions || "")
  const [season, setSeason] = useState(initialProduct?.apparel_detail?.season || "ALL_SEASON")
  const [condition, setCondition] = useState(initialProduct?.apparel_detail?.condition || "NEW")

  useEffect(() => {
    if (product) {
      setTitle(product.title || "")
      setHandle(product.handle || "")
      setDescription(product.description || "")
      setWeight(product.weight || 0)
      
      if (product.variants && product.variants.length > 0) {
        const structuralRows = product.variants.map((v: any) => ({
          id: v.id,
          title: v.title || "Default Variant",
          sku: v.sku || "",
          inventory_quantity: v.inventory_quantity || 0,
          priceAmount: v.prices?.[0]?.amount ? v.prices[0].amount / 100 : 0,
          currencyCode: v.prices?.[0]?.currency_code?.toUpperCase() || "USD",
          weight: v.weight || product.weight || 0
        }))
        setUiVariants(structuralRows)
      }

      if (product.apparel_detail) {
        setGender(product.apparel_detail.gender || "UNISEX")
        setAgeGroup(product.apparel_detail.age_group || "ADULT")
        setSizingGroup(product.apparel_detail.sizing_group || "REGULAR")
        setgarmentCategory(product.apparel_detail.product_type || "TOP")
        setFit(product.apparel_detail.fit || "REGULAR")
        setPattern(product.apparel_detail.pattern || "SOLID")
        setStyleType(product.apparel_detail.style_type || "CASUAL")
        setMaterialType(product.apparel_detail.material_type || "NATURAL")
        setMaterialComposition(product.apparel_detail.material_composition || "")
        setCareInstructions(product.apparel_detail.care_instructions || "")
        setSeason(product.apparel_detail.season || "ALL_SEASON")
        setCondition(product.apparel_detail.condition || "NEW")
      }
    }
  }, [product])

  useEffect(() => {
    if (initialProduct) return
    const fetchProductClientSide = async () => {
      try {
        const clientToken = document.cookie.split("; ").find((row) => row.startsWith("medusa_vendor_jwt="))?.split("=")[1] || localStorage.getItem("vendor_token")
        if (!clientToken) return
        setResolvedToken(clientToken)
        
        const backendUrl = window.location.hostname === "localhost" ? "http://localhost:9000" : `http://${window.location.hostname}:9000`
        const response = await fetch(`${backendUrl}/vendors/products`, {
          method: "GET",
          headers: { Authorization: `Bearer ${clientToken}`, "Content-Type": "application/json" }
        })
        if (response.ok) {
          const data = await response.json()
          const productList = data.products || data.vendor_products || data.data || []
          const match = productList.find((p: any) => p && p.id === productId)
          if (match) setProduct(match)
        }
      } catch (err) {
        console.error("Client resolution error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProductClientSide()
  }, [initialProduct, productId])

  const handleHandleChange = (val: string) => {
    const cleanSlug = val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")
    setHandle(cleanSlug)
  }

  const handleVariantCellChange = (id: string, key: keyof UIVariantState, value: any) => {
    setUiVariants(prev => prev.map(v => v.id === id ? { ...v, [key]: value } : v))
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      title,
      handle,
      description,
      weight: Number(weight),
      variants: uiVariants.map(v => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        inventory_quantity: Number(v.inventory_quantity),
        weight: Number(v.weight),
        prices: [{ amount: Math.round(Number(v.priceAmount) * 100), currency_code: v.currencyCode.toLowerCase() }]
      })),
      apparel_detail: {
        gender,
        age_group: ageGroup,
        sizing_group: sizingGroup,
        product_type: garmentCategory,
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
      const response = await fetch(`${backendUrl}/vendors/products/${productId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${resolvedToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Synchronization failure on complex metadata links.")
      router.push("/vendor/dashboard/products")
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error syncing edits.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center font-mono text-xs text-neutral-400 animate-pulse">Resolving operational layout...</div>

  return (
    <form onSubmit={handleUpdate} className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6 shadow-sm">
      
      {/* 01. IDENTITY */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">01. Identity Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Product Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Route Slug Handle</label>
            <input type="text" required value={handle} onChange={(e) => handleHandleChange(e.target.value)} className="w-full px-4 py-2 border font-mono rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden transition-all" />
          </div>
        </div>
      </div>

      {/* 02. COMMERCE MATRIX TARGETS */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">02. Commerce Base</h3>
        <div className="overflow-x-auto border border-neutral-200 rounded-lg">
          <table className="w-full border-collapse text-left bg-white text-xs">
            <thead className="bg-neutral-50 border-b font-mono text-neutral-500 uppercase text-[10px]">
              <tr>
                <th className="p-3">Variant Specification</th>
                <th className="p-3">SKU Identifier</th>
                <th className="p-3 w-20">Stock</th>
                <th className="p-3 w-28">Price</th>
                <th className="p-3 w-24">Currency</th>
                <th className="p-3 w-24">Weight (g)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {uiVariants.map((v) => (
                <tr key={v.id} className="hover:bg-neutral-50/50">
                  <td className="p-3 font-medium font-mono text-neutral-800">{v.title}</td>
                  <td className="p-3"><input type="text" value={v.sku} onChange={(e) => handleVariantCellChange(v.id, "sku", e.target.value)} className="w-full p-1 border rounded-sm font-mono text-[11px]" /></td>
                  <td className="p-3"><input type="number" value={v.inventory_quantity} onChange={(e) => handleVariantCellChange(v.id, "inventory_quantity", parseInt(e.target.value) || 0)} className="w-full p-1 border rounded-sm text-[11px]" /></td>
                  <td className="p-3"><input type="number" step="0.01" value={v.priceAmount} onChange={(e) => handleVariantCellChange(v.id, "priceAmount", parseFloat(e.target.value) || 0)} className="w-full p-1 border rounded-sm text-[11px]" /></td>
                  <td className="p-3">
                    <select value={v.currencyCode} onChange={(e) => handleVariantCellChange(v.id, "currencyCode", e.target.value)} className="w-full p-1 border rounded-sm bg-white text-[11px]">
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </td>
                  <td className="p-3"><input type="number" value={v.weight} onChange={(e) => handleVariantCellChange(v.id, "weight", parseInt(e.target.value) || 0)} className="w-full p-1 border rounded-sm text-[11px]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 03. APPAREL FILTERS SPECS */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">03. Production Specifications Matrix</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-50 p-4 rounded-xl border">
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
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Garment Structural Type</label>
            <select value={garmentCategory} onChange={(e) => setgarmentCategory(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
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
              <option value="CHECKED">Checked</option>
              <option value="FLORAL">Floral</option>
              <option value="DYED">Natural Organic Dyed</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Style Presentation</label>
            <select value={styleType} onChange={(e) => setStyleType(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="CASUAL">Casual Wear</option>
              <option value="FORMAL">Formal Wear</option>
              <option value="SPORT">Sportswear</option>
              <option value="STREETWEAR">Streetwear</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Target Season</label>
            <select value={season} onChange={(e) => setSeason(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="ALL_SEASON">All Season</option>
              <option value="SUMMER">Summer</option>
              <option value="WINTER">Winter</option>
              <option value="SPRING">Spring</option>
              <option value="AUTUMN">Autumn</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Stock Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="NEW">Brand New</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GENTLY_USED">Gently Used</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Material Origin</label>
            <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden">
              <option value="NATURAL">Natural Fiber</option>
              <option value="SYNTHETIC">Synthetic Yarn</option>
              <option value="BLEND">Composite Blend</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Material Composition</label>
            <input type="text" value={materialComposition} onChange={(e) => setMaterialComposition(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Care Protocols</label>
            <input type="text" value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-hidden" />
          </div>
        </div>
      </div>

      {/* 04. COPYWRITING */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">Product Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full p-4 border rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden" />
      </div>

      {/* ACTIONS */}
      <div className="pt-4 border-t flex justify-end gap-x-4">
        <button type="button" onClick={() => router.push("/vendor/dashboard/products")} className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-neutral-50 transition-colors">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all">
          {isSubmitting ? "Syncing Global Profile Records..." : "Save Product Details"}
        </button>
      </div>
    </form>
  )
}