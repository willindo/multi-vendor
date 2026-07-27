// src/scripts/create-product.ts
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const API_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

// Parse CLI arguments
const rawArgs = process.argv.filter((arg) => arg !== "--");
const scriptIndex = rawArgs.findIndex((arg) =>
  arg.includes("create-product.ts")
);

const customArgs = scriptIndex >= 0 ? rawArgs.slice(scriptIndex + 1) : [];

const EMAIL = customArgs[0] || "jwala@example.com";
const PASSWORD = customArgs[1] || "supersecret";
const MOCK_FILE_NAME = customArgs[2] || "product_2.json";

console.log("====================================");
console.log("Vendor Product Creation Script");
console.log("====================================");

export default async function createProduct() {
  try {
    // 1. Authenticate
    console.log(`🔐 Authenticating ${EMAIL}...`);
    const auth = await axios.post(`${API_URL}/auth/vendor/emailpass`, {
      email: EMAIL,
      password: PASSWORD,
    });

    const token = auth.data.token || auth.data.auth_token || auth.data.access_token;
    if (!token) throw new Error("No token returned.");

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    // 2. Load payload
    const payloadPath = path.resolve(process.cwd(), "mock-data", MOCK_FILE_NAME);
    if (!fs.existsSync(payloadPath)) {
      throw new Error(`Payload file not found:\n${payloadPath}`);
    }

    console.log(`📄 Loading: ${MOCK_FILE_NAME}`);
    const rawPayload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

    // Extract all unique values grouped by their option titles from the variants array
    const optionValuesMap: Record<string, Set<string>> = {};
    (rawPayload.variants || []).forEach((variant: any) => {
      if (variant.options) {
        Object.entries(variant.options).forEach(([optionTitle, value]) => {
          if (!optionValuesMap[optionTitle]) {
            optionValuesMap[optionTitle] = new Set();
          }
          optionValuesMap[optionTitle].add(String(value));
        });
      }
    });

    // 3. Transform payload - Seed the unique option values dynamically
    const payload = {
      ...rawPayload,
      options: (rawPayload.options || []).map((opt: any) => ({
        title: opt.title,
        values: Array.from(optionValuesMap[opt.title] || [])
      })),
      variants: (rawPayload.variants || []).map((v: any) => ({
        ...v,
        prices: v.priceAmount !== undefined ? [
          {
            amount: v.priceAmount,
            currency_code: String(v.currencyCode || "USD").toLowerCase(),
          }
        ] : v.prices,
      })),
      apparel_detail: rawPayload.apparel_detail || null,
    };

    console.log(`📦 Product: ${payload.title}`);
    console.log(`   Options: ${payload.options.length}`);
    console.log(`   Variants: ${payload.variants?.length || 0}`);

    // 4. Create product via API
    console.log(`🛍 Creating product...`);
    const { data } = await axios.post(`${API_URL}/vendors/products`, payload, config);

    console.log("✅ Product Created");
    console.log(`   ID: ${data.product.id}`);
    console.log(`   Handle: ${data.product.handle}`);
    console.log(`   Variants: ${data.product.variants?.length || 0}`);

    // 5. Inventory assignment
    const locationId = process.env.MEDUSA_STOCK_LOCATION_ID;
    if (locationId && data.product.variants?.length) {
      console.log(`📦 Assigning inventory to ${data.product.variants.length} variants...`);

      for (const variant of data.product.variants) {
        const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id;
        if (inventoryItemId) {
          await axios.post(
            `${API_URL}/admin/inventory-items/${inventoryItemId}/location-levels`,
            {
              location_id: locationId,
              stocked_quantity: variant.inventory_quantity || 100,
            },
            config
          );
          console.log(`   ✓ ${variant.sku}`);
        }
      }
    }

    console.log("\n🎉 Done!");
  } catch (err: any) {
    console.error("\n❌ Failed:", err.response?.data || err.message);
    if (err.response?.data) {
      console.error(JSON.stringify(err.response.data, null, 2));
    }
  }
}
