import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260611160206 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" add column if not exists "occasion" text null, add column if not exists "sleeve_type" text null, add column if not exists "neck_type" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" drop column if exists "occasion", drop column if exists "sleeve_type", drop column if exists "neck_type";`);
  }

}
