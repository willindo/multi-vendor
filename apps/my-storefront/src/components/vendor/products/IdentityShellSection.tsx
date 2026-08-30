import React, { useState, useEffect } from "react"
import { getApparelSuggestions, slugify } from "@lib/util/vendor/apparel-helpers"
import { GarmentCategory } from "@shared/apparel/apparel-types"

interface IdentityShellProps {
    category: GarmentCategory
    subcategory: string
    title: string
    setTitle: (val: string) => void
    handle: string
    setHandle: (val: string) => void
    subtitle: string
    setSubtitle: (val: string) => void
    description: string
    setDescription: (val: string) => void
    material: string
    setMaterial: (val: string) => void
    originCountry: string
    setOriginCountry: (val: string) => void
    hsCode: string
    setHsCode: (val: string) => void
    status: string
    setStatus: (val: string) => void
    isTouched: boolean
    setIsTouched: (val: boolean) => void
}

export default function IdentityShellSection({
    category,
    subcategory,
    title,
    setTitle,
    handle,
    setHandle,
    subtitle,
    setSubtitle,
    description,
    setDescription,
    material,
    setMaterial,
    originCountry,
    setOriginCountry,
    hsCode,
    setHsCode,
    status,
    setStatus,
    setIsTouched,
}: IdentityShellProps) {
    const [isManualHandle, setIsManualHandle] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const suggestions = getApparelSuggestions(category, subcategory)

    // Auto-generate slug unless manually edited
    const handleTitleChange = (val: string) => {
        setTitle(val)
        setIsTouched(true)
        if (!isManualHandle) {
            setHandle(slugify(val))
        }
    }

    return (
        <div className="space-y-4 bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                    01. Identity Matrix & Shell Defaults
                </h3>
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Status:</label>
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value)
                            setIsTouched(true)
                        }}
                        className="text-xs font-semibold px-2 py-1 bg-neutral-100 border rounded-md text-neutral-700 focus:outline-none"
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="proposed">Proposed</option>
                    </select>
                </div>
            </div>

            {/* ESSENTIAL FIELDS: Title, Subtitle, Auto-Handle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title & Quick Suggestions */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                        Product Title *
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="e.g., Raw Silk Hand-Weaved Kaftan"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none transition-all"
                    />
                    {/* Preset Title Chips */}
                    <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] text-neutral-400 self-center mr-1">Ideas:</span>
                        {suggestions.titleTemplates.map((tpl, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleTitleChange(tpl)}
                                className="text-[10px] bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full transition-colors"
                            >
                                + {tpl}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Route Slug Handle */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                            Route Slug Handle *
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsManualHandle(!isManualHandle)}
                            className="text-[10px] font-mono text-neutral-400 underline hover:text-neutral-700"
                        >
                            {isManualHandle ? "Auto-sync from title" : "Edit manually"}
                        </button>
                    </div>
                    <input
                        type="text"
                        required
                        readOnly={!isManualHandle}
                        value={handle}
                        onChange={(e) => {
                            setHandle(e.target.value)
                            setIsManualHandle(true)
                            setIsTouched(true)
                        }}
                        placeholder="raw-silk-hand-weaved-kaftan"
                        className={`w-full px-3 py-2 border font-mono rounded-lg text-xs transition-all ${!isManualHandle ? "bg-neutral-50 text-neutral-500 cursor-not-allowed" : "focus:border-neutral-900 focus:outline-none"
                            }`}
                    />
                </div>
            </div>

            {/* Subtitle & Quick Suggestions */}
            <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Subtitle <span className="text-neutral-400 font-normal">(Optional Tagline)</span>
                </label>
                <input
                    type="text"
                    placeholder="e.g., Handcrafted in Kerala | 100% Organic Silk"
                    value={subtitle}
                    onChange={(e) => {
                        setSubtitle(e.target.value)
                        setIsTouched(true)
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none transition-all"
                />
                {/* Preset Subtitle Chips */}
                <div className="flex flex-wrap gap-1 mt-1">
                    {suggestions.subtitleTemplates.map((subTpl, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                setSubtitle(subTpl)
                                setIsTouched(true)
                            }}
                            className="text-[10px] bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-500 px-2 py-0.5 rounded-md transition-colors"
                        >
                            + {subTpl}
                        </button>
                    ))}
                </div>
            </div>

            {/* EXPANDABLE SECTION: Description, Shipping Logistics, HS Code */}
            <div className="pt-2 border-t border-neutral-100">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs font-bold text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 transition-colors"
                >
                    <span>{showAdvanced ? "▼ Hide Product Metadata & Details" : "► Add Description, Material & Logistics Details"}</span>
                </button>

                {showAdvanced && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-dashed border-neutral-200">
                        {/* Description Input */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-[11px] font-bold uppercase text-neutral-600">
                                    Product Description
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDescription(suggestions.descriptionPlaceholder)
                                        setIsTouched(true)
                                    }}
                                    className="text-[10px] font-mono text-neutral-500 hover:text-neutral-900 underline"
                                >
                                    Use Suggested Template
                                </button>
                            </div>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value)
                                    setIsTouched(true)
                                }}
                                placeholder={suggestions.descriptionPlaceholder}
                                className="w-full p-2.5 border rounded-lg text-xs focus:border-neutral-900 focus:outline-none"
                            />
                        </div>

                        {/* Logistics Attributes */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                                    Primary Material
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., 100% Linen"
                                    value={material}
                                    onChange={(e) => {
                                        setMaterial(e.target.value)
                                        setIsTouched(true)
                                    }}
                                    className="w-full p-2 border rounded-md text-xs focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                                    Country of Origin
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., IN"
                                    value={originCountry}
                                    onChange={(e) => {
                                        setOriginCountry(e.target.value)
                                        setIsTouched(true)
                                    }}
                                    className="w-full p-2 border rounded-md text-xs focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                                    HS Harmonized Code
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., 6204.49"
                                    value={hsCode}
                                    onChange={(e) => {
                                        setHsCode(e.target.value)
                                        setIsTouched(true)
                                    }}
                                    className="w-full p-2 border rounded-md text-xs font-mono focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}