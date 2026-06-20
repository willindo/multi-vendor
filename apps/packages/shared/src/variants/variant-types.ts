export interface VariantOption {
  name: string;
  values: string[];
}

export interface VariantOptionValue {
  optionName: string;
  value: string;
}

export interface VariantCombination {
  title: string;

  sku?: string;

  price?: number;
  currencyCode?: string;
  inventoryQuantity?: number;
  manageInventory?: boolean;
  options: VariantOptionValue[];
}

export interface VariantGenerationConfig {
  defaultPrice?: number;

  defaultInventoryQuantity?: number;
  defaultManageInventory?: boolean;
  skuPrefix?: string;
}
