-- MIG-VALIDACION Bloque A.2: add bubble_id + missing columns to planes_accion
-- for Bubble `plan_de_accion` → Supabase `planes_accion` migration.
-- UNIQUE CONSTRAINT (not partial index) required for ON CONFLICT support.

ALTER TABLE public.planes_accion
    ADD COLUMN IF NOT EXISTS bubble_id TEXT,
    ADD COLUMN IF NOT EXISTS titulo TEXT,
    ADD COLUMN IF NOT EXISTS codigo TEXT;

ALTER TABLE public.planes_accion
    DROP CONSTRAINT IF EXISTS planes_accion_tenant_bubble_id_key;

ALTER TABLE public.planes_accion
    ADD CONSTRAINT planes_accion_tenant_bubble_id_key UNIQUE (tenant_id, bubble_id);
