
-- Run this in Supabase SQL Editor

-- 1. Add Foreign Key Columns
ALTER TABLE "public"."terceros_contactos" 
ADD COLUMN IF NOT EXISTS "cargo_id" uuid REFERENCES "public"."contactos_cargo"("id"),
ADD COLUMN IF NOT EXISTS "area_id" uuid REFERENCES "public"."contactos_area"("id");

-- 2. Optional: Rename old columns to avoid confusion (or keep as backup)
-- ALTER TABLE "public"."terceros_contactos" RENAME COLUMN "cargo" TO "cargo_legacy";
-- ALTER TABLE "public"."terceros_contactos" RENAME COLUMN "area" TO "area_legacy";

-- 3. Clear existing table to allow clean migration (since only 1 row exists)
TRUNCATE TABLE "public"."terceros_contactos" CASCADE;
