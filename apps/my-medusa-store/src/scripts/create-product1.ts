// src/scripts/create-product1.ts
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

// Get command line arguments
const EMAIL = process.argv[2] || "vendor_1776923080@example.com";
const PASSWORD = process.argv[3] || "supersecret";
const MOCK_FILE_NAME = process.argv[4] || "product_1.json";

const API_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
const TARGET_STOCK_LOCATION_ID =
    process.env.MEDUSA_STOCK_LOCATION_ID || "";

console.log("====================================");
console.log("Vendor Product Creation Script");
console.log("====================================");
console.log({
    API_URL,
    EMAIL,
    MOCK_FILE_NAME,
    TARGET_STOCK_LOCATION_ID,
});

export default async function createProduct() {
    try {
        // 1. Authenticate the vendor admin
        console.log(`🔐 Authenticating vendor ${EMAIL}...`);

        const authResponse = await axios.post(
            `${API_URL}/auth/vendor/emailpass`,
            {
                email: EMAIL,
                password: PASSWORD,
            }
        );

        const authData = authResponse.data;

        // ✅ Extract the vendor_admin_id and vendor_id from the auth response
        const vendorAdminId = authData.user?.id || authData.id;
        const vendorId = authData.user?.vendor?.id || authData.user?.vendor_id || authData.metadata?.vendor_id;

        console.log(`✅ Authenticated successfully!`);
        console.log(`   Vendor Admin ID: ${vendorAdminId}`);
        console.log(`   Vendor ID: ${vendorId}`);

        // 2. Get the auth token for subsequent requests
        const token = authData.token || authData.access_token;

        if (!token) {
            throw new Error("No auth token received from authentication");
        }

        // 3. Load the product data from JSON file
        const mockFilePath = path.join(process.cwd(), "src", "scripts", "mocks", MOCK_FILE_NAME);
        console.log(`📂 Loading product data from: ${mockFilePath}`);

        if (!fs.existsSync(mockFilePath)) {
            throw new Error(`Mock file not found: ${mockFilePath}`);
        }

        const productData = JSON.parse(fs.readFileSync(mockFilePath, "utf8"));

        // ✅ 4. Inject the vendor_admin_id and vendor_id from authentication
        const payload = {
            vendor_admin_id: vendorAdminId, // ✅ From auth response
            location_id: TARGET_STOCK_LOCATION_ID || "default_location",
            product: {
                ...productData,
                // ✅ Ensure vendor_id is set in metadata
                metadata: {
                    ...productData.metadata,
                    vendor_id: vendorId, // ✅ From auth response
                },
                // ✅ Remove any hardcoded vendor_id from root level if exists
                vendor_id: undefined,
            },
            apparel_detail: productData.apparel_detail,
        };

        console.log("📦 Creating product with payload:");
        console.log(JSON.stringify({
            vendor_admin_id: payload.vendor_admin_id,
            product_title: payload.product.title,
            vendor_id: payload.product.metadata.vendor_id,
            location_id: payload.location_id,
            variant_count: payload.product.variants?.length || 0,
        }, null, 2));

        // 5. Call the workflow endpoint
        console.log(`🚀 Creating product...`);

        const response = await axios.post(
            `${API_URL}/vendor/products`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("✅ Product created successfully!");
        console.log(`   Product ID: ${response.data.product?.id}`);
        console.log(`   Product Handle: ${response.data.product?.handle}`);
        console.log(`   Variants: ${response.data.product?.variants?.length || 0}`);

        console.log("\n📊 Full Response:");
        console.log(JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error: any) {
        console.error("❌ Product creation failed:");

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error("   Status:", error.response.status);
            console.error("   Data:", error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error("   No response received from server");
            console.error("   Request:", error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("   Error:", error.message);
        }

        throw error;
    }
}

// Run the script if executed directly
if (require.main === module) {
    createProduct()
        .then(() => {
            console.log("✅ Script completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error.message);
            process.exit(1);
        });
}