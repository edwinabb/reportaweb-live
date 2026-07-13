-- Create ENUM for document category if not exists
DO $$ BEGIN
    CREATE TYPE "public"."document_category" AS ENUM ('seguro', 'con_vencimiento', 'sin_vencimiento');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- TABLE: document_types
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."document_types" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" uuid, -- NULL for global types
    "name" text NOT NULL,
    "code" text,
    "category" "public"."document_category" NOT NULL DEFAULT 'sin_vencimiento',
    "expiration_alert_days" integer DEFAULT 30,
    "bubble_id" text, -- MIGRATION FIELD
    
    -- STANDARD AUDIT FIELDS
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "modified_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid,
    "modified_by" uuid,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "document_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    CONSTRAINT "document_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id"),
    CONSTRAINT "document_types_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "public"."profiles"("id")
);

-- Unique constraint for code per tenant (handling null for global is tricky in standard unique, but optional)
-- For migration tracking
CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_types_bubble_id" ON "public"."document_types" ("bubble_id");

-- Enable RLS
ALTER TABLE "public"."document_types" ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- TABLE: user_documents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."user_documents" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "document_type_id" uuid NOT NULL,
    
    -- FILE METADATA
    "file_path" text NOT NULL,
    "file_name" text NOT NULL,
    "file_size" integer,
    "content_type" text,
    
    -- BUSINESS LOGIC
    "valid_from" date,
    "valid_until" date,
    
    -- MIGRATION FIELDS
    "bubble_id" text,
    "migration_status" text DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'ERROR'
    
    -- STANDARD AUDIT FIELDS
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "modified_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid,
    "modified_by" uuid,

    CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    CONSTRAINT "user_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "user_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE RESTRICT,
    CONSTRAINT "user_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id"),
    CONSTRAINT "user_documents_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "public"."profiles"("id")
);

-- Migration Index
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_documents_bubble_id" ON "public"."user_documents" ("bubble_id");

-- Enable RLS
ALTER TABLE "public"."user_documents" ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS POLICIES
-- -----------------------------------------------------------------------------

-- Policies for document_types
CREATE POLICY "Read access for authenticated users"
ON "public"."document_types"
FOR SELECT
TO authenticated
USING (
    is_active = true AND (
        tenant_id IS NULL OR 
        tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
    )
);

-- Policies for user_documents
CREATE POLICY "Read access for users in tenant"
ON "public"."user_documents"
FOR SELECT
TO authenticated
USING (
    is_active = true AND
    tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "Insert access for users in tenant"
ON "public"."user_documents"
FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "Update access for users in tenant"
ON "public"."user_documents"
FOR UPDATE
TO authenticated
USING (
    tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "Soft delete access for users in tenant"
ON "public"."user_documents"
FOR UPDATE
TO authenticated
USING (
    tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid())
);

-- Note: True 'DELETE' is usually reserved for admins, but using soft-delete via UPDATE is preferred.

-- -----------------------------------------------------------------------------
-- TRIGGER: Update modified_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = now();
    -- Optionally set modified_by if passed in context, but simpler to rely on app logic or a helper
    -- NEW.modified_by = ... (requieres retrieving auth.uid() which is tricky in generic triggers without security definer/config)
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_types_modtime
    BEFORE UPDATE ON "public"."document_types"
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_at_column();

CREATE TRIGGER update_user_documents_modtime
    BEFORE UPDATE ON "public"."user_documents"
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_at_column();

-- -----------------------------------------------------------------------------
-- STORAGE BUCKET CREATION (Idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'doc_usuarios', 
    'doc_usuarios', 
    false, 
    20971520, -- 20MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS for Storage
-- Allow authenticated users to read files in their tenant folder (roughly) or mapped by user_id
-- Complex strict RLS for storage path matching is recommended but basic auth read is a good start
CREATE POLICY "Authenticated users can read doc_usuarios"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'doc_usuarios' ); -- Todo: Refine with path checks if possible

CREATE POLICY "Authenticated users can upload to doc_usuarios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'doc_usuarios' ); 
