// src/scripts/create-product-simple.ts
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const API_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

const EMAIL = process.argv[2] || "jwala@example.com";
const PASSWORD = process.argv[3] || "supersecret";
const MOCK_FILE_NAME = process.argv[4] || "product_2.json";

console.log("====================================");
console.log("🚀 Simple Product Creation Script");
console.log("====================================");

export default async function createProduct() {
    try {
        console.log(`🔐 Authenticating...`);

        const auth = await axios.post(`${API_URL}/auth/vendor/emailpass`, {
            email: EMAIL,
            password: PASSWORD,
        });

        // ✅ Log the actual response to see the structure
        console.log("Auth Response:", JSON.stringify(auth.data, null, 2));

        // ✅ For now, just use the entire auth data as the actor
        const actorId = auth.data.user?.id || auth.data.id;
        const token = auth.data.token || auth.data.access_token;

        console.log(`✅ Actor ID: ${actorId}`);

        const payloadPath = path.resolve(process.cwd(), "mock-data", MOCK_FILE_NAME);
        const rawPayload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

        // Build payload with what we have
        const payload = {
            vendor_admin_id: actorId,
            location_id: process.env.MEDUSA_STOCK_LOCATION_ID || "default_location",
            product: {
                ...rawPayload,
                metadata: {
                    ...rawPayload.metadata,
                },
            },
            apparel_detail: rawPayload.apparel_detail || {},
        };

        console.log(`🛍 Creating "${payload.product.title}"...`);

        const createRes = await axios.post(
            `${API_URL}/vendors/products`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("✅ Product Created:", createRes.data.product.id);
        return createRes.data;

    } catch (err: any) {
        console.error("❌ Failed:", err.response?.data || err.message);
        throw err;
    }
}

if (require.main === module) {
    createProduct();
}