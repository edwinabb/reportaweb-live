-- v3.1.22 — Complete Bubble mapping for tareas migration
--
-- Adds columns required to migrate tareas from Bubble:
--   tareas.sitio_id     — previously only had `sitio TEXT` (never populated)
--   tareas.hora_inicio  — from `Hora Inicio--BORRAR-27-08` ("08:00 AM" → 08:00:00)
--   tareas.hora_fin     — from `Hora Final--BORRAR-27-08`
--
-- Adds bubble_id to tareas_fechas so the migration script is idempotent (upsert
-- on bubble_id instead of delete+reinsert, to preserve any tareas_fechas
-- entries that were created from the UI post-v3.1.21).

BEGIN;

ALTER TABLE public.tareas
    ADD COLUMN IF NOT EXISTS sitio_id UUID REFERENCES public.terceros_sitios(id),
    ADD COLUMN IF NOT EXISTS hora_inicio TIME,
    ADD COLUMN IF NOT EXISTS hora_fin TIME;

CREATE INDEX IF NOT EXISTS idx_tareas_sitio ON public.tareas(sitio_id);

ALTER TABLE public.tareas_fechas
    ADD COLUMN IF NOT EXISTS bubble_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS tareas_fechas_bubble_id_unique
    ON public.tareas_fechas(bubble_id)
    WHERE bubble_id IS NOT NULL;

COMMIT;
