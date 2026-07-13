-- EPP module — Fase 1 (schema)
--
-- Nuevo módulo de Gestión de Equipos de Protección Personal.
-- Propuesta del cliente GRUAS del 2026-03-17, extendida a todos los tenants.
--
-- Reusa infraestructura existente:
--   companies               → razón social / RUC / dirección para header PDF
--   profiles                → colaborador (+ doc_number = DNI)
--   profile_details         → job_title_id = cargo
--   sst_epp_config          → catálogo maestro de EPP (ya migrado desde Bubble)
--
-- Tablas nuevas (prefijo sst_epp_* para consistencia con sst_epp_config y
-- el resto del namespace sst_*):
--   sst_epp_entrega         → cabecera de entrega a un colaborador
--   sst_epp_item            → item por entrega (con fecha_vencimiento calculada)
--   sst_epp_movimiento      → bitácora entrega/devolución/reemplazo
--   sst_epp_alerta          → alertas generadas por el motor de vencimientos
--   sst_epp_reporte         → reportes semanales automáticos

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Extensiones sobre tablas existentes
-- ─────────────────────────────────────────────────────────────

-- companies: agregar razón social formal (name queda como nombre corto de UI)
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS razon_social TEXT;

-- Backfill: el valor actual de `name` ES la razón social → copiar a razon_social
-- y reducir `name` al nombre corto por tenant. Idempotente (WHERE IS NULL + IDs fijos).
UPDATE public.companies SET razon_social = name WHERE razon_social IS NULL;

UPDATE public.companies SET name = 'CISE'
    WHERE id = '1cb97ec7-326c-4376-93ee-ed317d3da51b' AND name <> 'CISE';
UPDATE public.companies SET name = 'GRUAS DEL PACIFICO'
    WHERE id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73' AND name <> 'GRUAS DEL PACIFICO';

-- sst_epp_config: agregar tipo (EPP / EE) y flag de activo para gestión UI
ALTER TABLE public.sst_epp_config
    ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'EPP'
        CHECK (tipo IN ('EPP', 'EE')),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────
-- 2) sst_epp_entrega — cabecera de entrega
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_epp_entrega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id),
    colaborador_id UUID NOT NULL REFERENCES public.profiles(id),
    responsable_sst_id UUID REFERENCES public.profiles(id),
    fecha_entrega DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('BORRADOR', 'ACTIVO', 'ANULADO')),
    pdf_url TEXT,
    observaciones TEXT,
    bubble_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_sst_epp_entrega_tenant ON public.sst_epp_entrega(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sst_epp_entrega_colaborador ON public.sst_epp_entrega(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_sst_epp_entrega_fecha ON public.sst_epp_entrega(fecha_entrega DESC);

-- ─────────────────────────────────────────────────────────────
-- 3) sst_epp_item — items por entrega
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_epp_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id),
    entrega_id UUID NOT NULL REFERENCES public.sst_epp_entrega(id) ON DELETE CASCADE,
    catalogo_id UUID NOT NULL REFERENCES public.sst_epp_config(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    fecha_vencimiento DATE NOT NULL,
    estado_vigencia TEXT NOT NULL DEFAULT 'VIGENTE'
        CHECK (estado_vigencia IN ('VIGENTE', 'PRONTO', 'VENCIDO', 'DEVUELTO', 'REEMPLAZADO')),
    -- Cuando este item reemplaza a otro (reemplazo por vencimiento/deterioro)
    item_origen_id UUID REFERENCES public.sst_epp_item(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_sst_epp_item_tenant ON public.sst_epp_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sst_epp_item_entrega ON public.sst_epp_item(entrega_id);
CREATE INDEX IF NOT EXISTS idx_sst_epp_item_vencimiento ON public.sst_epp_item(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_sst_epp_item_estado ON public.sst_epp_item(estado_vigencia)
    WHERE estado_vigencia IN ('VIGENTE', 'PRONTO');

-- ─────────────────────────────────────────────────────────────
-- 4) sst_epp_movimiento — bitácora de cambios
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_epp_movimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id),
    colaborador_id UUID NOT NULL REFERENCES public.profiles(id),
    catalogo_id UUID NOT NULL REFERENCES public.sst_epp_config(id),
    item_id UUID REFERENCES public.sst_epp_item(id),
    tipo TEXT NOT NULL
        CHECK (tipo IN ('ENTREGA', 'DEVOLUCION', 'REEMPLAZO')),
    fecha DATE NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_sst_epp_movimiento_tenant ON public.sst_epp_movimiento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sst_epp_movimiento_colaborador ON public.sst_epp_movimiento(colaborador_id, fecha DESC);

-- ─────────────────────────────────────────────────────────────
-- 5) sst_epp_alerta — alertas de vencimiento
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_epp_alerta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id),
    item_id UUID NOT NULL REFERENCES public.sst_epp_item(id) ON DELETE CASCADE,
    nivel TEXT NOT NULL
        CHECK (nivel IN ('D30', 'D15', 'VENCIDO')),
    fecha_generacion TIMESTAMPTZ DEFAULT NOW(),
    gestionado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_gestionado TIMESTAMPTZ,
    gestionado_por UUID REFERENCES public.profiles(id)
);

-- Una sola alerta activa por item × nivel (evita duplicados del cron diario)
CREATE UNIQUE INDEX IF NOT EXISTS sst_epp_alerta_unique_pendiente
    ON public.sst_epp_alerta(item_id, nivel)
    WHERE gestionado = FALSE;

CREATE INDEX IF NOT EXISTS idx_sst_epp_alerta_tenant_pendiente
    ON public.sst_epp_alerta(tenant_id)
    WHERE gestionado = FALSE;

-- ─────────────────────────────────────────────────────────────
-- 6) sst_epp_reporte — reportes semanales
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_epp_reporte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    pdf_url TEXT,
    enviado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_envio TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_sst_epp_reporte_tenant ON public.sst_epp_reporte(tenant_id, fecha_fin DESC);

COMMIT;
