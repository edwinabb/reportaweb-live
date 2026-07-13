-- MIG-VALIDACION Bloque C / Planes de Acción Fase 0
-- Schema changes to align planes_accion with the real Bubble flow
-- (checklist → informe → plan), discovered during 2026-04-14 probe:
--
--   - Bubble `plan_de_accion` has idInforme, idFormato, idPregunta, idmaquinaria,
--     lista_responsables (multi), lista_fotos, and lista_avance sub-records.
--   - 2025+ plans have 99.7% coverage of the new-flow fields.
--   - Pre-2025 plans (117 legacy) keep NULLs on the new FKs.
--
-- Script: scripts/migrate-planes-accion.ts (updated to populate these fields).

-- ─── 1) New FK columns on planes_accion ────────────────────────────────
-- Notes on reporte_maquinaria_id / inspeccion_id:
--   Bubble plan_de_accion.idInforme points to Bubble type `informes` (plural),
--   which corresponds to Supabase `inspecciones` — currently empty because the
--   informes → inspecciones migration hasn't run yet. So we cannot resolve
--   reporte_maquinaria_id or inspeccion_id in Fase 0. We store the raw Bubble
--   pointer in `informe_bubble_id` so a single UPDATE can populate
--   inspeccion_id later, once inspecciones is populated:
--
--     UPDATE planes_accion p
--     SET inspeccion_id = i.id
--     FROM inspecciones i
--     WHERE p.informe_bubble_id = i.bubble_id;
ALTER TABLE public.planes_accion
    ADD COLUMN IF NOT EXISTS reporte_maquinaria_id UUID REFERENCES public.reportes_maquinaria(id),
    ADD COLUMN IF NOT EXISTS plantilla_id          UUID REFERENCES public.plantillas(id),
    ADD COLUMN IF NOT EXISTS maquinaria_id         UUID REFERENCES public.maquinarias(id),
    ADD COLUMN IF NOT EXISTS pregunta_ref          JSONB,
    ADD COLUMN IF NOT EXISTS lista_fotos           JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS informe_bubble_id     TEXT;

CREATE INDEX IF NOT EXISTS idx_planes_accion_reporte_maquinaria
    ON public.planes_accion(reporte_maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_planes_accion_plantilla
    ON public.planes_accion(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_planes_accion_maquinaria
    ON public.planes_accion(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_planes_accion_informe_bubble_id
    ON public.planes_accion(informe_bubble_id) WHERE informe_bubble_id IS NOT NULL;

-- ─── 2) N:N responsables (replaces single responsable_id going forward) ─
CREATE TABLE IF NOT EXISTS public.planes_accion_responsables (
    plan_id    UUID NOT NULL REFERENCES public.planes_accion(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id),
    tenant_id  UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (plan_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_planes_accion_responsables_profile
    ON public.planes_accion_responsables(profile_id);
CREATE INDEX IF NOT EXISTS idx_planes_accion_responsables_tenant
    ON public.planes_accion_responsables(tenant_id);

ALTER TABLE public.planes_accion_responsables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.planes_accion_responsables;
CREATE POLICY "tenant_isolation" ON public.planes_accion_responsables
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ─── 3) Histórico de avances (lista_avance → sub-records) ──────────────
-- Bubble type: plan_de_accion_avance
-- Source fields: _id, id_accion_correctiva (FK al plan), id_empresa,
--                estado, descripción, Created By, Created Date
-- fotos column is kept JSONB[] even though Bubble source is empty today —
-- users may attach photos going forward.
CREATE TABLE IF NOT EXISTS public.planes_accion_avances (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id    UUID NOT NULL REFERENCES public.planes_accion(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL,
    bubble_id  TEXT,
    estado     TEXT,
    comentario TEXT,
    fotos      JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT planes_accion_avances_tenant_bubble_id_key UNIQUE (tenant_id, bubble_id)
);
CREATE INDEX IF NOT EXISTS idx_planes_accion_avances_plan
    ON public.planes_accion_avances(plan_id);
CREATE INDEX IF NOT EXISTS idx_planes_accion_avances_tenant
    ON public.planes_accion_avances(tenant_id);

ALTER TABLE public.planes_accion_avances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.planes_accion_avances;
CREATE POLICY "tenant_isolation" ON public.planes_accion_avances
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ─── 4) Codigo autoincrementado por tenant ─────────────────────────────
-- Mantiene el formato crudo de Bubble (4 dígitos zero-padded, un
-- consecutivo por tenant). Uso: INSERT ... codigo = get_next_plan_accion_codigo(tenant_id).
-- Ignora valores no-numéricos (legacy) — solo mira los que matchean ^[0-9]+$.
CREATE OR REPLACE FUNCTION public.get_next_plan_accion_codigo(p_tenant_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    max_code INT;
BEGIN
    SELECT COALESCE(MAX(
        CASE WHEN codigo ~ '^[0-9]+$' THEN codigo::INT ELSE 0 END
    ), 0)
    INTO max_code
    FROM public.planes_accion
    WHERE tenant_id = p_tenant_id;

    RETURN LPAD((max_code + 1)::TEXT, 4, '0');
END;
$$;
