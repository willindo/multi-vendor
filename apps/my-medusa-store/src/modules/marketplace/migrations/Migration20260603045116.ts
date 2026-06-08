import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260603045116 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" drop constraint if exists "apparel_detail_product_id_unique";`);
    this.addSql(`create table if not exists "apparel_detail" ("id" text not null, "product_id" text not null, "gender" text not null, "product_type" text not null, "fit" text null, "season" text not null, "age_group" text not null, "material_type" text not null, "material_composition" text not null, "condition" text not null, "pattern" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "apparel_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_apparel_detail_product_id_unique" ON "apparel_detail" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_apparel_detail_deleted_at" ON "apparel_detail" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "apparel_detail" cascade;`);
  }

}
