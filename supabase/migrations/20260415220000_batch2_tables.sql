-- Batch 2: maquinaria_horas + informe_objetos + cotizaciones_motivo_rechazo
--          + servicios_tipo_precios + valorizaciones FK fix
--
-- user_documents ya existe (20260101003000_create_user_documents_enhanced.sql),
-- solo necesita (tenant_id, bubble_id) unique para upsert idempotente.
--
-- Contexto (2026-04-15): probe masivo de 26 tipos Bubble reveló 6 candidatos
-- a migrar. El #1 (informe_respuesta, 350K rows) queda para después.
-- Los #2-#6 se migran con esta migration + migrate-batch-2.ts.

BEGIN;

-- ─── 1) user_documents: agregar UNIQUE (tenant_id, bubble_id) ───────────
-- Ya tiene idx_user_documents_bubble_id UNIQUE(bubble_id) solo.
-- Agregar constraint compuesta para consistencia con el resto.
DROP INDEX IF EXISTS idx_user_documents_bubble_id;
ALTER TABLE public.user_documents
    ADD CONSTRAINT user_documents_tenant_bubble_key
    UNIQUE (tenant_id, bubble_id);

-- ─── 2) maquinaria_horas (1,954 CISE) ──────────────────────────────────
-- Bubble: `maquinaria_horas` — registro intermedio entre tarea y valorización.
-- Cada record = un período de uso de maquinaria con jornadas, horas y FK a
-- tarea, maquinaria, cotización item, cliente, e informe (inspección).
-- Es el FK target que falta en `valorizaciones` (hoy 752 rows con NULL).
CREATE TABLE IF NOT EXISTS public.maquinaria_horas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    bubble_id TEXT,
    maquinaria_id UUID REFERENCES public.maquinarias(id) ON DELETE SET NULL,
    tarea_id UUID REFERENCES public.tareas(id) ON DELETE SET NULL,
    cotizacion_item_id UUID REFERENCES public.cotizaciones_detalle(id) ON DELETE SET NULL,
    inspeccion_id UUID REFERENCES public.inspecciones(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
    codigo TEXT,
    estado TEXT,
    tipo_recorrido TEXT,
    jornada1_inicio TIMESTAMPTZ,
    jornada1_fin TIMESTAMPTZ,
    jornada2_inicio TIMESTAMPTZ,
    jornada2_fin TIMESTAMPTZ,
    total_horas_texto TEXT,
    total_horas_num NUMERIC(8,2),
    cant_servicios INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT maquinaria_horas_tenant_bubble_key UNIQUE (tenant_id, bubble_id)
);

CREATE INDEX IF NOT EXISTS idx_maquinaria_horas_tenant ON public.maquinaria_horas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maquinaria_horas_maquinaria ON public.maquinaria_horas(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_maquinaria_horas_tarea ON public.maquinaria_horas(tarea_id);

ALTER TABLE public.maquinaria_horas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.maquinaria_horas;
CREATE POLICY "tenant_isolation" ON public.maquinaria_horas
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- FK en valorizaciones → maquinaria_horas (reemplaza el NULL reporte_maquinaria_id)
ALTER TABLE public.valorizaciones
    ADD COLUMN IF NOT EXISTS maquinaria_horas_id UUID REFERENCES public.maquinaria_horas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_valorizaciones_maq_horas ON public.valorizaciones(maquinaria_horas_id);

-- ─── 3) informe_objetos (14,296) ────────────────────────────────────────
-- Bubble: `informe_objeto` — objetos inspeccionados (maquinaria y/o proveedor).
-- No tiene FK directo a inspecciones; la relación es indirecta via la tarea.
CREATE TABLE IF NOT EXISTS public.informe_objetos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    bubble_id TEXT,
    maquinaria_id UUID REFERENCES public.maquinarias(id) ON DELETE SET NULL,
    proveedor_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT informe_objetos_tenant_bubble_key UNIQUE (tenant_id, bubble_id)
);

CREATE INDEX IF NOT EXISTS idx_informe_objetos_tenant ON public.informe_objetos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_informe_objetos_maquinaria ON public.informe_objetos(maquinaria_id);

ALTER TABLE public.informe_objetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.informe_objetos;
CREATE POLICY "tenant_isolation" ON public.informe_objetos
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ─── 4) cotizaciones_motivo_rechazo (508) ─────────���─────────────────────
CREATE TABLE IF NOT EXISTS public.cotizaciones_motivo_rechazo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    bubble_id TEXT,
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    motivo TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT cotizaciones_motivo_rechazo_tenant_bubble_key UNIQUE (tenant_id, bubble_id)
);

CREATE INDEX IF NOT EXISTS idx_cot_rechazo_tenant ON public.cotizaciones_motivo_rechazo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cot_rechazo_cotizacion ON public.cotizaciones_motivo_rechazo(cotizacion_id);

ALTER TABLE public.cotizaciones_motivo_rechazo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.cotizaciones_motivo_rechazo;
CREATE POLICY "tenant_isolation" ON public.cotizaciones_motivo_rechazo
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ─── 5) servicios_tipo_precios (58) ──��──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.servicios_tipo_precios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    bubble_id TEXT,
    codigo TEXT,
    nombre TEXT,
    minimo_opcion_bubble_id TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT servicios_tipo_precios_tenant_bubble_key UNIQUE (tenant_id, bubble_id)
);

CREATE INDEX IF NOT EXISTS idx_svc_tipo_precios_tenant ON public.servicios_tipo_precios(tenant_id);

ALTER TABLE public.servicios_tipo_precios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.servicios_tipo_precios;
CREATE POLICY "tenant_isolation" ON public.servicios_tipo_precios
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

COMMIT;
