// src/modules/marketplace/models/vendor-settlement.ts
import { model } from "@medusajs/framework/utils"
const VendorSettlement = model.define("vendor_settlement", {
    id: model.id().primaryKey(),
    /*
    |--------------------------------------------------------------------------
    | Relations (stored as ids)
    |--------------------------------------------------------------------------
    */
    vendor_id: model.text(),
    order_id: model.text(),
    payment_collection_id: model.text().nullable(),
    payment_id: model.text().nullable(),
    transfer_id: model.text().nullable(),
    /*
    |--------------------------------------------------------------------------
    | Financials
    |--------------------------------------------------------------------------
    */
    currency_code: model.text(),
    gross_amount: model.bigNumber(),
    commission_amount: model.bigNumber().default(0),
    fee_amount: model.bigNumber().default(0),
    tax_amount: model.bigNumber().default(0),
    net_amount: model.bigNumber(),
    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */
    status: model.enum([
        "pending",
        "processing",
        "paid",
        "failed",
        "cancelled",
    ]).default("pending"),
    /*
    |--------------------------------------------------------------------------
    | Retry
    |--------------------------------------------------------------------------
    */
    retry_count: model.number().default(0),
    last_error: model.text().nullable(),
    /*
    |--------------------------------------------------------------------------
    | Provider Metadata
    |--------------------------------------------------------------------------
    */
    provider: model.text().nullable(),
    provider_reference: model.text().nullable(),
    metadata: model.json().nullable(),
})
export default VendorSettlement