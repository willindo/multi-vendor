import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const API_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

// -----------------------------------------------------
// Parse CLI arguments
// Usage:
// pnpm medusa exec ./src/scripts/create-product.ts \
//   soman@example.com supersecret product_1.json
// -----------------------------------------------------

const rawArgs = process.argv.filter((arg) => arg !== "--");
const scriptIndex = rawArgs.findIndex((arg) =>
  arg.includes("create-product.ts")
);

const customArgs =
  scriptIndex >= 0 ? rawArgs.slice(scriptIndex + 1) : [];

const EMAIL = customArgs[0] || "vendor_1776923080@example.com";
const PASSWORD = customArgs[1] || "supersecret";
const MOCK_FILE_NAME = customArgs[2] || "product_1.json";

// Read stock location from env if available
const TARGET_STOCK_LOCATION_ID =
  process.env.MEDUSA_STOCK_LOCATION_ID || "";

console.log("====================================");
console.log("Vendor Product Creation Script");
console.log("====================================");
console.log({
  API_URL,
  EMAIL,
  MOCK_FILE_NAME,
});

export default async function createProduct() {
  try {
    console.log(`🔐 Authenticating vendor ${EMAIL}...`);

    const auth = await axios.post(
      `${API_URL}/auth/vendor/emailpass`,
      {
        email: EMAIL,
        password: PASSWORD,
      }
    );

    const token =
      auth.data.token ||
      auth.data.auth_token ||
      auth.data.access_token;

    if (!token) {
      throw new Error("Authentication succeeded but no token was returned.");
    }

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // -------------------------------------------------
    // Load payload
    // -------------------------------------------------

    const payloadPath = path.resolve(
      process.cwd(),
      "mock-data",
      MOCK_FILE_NAME
    );

    if (!fs.existsSync(payloadPath)) {
      throw new Error(
        `Payload file not found:\n${payloadPath}`
      );
    }

    console.log(`📄 Loading payload from:\n${payloadPath}`);

    const payload = JSON.parse(
      fs.readFileSync(payloadPath, "utf8")
    );

    // -------------------------------------------------
    // Create product
    // -------------------------------------------------

    console.log(`🛍 Creating "${payload.title}"...`);

    const createRes = await axios.post(
      `${API_URL}/vendors/products`,
      payload,
      config
    );

    const product = createRes.data.product;

    console.log("✅ Product Created");
    console.log("ID:", product.id);

    // -------------------------------------------------
    // Skip inventory if stock location isn't configured
    // -------------------------------------------------

    if (!TARGET_STOCK_LOCATION_ID) {
      console.log("");
      console.log(
        "⚠ MEDUSA_STOCK_LOCATION_ID not configured."
      );
      console.log(
        "Skipping inventory allocation."
      );
      return;
    }

    // -------------------------------------------------
    // Fetch inventory links
    // -------------------------------------------------

    const expanded = await axios.get(
      `${API_URL}/vendors/products/${product.id}?fields=+variants.inventory_items.*`,
      config
    );

    const variants = expanded.data.product.variants || [];

    console.log(
      `📦 Assigning inventory to ${variants.length} variants...`
    );

    for (const variant of variants) {
      const link = variant.inventory_items?.[0];

      if (!link?.inventory_item_id) {
        console.warn(
          `⚠ ${variant.sku}: no inventory item linked`
        );
        continue;
      }

      try {
        await axios.post(
          `${API_URL}/admin/inventory-items/${link.inventory_item_id}/location-levels`,
          {
            location_id: TARGET_STOCK_LOCATION_ID,
            stocked_quantity:
              variant.inventory_quantity ?? 100,
          },
          config
        );

        console.log(
          `   ✓ ${variant.sku} -> ${variant.inventory_quantity ?? 100}`
        );
      } catch (err: any) {
        console.error(
          `   ✗ ${variant.sku}`,
          err.response?.data || err.message
        );
      }
    }

    console.log("");
    console.log("🎉 Product creation completed successfully.");
  } catch (err: any) {
    console.error("");
    console.error("❌ Product creation failed");

    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}