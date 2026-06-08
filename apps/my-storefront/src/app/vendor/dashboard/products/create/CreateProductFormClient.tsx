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

  // Core Medusa Catalog State Hooks
  const [title, setTitle] = useState("")
  const [handle, setHandle] = useState("")
  const [description, setDescription] = useState("")
  
  // Custom Linked Relational Metadata Matrix 
  const [productType, setProductType] = useState("READY_WEAR") 
  const [gender, setGender] = useState("UNISEX")
  const [fit, setFit] = useState("REGULAR")
  const [season, setSeason] = useState("SUMMER")
  const [materialComposition, setMaterialComposition] = useState("")

  // Secure token validation fallback loop
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
    const cleanSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") 
      .replace(/\s+/g, "-")         
    setHandle(cleanSlug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      title,
      handle,
      description,
      status: "draft", // Defaults state safe for workflow validation
      apparel_detail: {
        product_type: productType,
        gender,
        fit,
        season,
        material_composition: materialComposition
      }
    }

    try {
      const backendUrl = window.location.hostname === "localhost" ? "http://localhost:9000" : `http://${window.location.hostname}:9000`
      const response = await fetch(`${backendUrl}/vendors/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to provision new catalog item entry.")
      
      router.push("/vendor/dashboard/products")
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error establishing product profile.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl shadow-xs p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Product Title</label>
          <input
            type="text"
            required
            placeholder="e.g., Organic Herbal Indigo Smock"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-xs outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Route Handle Reference</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-neutral-400 font-mono text-xs select-none">/</span>
            <input
              type="text"
              required
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
              placeholder="organic-herbal-indigo-smock"
              className="w-full pl-6 pr-4 py-2 border border-neutral-200 rounded-lg text-xs font-mono outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
            />
          </div>
        </div>

        {/* Structural Matrix Attributes Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200/70">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Product Classification</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full border border-neutral-200 rounded-md p-1.5 text-xs bg-white focus:outline-hidden focus:border-neutral-900"
            >
              <option value="READY_WEAR">Ready-To-Wear</option>
              <option value="FABRIC_ROLL">Fabric Roll</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Target Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full border border-neutral-200 rounded-md p-1.5 text-xs bg-white focus:outline-hidden focus:border-neutral-900"
            >
              <option value="SUMMER">Summer</option>
              <option value="WINTER">Winter</option>
              <option value="ALL_SEASON">All Season</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Gender Focus</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border border-neutral-200 rounded-md p-1.5 text-xs bg-white focus:outline-hidden focus:border-neutral-900"
            >
              <option value="UNISEX">Unisex</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Fit Specification</label>
            <select
              value={fit}
              onChange={(e) => setFit(e.target.value)}
              className="w-full border border-neutral-200 rounded-md p-1.5 text-xs bg-white focus:outline-hidden focus:border-neutral-900"
            >
              <option value="REGULAR">Regular Fit</option>
              <option value="OVERSIZED">Oversized</option>
              <option value="SLIM">Slim Fit</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Material Composition Matrix</label>
            <input
              type="text"
              placeholder="e.g., 100% Linen Organic Infusion, GOTS Certified"
              value={materialComposition}
              onChange={(e) => setMaterialComposition(e.target.value)}
              className="w-full border border-neutral-200 rounded-md p-1.5 text-xs bg-white focus:outline-hidden focus:border-neutral-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Description / Copywriting Artifact</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the production origin, weave density, and botanical compound detail references..."
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-xs outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-neutral-100 flex justify-end gap-x-4">
        <button
          type="button"
          onClick={() => router.push("/vendor/dashboard/products")}
          className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
        >
          {isSubmitting ? "Generating Profile Record..." : "Publish Composition"}
        </button>
      </div>
    </form>
  )
}