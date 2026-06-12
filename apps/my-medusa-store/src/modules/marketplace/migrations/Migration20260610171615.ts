import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260610171615 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" rename column "product_type" to "garment_category";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" rename column "garment_category" to "product_type";`);
  }

}
