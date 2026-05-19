import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260428110501 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor" drop constraint if exists "vendor_handle_unique";`);
    this.addSql(`create table if not exists "vendor" ("id" text not null, "name" text not null, "handle" text not null, "logo" text null, "is_active" boolean not null default true, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_handle_unique" ON "vendor" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_deleted_at" ON "vendor" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "vendor_admin" ("id" text not null, "user_id" text not null, "role" text not null default 'admin', "vendor_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_admin_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_admin_vendor_id" ON "vendor_admin" ("vendor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_admin_deleted_at" ON "vendor_admin" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "vendor_admin" add constraint "vendor_admin_vendor_id_foreign" foreign key ("vendor_id") references "vendor" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vendor_admin" drop constraint if exists "vendor_admin_vendor_id_foreign";`);

    this.addSql(`drop table if exists "vendor" cascade;`);

    this.addSql(`drop table if exists "vendor_admin" cascade;`);
  }

}
