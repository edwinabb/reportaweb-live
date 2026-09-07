CREATE TABLE public.system_document_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    tipo          TEXT NOT NULL CHECK (tipo IN (
                      'cotizacion', 'valorizacion_venta', 'valorizacion_compra',
                      'reporte_maquinaria', 'reporte_horas_maquinaria', 'reporte_personal'
                  )),
    version       INT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT false,
    storage_path  TEXT NOT NULL,
    created_by    UUID NOT NULL REFERENCES auth.users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by    UUID REFERENCES auth.users(id),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, tipo, version)
);

CREATE UNIQUE INDEX system_document_templates_active_unique
    ON public.system_document_templates (tenant_id, tipo)
    WHERE is_active = true;

ALTER TABLE public.system_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sdt_reporta_admin_only" ON public.system_document_templates
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin');

GRANT ALL ON public.system_document_templates TO service_role;
GRANT ALL ON public.system_document_templates TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('system-templates', 'system-templates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "st_reporta_admin_only" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'system-templates' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin')
    WITH CHECK (bucket_id = 'system-templates' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin');
