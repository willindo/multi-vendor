// src/scripts/test-order-link.ts
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// 💡 IMPORTANT: Use the same constant/string that worked for Products
const MARKETPLACE_MODULE = "marketplace" 

export default async function testOrderLink({ container }: ExecArgs) {
  const link = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  
  const testOrderId = "order_01KRD8X59DV4CVSVFQ8DPYSDSC"
  const testVendorId = "01KQFQ4RA5SZ61CFJGCK4EYT1Q"

  try {
    // We pass an ARRAY of objects, mirroring the Workflow's success
    await link.create([
      {
        [MARKETPLACE_MODULE]: {
          vendor_id: testVendorId,
        },
        [Modules.ORDER]: {
          order_id: testOrderId,
        },
      }
    ])
    console.log("✅ Success! The Order-Vendor link is bonded.")
  } catch (e: any) {
    console.error("❌ Still failing. Let's try the reverse order...")
    
    // Sometimes the Link Service is sensitive to which module is "Primary"
    try {
       await link.create([
        {
          [Modules.ORDER]: { order_id: testOrderId },
          [MARKETPLACE_MODULE]: { vendor_id: testVendorId },
        }
      ])
      console.log("✅ Success on second attempt (reversed keys)!")
    } catch (e2: any) {
      console.error("Final Error:", e2.message)
    }
  }
}