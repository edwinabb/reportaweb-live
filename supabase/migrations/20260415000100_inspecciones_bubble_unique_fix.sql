-- Fix: ON CONFLICT requires a non-partial unique index. The partial index
-- `inspecciones_tenant_bubble_id_uq WHERE bubble_id IS NOT NULL` in
-- 20260415000000 does not qualify. Replace it with a full unique index.
-- Safe because `inspecciones` is empty at time of migration.

DROP INDEX IF EXISTS public.inspecciones_tenant_bubble_id_uq;

CREATE UNIQUE INDEX IF NOT EXISTS inspecciones_tenant_bubble_id_uq
    ON public.inspecciones (tenant_id, bubble_id);
