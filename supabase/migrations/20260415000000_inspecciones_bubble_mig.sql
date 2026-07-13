-- Inspecciones migration support (Bubble `informes` → Supabase `inspecciones`)
--
-- Adds columns needed to migrate the Bubble `informes` type and resolve the
-- deferred FK in `planes_accion.inspeccion_id` (see 20260414000000_planes_accion_fase0.sql).
--
-- Bubble `informes` schema (post-2025 variant, 27 keys):
--   _id, id_empresa, id_cliente, id_cotizacion, id_formato, id_maquinaria, id_tarea,
--   codigo (INF-xxxx), estado, fecha_reporte, fecha_finalizacion, archivo_web, archivo_pdf,
--   archivo_nombre, puntaje, tiene_plan_de_accion, tiene_respuestas_criticas,
--   tiene_respuestas_erroneas, tiene_info_adicional, tiene_aprobaciones, actualizado, borrado,
--   id_objetos, Created By/Date, Modified Date, lista_respuestas - Para que?

-- 1. Add bubble_id + new FKs + metadata to inspecciones
ALTER TABLE public.inspecciones
    ADD COLUMN IF NOT EXISTS bubble_id TEXT,
    ADD COLUMN IF NOT EXISTS codigo TEXT,
    ADD COLUMN IF NOT EXISTS archivo_nombre TEXT,
    ADD COLUMN IF NOT EXISTS archivo_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS puntaje INT,
    ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tiene_plan_de_accion BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tiene_respuestas_criticas BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tiene_respuestas_erroneas BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tarea_id UUID REFERENCES public.tareas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL;

-- 2. Unique composite index for idempotent upserts by (tenant_id, bubble_id)
CREATE UNIQUE INDEX IF NOT EXISTS inspecciones_tenant_bubble_id_uq
    ON public.inspecciones (tenant_id, bubble_id)
    WHERE bubble_id IS NOT NULL;

-- 3. Helpful lookup indexes
CREATE INDEX IF NOT EXISTS inspecciones_tarea_id_idx ON public.inspecciones (tarea_id) WHERE tarea_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS inspecciones_maquinaria_id_idx ON public.inspecciones (maquinaria_id) WHERE maquinaria_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS inspecciones_plantilla_id_idx ON public.inspecciones (plantilla_id) WHERE plantilla_id IS NOT NULL;
