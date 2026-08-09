import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260803133156 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "vendor_settlement" ("id" text not null, "vendor_id" text not null, "order_id" text not null, "payment_collection_id" text null, "payment_id" text null, "transfer_id" text null, "currency_code" text not null, "gross_amount" numeric not null, "commission_amount" numeric not null default 0, "fee_amount" numeric not null default 0, "tax_amount" numeric not null default 0, "net_amount" numeric not null, "status" text check ("status" in ('pending', 'processing', 'paid', 'failed', 'cancelled')) not null default 'pending', "retry_count" integer not null default 0, "last_error" text null, "provider" text null, "provider_reference" text null, "metadata" jsonb null, "raw_gross_amount" jsonb not null, "raw_commission_amount" jsonb not null default '{"value":"0","precision":20}', "raw_fee_amount" jsonb not null default '{"value":"0","precision":20}', "raw_tax_amount" jsonb not null default '{"value":"0","precision":20}', "raw_net_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_settlement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_settlement_deleted_at" ON "vendor_settlement" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vendor_settlement" cascade;`);
  }

}
