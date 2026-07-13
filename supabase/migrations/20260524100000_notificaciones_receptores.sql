CREATE TABLE IF NOT EXISTS public.notificaciones_receptores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_correo TEXT NOT NULL,
    email       TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    frecuencia  TEXT NOT NULL DEFAULT 'DIARIA',
    dia_semana  SMALLINT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_receptores_tenant
    ON public.notificaciones_receptores (tenant_id, tipo_correo, is_active);

ALTER TABLE public.notificaciones_receptores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolation" ON public.notificaciones_receptores
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificaciones_receptores TO authenticated;

-- Seed: only insert if production tenants exist (skips in fresh local installs)
INSERT INTO public.notificaciones_receptores (tenant_id, tipo_correo, email, nombre, frecuencia)
SELECT v.tenant_id, v.tipo_correo, v.email, v.nombre, v.frecuencia
FROM (VALUES
    ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, 'DOCUMENTOS_MAQUINARIA_VENCIDOS', 'info@reporta.la', 'EDWIN', 'DIARIA'),
    ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, 'DOCUMENTOS_PERSONAL_VENCIDOS',   'info@reporta.la', 'EDWIN', 'DIARIA'),
    ('6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid, 'DOCUMENTOS_MAQUINARIA_VENCIDOS', 'info@reporta.la', 'EDWIN', 'DIARIA'),
    ('6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid, 'DOCUMENTOS_PERSONAL_VENCIDOS',   'info@reporta.la', 'EDWIN', 'DIARIA')
) AS v(tenant_id, tipo_correo, email, nombre, frecuencia)
WHERE EXISTS (SELECT 1 FROM public.companies WHERE id = v.tenant_id)
ON CONFLICT DO NOTHING;
