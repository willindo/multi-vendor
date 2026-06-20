"use client"

import React from "react"

export type SelectOption = {
  value: string
  label: string
}

type ApparelSelectProps = {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export default function ApparelSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = "",
}: ApparelSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>

      <select
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded border border-neutral-300 bg-white p-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-100 ${className}`}
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}