-- Add columns required by mv_planificacion_v3 (20260523000000) and related views.
-- These columns were added directly to production without migration files.

ALTER TABLE public.tareas
    ADD COLUMN IF NOT EXISTS codigo TEXT,
    ADD COLUMN IF NOT EXISTS cotizacion_ref TEXT;

ALTER TABLE public.cotizaciones
    ADD COLUMN IF NOT EXISTS anio INTEGER;

-- codigo_documento_interno on reportes_maquinaria — used by view_valoraciones as display code.
ALTER TABLE public.reportes_maquinaria
    ADD COLUMN IF NOT EXISTS codigo_documento_interno TEXT;
