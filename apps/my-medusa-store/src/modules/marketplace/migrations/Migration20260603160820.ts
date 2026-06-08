import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260603160820 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" add column if not exists "sizing_group" text null, add column if not exists "style_type" text null, add column if not exists "care_instructions" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" drop column if exists "sizing_group", drop column if exists "style_type", drop column if exists "care_instructions";`);
  }

}
