"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface EditProductFormClientProps {
  productId: string
  initialProduct: any | null
  serverToken?: string
}

export default function EditProductFormClient({
  productId,
  initialProduct,
  serverToken,
}: EditProductFormClientProps) {
  const router = useRouter()
  const [product, setProduct] = useState(initialProduct)
  const [loading, setLoading] = useState(!initialProduct)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resolvedToken, setResolvedToken] = useState(serverToken || "")

  // Form Field Interactive States
  const [title, setTitle] = useState("")
  const [handle, setHandle] = useState("")
  const [description, setDescription] = useState("")
  
  const [classification, setClassification] = useState("CLOTH_WEAR")
  const [styleCategory, setStyleCategory] = useState("casual")
  const [garmentCut, setGarmentCut] = useState("shirt")
  const [fabricBase, setFabricBase] = useState("cotton roll")

  useEffect(() => {
    if (product) {
      setTitle(product.title || "")
      setHandle(product.handle || "")
      setDescription(product.description || "")
      
      // Parse active catalog parameters directly from the JSONB column string block
      if (product.metadata) {
        setClassification(product.metadata.classification || "CLOTH_WEAR")
        setStyleCategory(product.metadata.style_category || "casual")
        setGarmentCut(product.metadata.garment_cut || "shirt")
        setFabricBase(product.metadata.fabric_base || "cotton roll")
      }
    }
  }, [product])

  useEffect(() => {
    if (initialProduct) return

    const fetchProductClientSide = async () => {
      try {
        let clientToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("medusa_vendor_jwt="))
          ?.split("=")[1]

        if (!clientToken || clientToken === "null") {
          clientToken = localStorage.getItem("client_token") || localStorage.getItem("vendor_token") || undefined
        }

        if (!clientToken) {
          setIsSubmitting(false)
          return
        }

        setResolvedToken(clientToken)
        
        const backendUrl = window.location.hostname === "localhost" ? "http://localhost:9000" : `http://${window.location.hostname}:9000`
        const response = await fetch(`${backendUrl}/vendors/products`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${clientToken}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          const productList = Array.isArray(data) ? data : data.products || data.vendor_products || data.data || []
          const match = productList.find((p: any) => p && p.id === productId)
          if (match) setProduct(match)
        }
      } catch (err) {
        console.error("Browser client fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProductClientSide()
  }, [initialProduct, productId])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const runtimeFilters = classification === "CLOTH_WEAR"
      ? { classification, style_category: styleCategory, garment_cut: garmentCut, fabric_base: null }
      : { classification, style_category: null, garment_cut: null, fabric_base: fabricBase }

    const payload = {
      title,
      handle: handle.toLowerCase().replace(/\s+/g, "-"),
      description,
      metadata: {
        ...product?.metadata,
        ...runtimeFilters
      }
    }

    try {
      const backendUrl = window.location.hostname === "localhost" ? "http://localhost:9000" : `http://${window.location.hostname}:9000`
      const response = await fetch(`${backendUrl}/vendors/products/${productId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to sync structural edit attributes.")
      router.push("/vendor/dashboard/products")
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error syncing edits.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center font-mono text-xs text-neutral-400 animate-pulse">Resolving product matrix...</div>

  return (
    <form onSubmit={handleUpdate} className="bg-white border border-neutral-200 rounded-xl shadow-sm p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Product Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Route Handle Reference</label>
          <input
            type="text"
            required
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200/70">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Classification</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full border border-neutral-200 rounded-md p-1.5 text-xs bg-white focus:outline-none"
            >
              <option value="CLOTH_WEAR">Ready Wear</option>
              <option value="CLOTH_MATERIAL">Fabric Rolls</option>
            </select>
          </div>

          {classification === "CLOTH_WEAR" ? (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Silhouette Cut</label>
              <select
                value={garmentCut}
                onChange={(e) => setGarmentCut(e.target.value)}
                className="w-full border border-neutral-200 rounded-md p-1.5 text-xs bg-white uppercase"
              >
                {["shirt", "pants", "shorts", "trousers", "full(gown)", "top", "bottom"].map((cut) => (
                  <option key={cut} value={cut}>{cut}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Textile Variant Base</label>
              <select
                value={fabricBase}
                onChange={(e) => setFabricBase(e.target.value)}
                className="w-full border border-neutral-200 rounded-md p-1.5 text-xs bg-white uppercase"
              >
                {["cotton roll", "linen roll", "silk", "khadi"].map((mat) => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-black"
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
          className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
        >
          {isSubmitting ? "Saving Matrix Entries..." : "Save Product Details"}
        </button>
      </div>
    </form>
  )
}