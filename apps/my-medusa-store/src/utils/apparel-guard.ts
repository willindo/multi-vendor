const FORBIDDEN_WORDS = ["undergarment", "underwear", "bra", "panties", "boxers", "belt", "shoe", "sneaker", "bag", "backpack", "cap", "hat", "wallet"];

const VALID_PRODUCT_TYPES = ["TOP", "BOTTOM", "SET", "OUTERWEAR", "FABRIC_ROLL"];

export function validateAndCleanApparelInput(body: any) {
  const { title, description, apparel_detail } = body;
  
  if (!apparel_detail) {
    throw new Error("Apparel DNA configurations ('apparel_detail') are required for this marketplace.");
  }

  // 1. Structural Validation Against Forbidden Items
  const searchableText = `${title || ""} ${description || ""}`.toLowerCase();
  const foundViolation = FORBIDDEN_WORDS.find(word => searchableText.includes(word));
  
  if (foundViolation) {
    throw new Error(`Marketplace Scope Exclusion: Items matching descriptions for '${foundViolation}' are prohibited. We exclusively support clothing garments and raw dressmaking materials.`);
  }

  // 2. Data Property Type Checks
  if (!VALID_PRODUCT_TYPES.includes(apparel_detail.product_type)) {
    throw new Error(`Validation Error: '${apparel_detail.product_type}' is not an authorized clothing or material product type.`);
  }

  return apparel_detail;
}