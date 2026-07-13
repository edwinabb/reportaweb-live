
-- Drop the existing unique index on bubble_id
DROP INDEX IF EXISTS "public"."idx_user_documents_bubble_id";

-- Create a new unique index on (bubble_id, user_id)
-- This allows migrating shared documents from Bubble (one Bubble ID -> multiple Supabase records)
CREATE UNIQUE INDEX "idx_user_documents_bubble_id_user_id" ON "public"."user_documents" ("bubble_id", "user_id");

-- Also add a unique constraint on (name, tenant_id) for document_types if not exists
-- to allow the app to upsert by name safely, but we keep idx_document_types_bubble_id for migration.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_types_tenant_name_unique') THEN
        ALTER TABLE "public"."document_types" ADD CONSTRAINT "document_types_tenant_name_unique" UNIQUE ("tenant_id", "name");
    END IF;
END $$;
