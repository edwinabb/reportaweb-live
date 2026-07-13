-- Fase D — columnas faltantes en reportes_personal y reportes_maquinaria
-- para soportar formularios config-aware (jornada 3, firmas y fotos condicionales)

-- ── reportes_personal ────────────────────────────────────────────
ALTER TABLE public.reportes_personal
    ADD COLUMN IF NOT EXISTS jornada3_inicio TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS jornada3_fin TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS firma_trabajador_url TEXT,
    ADD COLUMN IF NOT EXISTS firma_cliente_url TEXT,
    ADD COLUMN IF NOT EXISTS nombre_cliente_firmante TEXT,
    ADD COLUMN IF NOT EXISTS cargo_cliente_firmante TEXT,
    ADD COLUMN IF NOT EXISTS foto_trabajo_url TEXT;

-- ── reportes_maquinaria ──────────────────────────────────────────
ALTER TABLE public.reportes_maquinaria
    ADD COLUMN IF NOT EXISTS jornada3_inicio TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS jornada3_fin TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS salida_autorizada_por TEXT,
    ADD COLUMN IF NOT EXISTS foto_reporte_escrito_url TEXT;
