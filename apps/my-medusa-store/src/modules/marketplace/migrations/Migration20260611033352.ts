import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260611033352 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" add column if not exists "garment_subcategory" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" drop column if exists "garment_subcategory";`);
  }

}
