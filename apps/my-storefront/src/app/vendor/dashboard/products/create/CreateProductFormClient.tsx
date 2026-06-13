// ==== ./src/app/vendor/dashboard/products/create/CreateProductFormClient.tsx ====
"use client"

import React, { useState, useEffect, Component } from "react"
import { useRouter } from "next/navigation"
import { APPAREL_DEFAULTS } from "@/packages/shared/src"

interface CreateProductFormClientProps {
  serverToken?: string
}

export default function CreateProductFormClient({
  serverToken,
}: CreateProductFormClientProps) {
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

const [gender, setGender] =
  useState(APPAREL_DEFAULTS.gender)
const [ageGroup, setAgeGroup] =
  useState(APPAREL_DEFAULTS.age_group)
const [sizingGroup, setSizingGroup] =
  useState(APPAREL_DEFAULTS.sizing_group)

  useEffect(() => {
    if (!resolvedToken) {
      const clientToken =
        document.cookie
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
      status: "draft",
      weight: Number(weight),
      variants: [
        {
          title: "Default Variant",
          sku: sku || `${handle}-default`,
          inventory_quantity: Number(inventoryQuantity),
          manage_inventory: manageInventory,
          prices: [
            {
              amount: Math.round(priceAmount * 100),
              currency_code: currencyCode.toLowerCase(),
            },
          ],
        },
      ],
      apparel_detail: apparel,
    }

    try {
      const backendUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:9000"
          : `http://${window.location.hostname}:9000`
      const response = await fetch(`${backendUrl}/vendors/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolvedToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok)
        throw new Error("Failed to save full schema composition.")
      router.push("/vendor/dashboard/products")
      router.refresh()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Error creating profile record."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6 shadow-xs"
    >
      {/* 01. CORE IDENTITY */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
          01. Identity Matrix
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Product Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Raw Silk Hand-Weaved Kaftan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Route Slug Handle
            </label>
            <input
              type="text"
              required
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
              placeholder="raw-silk-hand-weaved-kaftan"
              className="w-full px-4 py-2 border font-mono rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden transition-all"
            />
          </div>
        </div>
      </div>

      {/* 02. FINANCIALS & METRICS */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b pb-1">
          02. Commerce Base
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Retail Price
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={priceAmount || ""}
              onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded-md text-xs focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Currency
            </label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full p-2 border rounded-md text-xs bg-white focus:outline-hidden"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              SKU
            </label>
            <input
              type="text"
              placeholder="SKU-REF"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full p-2 border rounded-md text-xs font-mono focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Stock Vol
            </label>
            <input
              type="number"
              required
              value={inventoryQuantity}
              onChange={(e) =>
                setInventoryQuantity(parseInt(e.target.value) || 0)
              }
              className="w-full p-2 border rounded-md text-xs focus:outline-hidden"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
              Weight (g)
            </label>
            <input
              type="number"
              value={weight || ""}
              onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
              className="w-full p-2 border rounded-md text-xs focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* ============================= */}
      {/* APPAREL DETAILS */}
      {/* ============================= */}

      <ApparelDetailsSection
        values={apparel}
        onChange={(field, value) =>
          setApparel((prev) => ({
            ...prev,
            [field]: value,
          }))
        }
      />
      {/* 04. COPYWRITING */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Product Copy / Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe production origin, extraction compound references, and structural weave details..."
          className="w-full p-4 border rounded-lg text-xs focus:border-neutral-900 focus:outline-hidden"
        />
      </div>

      {/* SYSTEM FOOTER ACTIONS */}
      <div className="pt-4 border-t flex justify-end gap-x-4">
        <button
          type="button"
          onClick={() => router.push("/vendor/dashboard/products")}
          className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
        >
          {isSubmitting
            ? "Generating Complete Profile Entry..."
            : "Publish Full Composition"}
        </button>
      </div>
    </form>
  )
}
