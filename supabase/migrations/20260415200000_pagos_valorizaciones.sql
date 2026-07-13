-- Pagos de facturas + Valorizaciones de maquinaria (Bubble → Supabase)
--
-- Contexto (2026-04-15):
--   - `factura_venta_pagos` y `facturas_compra_pagos` ya existían desde
--     `20260121_update_finance_schema.sql`, pero contenían solo esqueletos
--     (bubble_id + created_at, resto NULL). Iteraciones previas dejaron
--     columnas duplicadas (`id_editor`/`editor_id`/`updated_by`,
--     `factura_id`/`factura_compra_id`/`factura_venta_id`, `id_empresa`/`tenant_id`).
--   - Ninguna UI consume estas tablas todavía → TRUNCATE seguro.
--   - `valorizaciones` no existe — es tabla nueva para Bubble
--     `maquinaria_horas-valorizaciones` (752 rows CISE, 0 GRUAS).
--
-- Este script:
--   1) Limpia y normaliza las dos tablas de pagos (truncate + drop cols obsoletas
--      + add missing cols + FK constraints + unique (tenant_id, bubble_id)).
--   2) Crea `valorizaciones` nueva, con FK a `reportes_maquinaria`.
--   3) Habilita RLS tenant_isolation en las tres.

BEGIN;

-- ─── 1) factura_venta_pagos ─────────────────────────────────────────────
TRUNCATE TABLE public.factura_venta_pagos CASCADE;

ALTER TABLE public.factura_venta_pagos
    DROP COLUMN IF EXISTS id_editor,
    DROP COLUMN IF EXISTS id_empresa,
    DROP COLUMN IF EXISTS moneda_id;

ALTER TABLE public.factura_venta_pagos
    ADD COLUMN IF NOT EXISTS tenant_id UUID,
    ADD COLUMN IF NOT EXISTS factura_venta_id TEXT,
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS comentarios TEXT;

-- Asegurar tipos UUID — el reset de feb/2026 dejó estas cols en TEXT.
-- Safe porque TRUNCATE dejó la tabla vacía. USING NULL está OK en tabla vacía.
ALTER TABLE public.factura_venta_pagos
    ALTER COLUMN factura_venta_id TYPE UUID USING NULL,
    ALTER COLUMN created_by TYPE UUID USING NULL;

ALTER TABLE public.factura_venta_pagos
    ALTER COLUMN bubble_id SET NOT NULL,
    ALTER COLUMN tenant_id SET NOT NULL;

-- Drop unique sobre bubble_id solo (viene de 20260121) para reemplazar por compuesta
ALTER TABLE public.factura_venta_pagos
    DROP CONSTRAINT IF EXISTS factura_venta_pagos_bubble_id_key;

ALTER TABLE public.factura_venta_pagos
    ADD CONSTRAINT factura_venta_pagos_tenant_bubble_key
    UNIQUE (tenant_id, bubble_id);

-- FK a factura padre
ALTER TABLE public.factura_venta_pagos
    DROP CONSTRAINT IF EXISTS factura_venta_pagos_factura_venta_id_fkey;
ALTER TABLE public.factura_venta_pagos
    ADD CONSTRAINT factura_venta_pagos_factura_venta_id_fkey
    FOREIGN KEY (factura_venta_id) REFERENCES public.facturas_venta(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fvp_tenant ON public.factura_venta_pagos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fvp_factura ON public.factura_venta_pagos(factura_venta_id);
CREATE INDEX IF NOT EXISTS idx_fvp_fecha_cobro ON public.factura_venta_pagos(fecha_cobro);

-- ─── 2) facturas_compra_pagos ───────────────────────────────────────────
TRUNCATE TABLE public.facturas_compra_pagos CASCADE;

ALTER TABLE public.facturas_compra_pagos
    DROP COLUMN IF EXISTS id_editor,
    DROP COLUMN IF EXISTS editor_id,
    DROP COLUMN IF EXISTS factura_id,
    DROP COLUMN IF EXISTS moneda_id;

ALTER TABLE public.facturas_compra_pagos
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'USD';

-- Asegurar tipos UUID — el reset de feb/2026 alteró factura_id pero no
-- factura_compra_id, y dejó las demás en TEXT. Safe después de TRUNCATE.
ALTER TABLE public.facturas_compra_pagos
    ALTER COLUMN factura_compra_id TYPE UUID USING NULL,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN tenant_id TYPE UUID USING NULL;

ALTER TABLE public.facturas_compra_pagos
    ALTER COLUMN bubble_id SET NOT NULL,
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.facturas_compra_pagos
    DROP CONSTRAINT IF EXISTS facturas_compra_pagos_bubble_id_key;

ALTER TABLE public.facturas_compra_pagos
    ADD CONSTRAINT facturas_compra_pagos_tenant_bubble_key
    UNIQUE (tenant_id, bubble_id);

ALTER TABLE public.facturas_compra_pagos
    DROP CONSTRAINT IF EXISTS facturas_compra_pagos_factura_compra_id_fkey;
ALTER TABLE public.facturas_compra_pagos
    ADD CONSTRAINT facturas_compra_pagos_factura_compra_id_fkey
    FOREIGN KEY (factura_compra_id) REFERENCES public.facturas_compra(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fcp_tenant ON public.facturas_compra_pagos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fcp_factura ON public.facturas_compra_pagos(factura_compra_id);
CREATE INDEX IF NOT EXISTS idx_fcp_fecha_cobro ON public.facturas_compra_pagos(fecha_cobro);

-- ─── 3) valorizaciones (tabla nueva) ────────────────────────────────────
-- Bubble: maquinaria_horas-valorizaciones (752 rows CISE).
-- Es el resumen de facturación por cada reporte de horas: registra la cantidad
-- a facturar vs la cantidad del informe, precio unitario, subtotal y estado
-- (ENVIADO/PAGADO/ANULADO/etc.). Un valorizacion = 1 reporte_maquinaria.
CREATE TABLE IF NOT EXISTS public.valorizaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    bubble_id TEXT,
    reporte_maquinaria_id UUID REFERENCES public.reportes_maquinaria(id) ON DELETE SET NULL,
    codigo TEXT,
    estado TEXT,
    fecha DATE,
    servicio TEXT,
    tipo_precio TEXT,
    cantidad_del_informe NUMERIC(12,2),
    cantidad_minima NUMERIC(12,2),
    cantidad_a_facturar NUMERIC(12,2),
    cant_servicios INTEGER,
    precio_unitario NUMERIC(12,2),
    subtotal NUMERIC(14,2),
    reporte_virtual BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valorizaciones_tenant_bubble_key UNIQUE (tenant_id, bubble_id)
);

CREATE INDEX IF NOT EXISTS idx_valorizaciones_tenant ON public.valorizaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_valorizaciones_reporte ON public.valorizaciones(reporte_maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_valorizaciones_estado ON public.valorizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_valorizaciones_fecha ON public.valorizaciones(fecha);

-- ─── 4) RLS — tenant isolation en las tres ──────────────────────────────
ALTER TABLE public.factura_venta_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.factura_venta_pagos;
CREATE POLICY "tenant_isolation" ON public.factura_venta_pagos
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.facturas_compra_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.facturas_compra_pagos;
CREATE POLICY "tenant_isolation" ON public.facturas_compra_pagos
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.valorizaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.valorizaciones;
CREATE POLICY "tenant_isolation" ON public.valorizaciones
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

COMMIT;
