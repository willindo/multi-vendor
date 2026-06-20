import type {
  VariantCombination,
  VariantGenerationConfig,
  VariantOption,
  VariantOptionValue,
} from "./variant-types";

function buildTitle(options: VariantOptionValue[]): string {
  return options.map((o) => o.value).join(" / ");
}

function buildSku(
  options: VariantOptionValue[],
  prefix?: string,
): string | undefined {
  if (!prefix) {
    return undefined;
  }

  const suffix = options
    .map((o) => o.value.replace(/\s+/g, "-").toUpperCase())
    .join("-");

  return `${prefix}-${suffix}`;
}

export function generateVariantCombinations(
  variantOptions: VariantOption[],
  config?: VariantGenerationConfig,
): VariantCombination[] {
  if (variantOptions.length === 0) {
    return [];
  }

  let combinations: VariantOptionValue[][] = [[]];

  for (const option of variantOptions) {
    const next: VariantOptionValue[][] = [];

    for (const existing of combinations) {
      for (const value of option.values) {
        next.push([
          ...existing,
          {
            optionName: option.name,
            value,
          },
        ]);
      }
    }

    combinations = next;
  }

  return combinations.map(
    (options): VariantCombination => ({
      title: buildTitle(options),

      sku: buildSku(options, config?.skuPrefix),

      price: config?.defaultPrice,

      inventoryQuantity: config?.defaultInventoryQuantity,
      manageInventory: config?.defaultManageInventory ?? true,
      options,
    }),
  );
}
