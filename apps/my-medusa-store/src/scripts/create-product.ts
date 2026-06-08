import axios from "axios";
import * as path from "path";
import * as fs from "fs";

const API_URL = "http://localhost:9000";
// const API_URL = process.env.MEDUSA_BACKEND_URL;
const EMAIL = process.argv[4] || "vendor_1776923080@example.com";
const PASSWORD = process.argv[5] || "supersecret";
const MOCK_FILE_NAME = process.argv[6] || "apparel-tee.json";
// console.log("API_URL =", API_URL);
// console.log({
//   EMAIL,
//   PASSWORD,
//   MOCK_FILE_NAME,
// });
// console.log(process.argv);
export default async function createProduct() {
  console.log("Running Medusa script");
  try {
    console.log(`🔐 Authenticating ${EMAIL}...`);
    const authResponse = await axios.post(`${API_URL}/auth/vendor/emailpass`, {
      email: EMAIL,
      password: PASSWORD
    });
    
    const token = authResponse.data.token || authResponse.data.auth_token || authResponse.data.access_token;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Load the file exactly as it is written manually
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
