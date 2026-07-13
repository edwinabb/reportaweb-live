-- Modelo definitivo de planificación (3 tablas):
--
--   tareas          → encabezado puro (cliente, sitio, cotización, título, prioridad, estado).
--                     Sin fechas.
--
--   tareas_fechas   → intervalos de fechas. Una tarea puede tener N intervalos.
--                     Cada fila es:
--                       - consecutivo: fecha_inicio + fecha_fin (inclusive)
--                       - salteado: fechas_multiples DATE[]
--
--   tareas_recursos → recursos asignados a un intervalo (tareas_fechas).
--                     Un intervalo puede tener M recursos; un recurso puede
--                     tener N intervalos en la misma tarea.
--                     tarea_id queda denormalizado para filtros rápidos.
--
-- Racional: una tarea de un mes con el mismo recurso es 1 fila en cada tabla,
-- no 30. Si un recurso distinto trabaja otra semana, se crea otra fila en
-- tareas_fechas y se le asigna ese recurso allí.

BEGIN;

-- 1) tareas: dropear fecha_vencimiento (legacy, no se usa).
ALTER TABLE public.tareas
    DROP COLUMN IF EXISTS fecha_vencimiento;

-- 2) tareas_fechas: reestructurar para soportar intervalos.
ALTER TABLE public.tareas_fechas
    DROP COLUMN IF EXISTS fecha,
    DROP COLUMN IF EXISTS assigned_by;

ALTER TABLE public.tareas_fechas
    ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
    ADD COLUMN IF NOT EXISTS fecha_fin DATE,
    ADD COLUMN IF NOT EXISTS fechas_multiples DATE[],
    ADD COLUMN IF NOT EXISTS notas TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Check: al menos uno de los dos modos de fecha tiene que existir.
ALTER TABLE public.tareas_fechas
    DROP CONSTRAINT IF EXISTS tareas_fechas_modo_check;
ALTER TABLE public.tareas_fechas
    ADD CONSTRAINT tareas_fechas_modo_check CHECK (
        (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL)
        OR (fechas_multiples IS NOT NULL AND array_length(fechas_multiples, 1) > 0)
    );

-- Check: si es consecutivo, fecha_fin >= fecha_inicio.
ALTER TABLE public.tareas_fechas
    DROP CONSTRAINT IF EXISTS tareas_fechas_rango_check;
ALTER TABLE public.tareas_fechas
    ADD CONSTRAINT tareas_fechas_rango_check CHECK (
        fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin >= fecha_inicio
    );

CREATE INDEX IF NOT EXISTS idx_tareas_fechas_rango
    ON public.tareas_fechas (fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_tareas_fechas_tarea
    ON public.tareas_fechas (tarea_id);

-- 3) tareas_recursos: linkear al intervalo (tarea_fecha_id) y soltar fecha_asignada.
ALTER TABLE public.tareas_recursos
    ADD COLUMN IF NOT EXISTS tarea_fecha_id UUID
        REFERENCES public.tareas_fechas(id) ON DELETE CASCADE;

-- Antes de dropear fecha_asignada, si alguien ya la había usado, la data
-- queda huérfana (no hay intervalos creados todavía). Para esta fase no hay
-- que migrar nada porque tareas_fechas estaba vacía y fecha_asignada solo
-- se usó en setups de test. Si llega a existir data productiva, backup
-- previo debería cubrirla.
ALTER TABLE public.tareas_recursos
    DROP COLUMN IF EXISTS fecha_asignada;

CREATE INDEX IF NOT EXISTS idx_tareas_recursos_tarea_fecha
    ON public.tareas_recursos (tarea_fecha_id);

-- 4) RLS — tareas_fechas ya tenía policies por tenant (trigger-based en
--    el create inicial). No tocamos. Lo mismo tareas_recursos.

COMMIT;
