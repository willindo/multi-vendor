import axios from "axios";
import * as path from "path";
import * as fs from "fs";

const API_URL = "http://localhost:9000";

// Clean up process.argv to remove 'node', the script path, and the '--' flag if present
const args = process.argv.slice(2).filter(arg => arg !== '--');

const EMAIL = args[0] || "vendor_1776923080@example.com";
const PASSWORD = args[1] || "supersecret";
const MOCK_FILE_NAME = args[2] || "apparel-tee.json";

console.log("API_URL =", API_URL);
console.log({ EMAIL, PASSWORD, MOCK_FILE_NAME });

export default async function createProduct() {
  console.log("Running Medusa script");
  try {
    console.log(`密 Authenticating ${EMAIL}...`);
    const authResponse = await axios.post(`${API_URL}/auth/vendor/emailpass`, {
      email: EMAIL,
      password: PASSWORD
    });

    const token = authResponse.data.token || authResponse.data.auth_token || authResponse.data.access_token;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const filePath = path.join(__dirname, "../../mock-data", MOCK_FILE_NAME);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Payload file not found at: ${filePath}`);
    }
    console.log("File:", filePath);
    const payload = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    console.log(`🛒 Creating product: "${payload.title}" directly from template...`);
    const response = await axios.post(`${API_URL}/vendors/products`, payload, config);

    console.log(`✅ Success! Created Product ID: ${response.data.product.id}`);
  } catch (error: any) {
    console.error("❌ Failed:");
    console.error(error.response?.data || error.message);
  }
}

// 銆?CRITICAL FIX: Actually run the function!
createProduct();