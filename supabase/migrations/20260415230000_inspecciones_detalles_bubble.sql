-- inspecciones_detalles: agregar bubble_id + campos de migración
-- para migrar informe_respuesta 2026 (25K rows)

BEGIN;

ALTER TABLE public.inspecciones_detalles
    ADD COLUMN IF NOT EXISTS bubble_id TEXT,
    ADD COLUMN IF NOT EXISTS pregunta_bubble_id TEXT,
    ADD COLUMN IF NOT EXISTS respuesta_texto TEXT,
    ADD COLUMN IF NOT EXISTS respuesta_fecha TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tipo_pregunta TEXT,
    ADD COLUMN IF NOT EXISTS puntaje INTEGER,
    ADD COLUMN IF NOT EXISTS obligatorio BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- UNIQUE constraint para upsert idempotente
ALTER TABLE public.inspecciones_detalles
    ADD CONSTRAINT inspecciones_detalles_tenant_bubble_key
    UNIQUE (tenant_id, bubble_id);

CREATE INDEX IF NOT EXISTS idx_insp_det_inspeccion ON public.inspecciones_detalles(inspeccion_id);
CREATE INDEX IF NOT EXISTS idx_insp_det_tenant ON public.inspecciones_detalles(tenant_id);

COMMIT;
