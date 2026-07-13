-- Create sst_epp_config — master catalog of EPP/EE items (migrated from Bubble).
-- This table was originally migrated from Bubble without a formal migration file.
-- Created here to allow epp_module.sql (20260419140000) to ALTER it safely.
CREATE TABLE IF NOT EXISTS public.sst_epp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bubble_id TEXT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidad TEXT,
    tiempo_vida_meses INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    CONSTRAINT sst_epp_config_tenant_bubble_key UNIQUE (tenant_id, bubble_id)
);

CREATE INDEX IF NOT EXISTS idx_sst_epp_config_tenant ON public.sst_epp_config(tenant_id);

ALTER TABLE public.sst_epp_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.sst_epp_config;
CREATE POLICY "tenant_isolation" ON public.sst_epp_config
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
