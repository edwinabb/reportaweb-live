-- Cutover 2026-05-02 — Fase A base config + ventas schema
--
-- Aglutina todas las migraciones de fundación requeridas por los audits:
--   07-planificacion  §7.8  → config_informe_maquinaria + config_informe_personal
--   09-ventas         §9.4  → bancos + cobros_venta + columnas detracción + tonelaje
--                      §9.0 → config_valorizacion_venta
--   10-compras        §10.6 → config_valorizacion_compra
--
-- Todas las tablas config_* son 1:1 con tenant (companies) — PK = tenant_id.
-- Seed para CISE y GRUAS con defaults derivados de los PDFs G.PAC-XX adjuntos.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) config_informe_maquinaria
--    Controla la estructura del reporte de maquinaria por tenant:
--    qué secciones se muestran en el form web + en el PDF.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.config_informe_maquinaria (
    tenant_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,

    -- Cardinalidad
    cantidad_turnos SMALLINT NOT NULL DEFAULT 2
        CHECK (cantidad_turnos BETWEEN 1 AND 3),
    cantidad_riggers SMALLINT NOT NULL DEFAULT 2
        CHECK (cantidad_riggers BETWEEN 0 AND 2),

    -- Flags de secciones condicionales
    incluye_firma_cliente BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_foto_trabajo BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_foto_reporte_escrito BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_tipo_recorrido BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_salida_autorizada BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_tonelaje_placa BOOLEAN NOT NULL DEFAULT TRUE,

    -- Header del formato (impreso en el PDF)
    codigo_formato TEXT NOT NULL DEFAULT 'G.PAC-04',
    version_formato TEXT NOT NULL DEFAULT 'V.04',
    fecha_formato TEXT NOT NULL DEFAULT 'Nov-2024',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.config_informe_maquinaria IS
    'Configuración por tenant del reporte de maquinaria — controla jornadas/riggers/firmas/fotos visibles en form y PDF.';

-- ─────────────────────────────────────────────────────────────
-- 2) config_informe_personal
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.config_informe_personal (
    tenant_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,

    cantidad_turnos SMALLINT NOT NULL DEFAULT 3
        CHECK (cantidad_turnos BETWEEN 1 AND 3),

    incluye_horas_extras BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_horas_extras_extraord BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_horas_dominicales BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_gastos BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_firma_cliente_horas BOOLEAN NOT NULL DEFAULT FALSE,
    incluye_firma_trabajador BOOLEAN NOT NULL DEFAULT TRUE,
    incluye_foto_trabajo BOOLEAN NOT NULL DEFAULT FALSE,

    codigo_formato TEXT NOT NULL DEFAULT 'G.PAC-02',
    version_formato TEXT NOT NULL DEFAULT 'V.02',
    fecha_formato TEXT NOT NULL DEFAULT 'Nov-2024',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.config_informe_personal IS
    'Configuración por tenant del reporte de personal — controla jornadas/horas extras/gastos/firmas.';

-- ─────────────────────────────────────────────────────────────
-- 3) config_valorizacion_venta (+ compra)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.config_valorizacion_venta (
    tenant_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo_formato TEXT NOT NULL DEFAULT 'G.PAC-04',
    version_formato TEXT NOT NULL DEFAULT 'V.05',
    fecha_formato TEXT NOT NULL DEFAULT 'Sept-2025',
    igv_default NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    detraccion_default NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.config_valorizacion_venta IS
    'Configuración del PDF y parámetros financieros de valorizaciones de venta por tenant.';

CREATE TABLE IF NOT EXISTS public.config_valorizacion_compra (
    tenant_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo_formato TEXT NOT NULL DEFAULT 'G.PAC-05',
    version_formato TEXT NOT NULL DEFAULT 'V.01',
    fecha_formato TEXT NOT NULL DEFAULT 'Abr-2026',
    igv_default NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    detraccion_default NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.config_valorizacion_compra IS
    'Configuración del PDF (soporte interno) y parámetros de valorizaciones de compra por tenant.';

-- ─────────────────────────────────────────────────────────────
-- 4) bancos — catálogo por tenant
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bancos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    numero_cuenta TEXT,
    moneda TEXT CHECK (moneda IN ('PEN', 'USD')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id),
    CONSTRAINT bancos_tenant_nombre_unique UNIQUE (tenant_id, nombre, moneda)
);

CREATE INDEX IF NOT EXISTS idx_bancos_tenant
    ON public.bancos (tenant_id) WHERE is_active = TRUE;

COMMENT ON TABLE public.bancos IS
    'Catálogo de bancos por tenant — origen/destino de cobros y pagos.';

-- ─────────────────────────────────────────────────────────────
-- 5) cobros_venta — múltiples cobros parciales por factura
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cobros_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    factura_venta_id UUID NOT NULL REFERENCES public.facturas_venta(id) ON DELETE CASCADE,

    tipo TEXT NOT NULL
        CHECK (tipo IN ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'DEPOSITO', 'TARJETA', 'OTRO')),
    monto NUMERIC(14, 2) NOT NULL CHECK (monto > 0),
    moneda TEXT NOT NULL DEFAULT 'USD' CHECK (moneda IN ('PEN', 'USD')),
    banco_id UUID REFERENCES public.bancos(id),
    fecha_cobro DATE NOT NULL,
    comentarios TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_cobros_venta_factura
    ON public.cobros_venta (factura_venta_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cobros_venta_tenant_fecha
    ON public.cobros_venta (tenant_id, fecha_cobro DESC) WHERE is_active = TRUE;

COMMENT ON TABLE public.cobros_venta IS
    'Cobros parciales registrados contra una factura_venta. N:1 con factura.';

-- ─────────────────────────────────────────────────────────────
-- 6) ALTER TABLE facturas_venta — columnas de gestión de detracción
--    (detraccion_usd + detraccion_porcentaje ya existen desde 20260121)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.facturas_venta
    ADD COLUMN IF NOT EXISTS detraccion_monto_sol NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS detraccion_a_cargo_de TEXT
        CHECK (detraccion_a_cargo_de IN ('CLIENTE', 'EMPRESA')),
    ADD COLUMN IF NOT EXISTS detraccion_numero_constancia TEXT,
    ADD COLUMN IF NOT EXISTS detraccion_fecha_pago DATE;

-- ─────────────────────────────────────────────────────────────
-- 7) ALTER TABLE reportes_maquinaria — tonelaje_solicitado
--    Necesario para el PDF Valorización (puede diferir del tonelaje
--    real de la maquinaria: cotizado 24TN, vino equipo 30TN).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.reportes_maquinaria
    ADD COLUMN IF NOT EXISTS tonelaje_solicitado NUMERIC(8, 2);

COMMENT ON COLUMN public.reportes_maquinaria.tonelaje_solicitado IS
    'Tonelaje del servicio cotizado (no necesariamente el de la maquinaria asignada).';

-- ─────────────────────────────────────────────────────────────
-- 8) RLS — habilitar en las tablas nuevas con tenant_id
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.config_informe_maquinaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_informe_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_valorizacion_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_valorizacion_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros_venta ENABLE ROW LEVEL SECURITY;

-- Policies — usamos el patrón estándar del proyecto:
-- las server actions corren bajo service_role y bypasean RLS;
-- el cliente anon no toca directo. Las policies permisivas sobre authenticated
-- mantienen tenant_isolation por select por si alguna query llega al cliente.

DO $$
BEGIN
    -- config_informe_maquinaria
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'config_informe_maquinaria' AND policyname = 'tenant_isolation_select'
    ) THEN
        CREATE POLICY tenant_isolation_select ON public.config_informe_maquinaria
            FOR SELECT TO authenticated
            USING (tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'config_informe_personal' AND policyname = 'tenant_isolation_select'
    ) THEN
        CREATE POLICY tenant_isolation_select ON public.config_informe_personal
            FOR SELECT TO authenticated
            USING (tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'config_valorizacion_venta' AND policyname = 'tenant_isolation_select'
    ) THEN
        CREATE POLICY tenant_isolation_select ON public.config_valorizacion_venta
            FOR SELECT TO authenticated
            USING (tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'config_valorizacion_compra' AND policyname = 'tenant_isolation_select'
    ) THEN
        CREATE POLICY tenant_isolation_select ON public.config_valorizacion_compra
            FOR SELECT TO authenticated
            USING (tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'bancos' AND policyname = 'tenant_isolation_select'
    ) THEN
        CREATE POLICY tenant_isolation_select ON public.bancos
            FOR SELECT TO authenticated
            USING (tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'cobros_venta' AND policyname = 'tenant_isolation_select'
    ) THEN
        CREATE POLICY tenant_isolation_select ON public.cobros_venta
            FOR SELECT TO authenticated
            USING (tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            ));
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 9) SEED — defaults por tenant
--    Tenants fijos del proyecto (ver PROMPT-REINICIO):
--      CISE  = 1cb97ec7-326c-4376-93ee-ed317d3da51b
--      GRUAS = 6f4c923a-c3b7-47c2-9dea-2a187f274f73
-- ─────────────────────────────────────────────────────────────

-- GRUAS: mantiene el formato G.PAC-XX tal como está en los PDFs adjuntos.
-- CISE: defaults conservadores (sin grúas, sin firma cliente, formato propio).
-- Note: INSERT ... SELECT ... WHERE EXISTS so these silently skip in fresh local installs
-- where the production tenant IDs don't exist in companies.

INSERT INTO public.config_informe_maquinaria (
    tenant_id, cantidad_turnos, cantidad_riggers,
    incluye_firma_cliente, incluye_foto_trabajo, incluye_foto_reporte_escrito,
    incluye_tipo_recorrido, incluye_salida_autorizada, incluye_tonelaje_placa,
    codigo_formato, version_formato, fecha_formato
)
SELECT v.tenant_id, v.cantidad_turnos, v.cantidad_riggers,
    v.incluye_firma_cliente, v.incluye_foto_trabajo, v.incluye_foto_reporte_escrito,
    v.incluye_tipo_recorrido, v.incluye_salida_autorizada, v.incluye_tonelaje_placa,
    v.codigo_formato, v.version_formato, v.fecha_formato
FROM (VALUES
    ('6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid, 2, 2, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'G.PAC-04', 'V.04', 'Nov-2024'),
    ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, 2, 0, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 'C.CISE-04', 'V.01', 'Abr-2026')
) AS v(tenant_id, cantidad_turnos, cantidad_riggers, incluye_firma_cliente, incluye_foto_trabajo, incluye_foto_reporte_escrito, incluye_tipo_recorrido, incluye_salida_autorizada, incluye_tonelaje_placa, codigo_formato, version_formato, fecha_formato)
WHERE EXISTS (SELECT 1 FROM public.companies WHERE id = v.tenant_id)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.config_informe_personal (
    tenant_id, cantidad_turnos,
    incluye_horas_extras, incluye_horas_extras_extraord, incluye_horas_dominicales,
    incluye_gastos, incluye_firma_cliente_horas, incluye_firma_trabajador, incluye_foto_trabajo,
    codigo_formato, version_formato, fecha_formato
)
SELECT v.tenant_id, v.cantidad_turnos,
    v.incluye_horas_extras, v.incluye_horas_extras_extraord, v.incluye_horas_dominicales,
    v.incluye_gastos, v.incluye_firma_cliente_horas, v.incluye_firma_trabajador, v.incluye_foto_trabajo,
    v.codigo_formato, v.version_formato, v.fecha_formato
FROM (VALUES
    ('6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid, 3, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, FALSE, 'G.PAC-02', 'V.02', 'Nov-2024'),
    ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, 2, TRUE, FALSE, TRUE, FALSE, FALSE, TRUE, TRUE, 'C.CISE-02', 'V.01', 'Abr-2026')
) AS v(tenant_id, cantidad_turnos, incluye_horas_extras, incluye_horas_extras_extraord, incluye_horas_dominicales, incluye_gastos, incluye_firma_cliente_horas, incluye_firma_trabajador, incluye_foto_trabajo, codigo_formato, version_formato, fecha_formato)
WHERE EXISTS (SELECT 1 FROM public.companies WHERE id = v.tenant_id)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.config_valorizacion_venta (
    tenant_id, codigo_formato, version_formato, fecha_formato,
    igv_default, detraccion_default
)
SELECT v.tenant_id, v.codigo_formato, v.version_formato, v.fecha_formato, v.igv_default, v.detraccion_default
FROM (VALUES
    ('6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid, 'G.PAC-04', 'V.05', 'Sept-2025', 18.00::numeric, 10.00::numeric),
    ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, 'C.CISE-04', 'V.01', 'Abr-2026', 18.00::numeric, 10.00::numeric)
) AS v(tenant_id, codigo_formato, version_formato, fecha_formato, igv_default, detraccion_default)
WHERE EXISTS (SELECT 1 FROM public.companies WHERE id = v.tenant_id)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.config_valorizacion_compra (
    tenant_id, codigo_formato, version_formato, fecha_formato,
    igv_default, detraccion_default
)
SELECT v.tenant_id, v.codigo_formato, v.version_formato, v.fecha_formato, v.igv_default, v.detraccion_default
FROM (VALUES
    ('6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid, 'G.PAC-05', 'V.01', 'Abr-2026', 18.00::numeric, 10.00::numeric),
    ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, 'C.CISE-05', 'V.01', 'Abr-2026', 18.00::numeric, 10.00::numeric)
) AS v(tenant_id, codigo_formato, version_formato, fecha_formato, igv_default, detraccion_default)
WHERE EXISTS (SELECT 1 FROM public.companies WHERE id = v.tenant_id)
ON CONFLICT (tenant_id) DO NOTHING;

COMMIT;
