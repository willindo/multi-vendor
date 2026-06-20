"use client"

import React from "react"

type ApparelTextareaProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  required?: boolean
  disabled?: boolean
  className?: string
}

export default function ApparelTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  disabled = false,
  className = "",
}: ApparelTextareaProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>

      <textarea
        value={value}
        rows={rows}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded border border-neutral-300 p-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-100 ${className}`}
      />
    </div>
  )
}