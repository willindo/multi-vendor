"use client"

import React from "react"

type ApparelTextInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  type?: React.HTMLInputTypeAttribute
}

export default function ApparelTextInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  type = "text",
}: ApparelTextInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded border border-neutral-300 p-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-100 ${className}`}
      />
    </div>
  )
}