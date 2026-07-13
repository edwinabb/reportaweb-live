-- Create reportes_usuario table
CREATE TABLE IF NOT EXISTS public.reportes_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE,
    tenant_id TEXT,
    -- Mapped from id_empresa (Bubble ID string)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    -- Bubble ID of creator
    updated_by TEXT,
    -- Bubble ID of editor (Resolved from editor_id or Created By)
    fecha_reporte DATE,
    codigo_interno TEXT,
    tarea_id TEXT,
    -- Bubble ID
    item_cotizacion_id TEXT,
    -- Bubble ID id_item_cotizacion
    maquina_id TEXT,
    -- Bubble ID id_maquina
    total_horas NUMERIC,
    horas_extras NUMERIC,
    horas_extras_extraordinarias NUMERIC,
    horas_dominicales NUMERIC,
    jornada_adicional BOOLEAN DEFAULT FALSE,
    dominical_festivo BOOLEAN DEFAULT FALSE,
    jornada1_inicio TIMESTAMPTZ,
    jornada1_fin TIMESTAMPTZ,
    jornada2_inicio TIMESTAMPTZ,
    jornada2_fin TIMESTAMPTZ,
    jornada3_inicio TIMESTAMPTZ,
    jornada3_fin TIMESTAMPTZ,
    gastos_desayuno NUMERIC,
    gastos_almuerzo NUMERIC,
    gastos_cena NUMERIC,
    gastos_movilidad NUMERIC,
    gastos_total NUMERIC,
    notas TEXT,
    pdf_url TEXT,
    -- Path in Storage
    is_active BOOLEAN DEFAULT TRUE
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_reportes_usuario_bubble_id ON public.reportes_usuario(bubble_id);
CREATE INDEX IF NOT EXISTS idx_reportes_usuario_tenant_id ON public.reportes_usuario(tenant_id);
-- RLS
ALTER TABLE public.reportes_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.reportes_usuario FOR
SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.reportes_usuario FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on email" ON public.reportes_usuario FOR
UPDATE USING (auth.role() = 'authenticated');