-- Fix RLS policy: add WITH CHECK and use get_auth_tenant_id()
DROP POLICY IF EXISTS "tenant isolation" ON public.notificaciones_receptores;

CREATE POLICY "tenant isolation" ON public.notificaciones_receptores
    FOR ALL TO authenticated
    USING  (tenant_id = get_auth_tenant_id())
    WITH CHECK (tenant_id = get_auth_tenant_id());

-- Add CHECK constraints
ALTER TABLE public.notificaciones_receptores
    ADD CONSTRAINT chk_tipo_correo CHECK (
        tipo_correo IN ('DOCUMENTOS_MAQUINARIA_VENCIDOS', 'DOCUMENTOS_PERSONAL_VENCIDOS')
    ),
    ADD CONSTRAINT chk_frecuencia CHECK (
        frecuencia IN ('DIARIA', 'SEMANAL')
    ),
    ADD CONSTRAINT chk_dia_semana CHECK (
        (frecuencia = 'SEMANAL' AND dia_semana BETWEEN 0 AND 6)
        OR (frecuencia = 'DIARIA' AND dia_semana IS NULL)
    );

-- Add UNIQUE to prevent duplicate receptors per tenant+tipo+email
ALTER TABLE public.notificaciones_receptores
    ADD CONSTRAINT uq_receptor UNIQUE (tenant_id, tipo_correo, email);
