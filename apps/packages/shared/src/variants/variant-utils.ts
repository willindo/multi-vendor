import type {
  VariantCombination,
  VariantOption,
  VariantOptionValue,
} from "./variant-types"

export function generateVariantTitle(
  options: VariantOptionValue[]
): string {
  return options
    .map((o) => o.value)
    .join(" / ")
}

export function variantKey(
  options: VariantOptionValue[]
): string {
  return options
    .map(
      (o) =>
        `${o.optionName}:${o.value}`
    )
    .join("|")
}

export function deduplicateOptions(
  options: VariantOption[]
): VariantOption[] {
  return options.map((option) => ({
    name: option.name,

    values: Array.from(
      new Set(
        option.values
          .map((v) => v.trim())
          .filter(Boolean)
      )
    ),
  }))
}

export function sortVariants(
  variants: VariantCombination[]
): VariantCombination[] {
  return [...variants].sort((a, b) =>
    a.title.localeCompare(b.title)
  )
}

export function reconstructOptionsFromVariants(
  variants: VariantCombination[]
): VariantOption[] {
  const optionMap = new Map<
    string,
    Set<string>
  >()

  for (const variant of variants) {
    for (const option of variant.options) {
      if (
        !optionMap.has(option.optionName)
      ) {
        optionMap.set(
          option.optionName,
          new Set()
        )
      }

      optionMap
        .get(option.optionName)!
        .add(option.value)
    }
  }

  return Array.from(
    optionMap.entries()
  ).map(([name, values]) => ({
    name,

    values: Array.from(values),
  }))
}

export function findVariant(
  variants: VariantCombination[],
  options: VariantOptionValue[]
): VariantCombination | undefined {
  const key = variantKey(options)

  return variants.find(
    (variant) =>
      variantKey(variant.options) === key
  )
}