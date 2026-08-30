import { GarmentCategory } from "@shared/apparel/apparel-types"

export function getApparelSuggestions(category: GarmentCategory, subcategory?: string) {
    const sub = subcategory?.replace(/_/g, " ") || "Garment"

    return {
        titleTemplates: [
            `Hand-Weaved Organic Cotton ${sub}`,
            `Handcrafted Silk ${sub}`,
            `Relaxed-Fit Everyday ${sub}`,
            `Artisanal Embroidered ${sub}`
        ],
        subtitleTemplates: [
            `100% Sustainable | Ethically Handcrafted`,
            `Signature Collection | Premium Finish`,
            `Breathable All-Season Essential`,
            `Tradition Meets Modern Minimalist Design`
        ],
        descriptionPlaceholder: `Elevate your wardrobe with our ${sub.toLowerCase()}. Meticulously handcrafted using high-grade materials to ensure superior comfort, breathable texture, and long-lasting durability.`
    }
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
}