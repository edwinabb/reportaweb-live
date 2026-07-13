-- MIG-VALIDACION Bloque A.1: add bubble_id to plantillas for Bubble → Supabase migration
-- Each Bubble `formato` is duplicated per tenant, so uniqueness is (tenant_id, bubble_id).
-- A proper UNIQUE CONSTRAINT (not a partial index) is required for ON CONFLICT to work.

ALTER TABLE public.plantillas
    ADD COLUMN IF NOT EXISTS bubble_id TEXT;

ALTER TABLE public.plantillas
    DROP CONSTRAINT IF EXISTS plantillas_tenant_bubble_id_key;

ALTER TABLE public.plantillas
    ADD CONSTRAINT plantillas_tenant_bubble_id_key UNIQUE (tenant_id, bubble_id);
