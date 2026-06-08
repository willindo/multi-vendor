import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260603161730 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" alter column "gender" type text using ("gender"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "gender" drop not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "age_group" type text using ("age_group"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "age_group" drop not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "product_type" type text using ("product_type"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "product_type" drop not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "pattern" type text using ("pattern"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "pattern" drop not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "material_type" type text using ("material_type"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "material_type" drop not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "material_composition" type text using ("material_composition"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "material_composition" drop not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "season" type text using ("season"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "season" drop not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "condition" type text using ("condition"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "condition" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "apparel_detail" alter column "gender" type text using ("gender"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "gender" set not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "age_group" type text using ("age_group"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "age_group" set not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "product_type" type text using ("product_type"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "product_type" set not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "pattern" type text using ("pattern"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "pattern" set not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "material_type" type text using ("material_type"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "material_type" set not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "material_composition" type text using ("material_composition"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "material_composition" set not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "season" type text using ("season"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "season" set not null;`);
    this.addSql(`alter table if exists "apparel_detail" alter column "condition" type text using ("condition"::text);`);
    this.addSql(`alter table if exists "apparel_detail" alter column "condition" set not null;`);
  }

}
