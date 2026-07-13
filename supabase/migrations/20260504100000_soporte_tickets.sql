-- ============================================================
-- Migration: Módulo de Soporte — REPORTA_WEB
-- Tablas: tickets_soporte, tickets_soporte_respuestas
-- Función: next_ticket_soporte_numero (race-safe consecutivo)
-- Storage: bucket 'problemas' (público)
-- ============================================================

-- ── 1. Tablas ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tickets_soporte (
    id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    numero                    INTEGER      NOT NULL,
    tenant_id                 UUID         NOT NULL REFERENCES public.companies(id)  ON DELETE CASCADE,
    user_id                   UUID         NOT NULL REFERENCES auth.users(id)         ON DELETE CASCADE,
    sistema                   TEXT         NOT NULL DEFAULT 'REPORTA_WEB',
    seccion                   TEXT         NOT NULL,
    descripcion               TEXT         NOT NULL,
    criticidad                TEXT         NOT NULL DEFAULT 'MEDIA'
                                           CHECK (criticidad IN ('BAJA','MEDIA','ALTA')),
    estado                    TEXT         NOT NULL DEFAULT 'ABIERTO'
                                           CHECK (estado IN ('ABIERTO','EN_PROGRESO','CERRADO')),
    imagenes_problema         JSONB        NOT NULL DEFAULT '[]',
    explicacion_no_tecnica    TEXT,
    como_se_previene          TEXT,
    imagenes_replica_dev      JSONB        NOT NULL DEFAULT '[]',
    imagenes_pruebas_exitosas JSONB        NOT NULL DEFAULT '[]',
    cerrado_at                TIMESTAMPTZ,
    cerrado_por_id            UUID         REFERENCES auth.users(id),
    created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT tickets_soporte_tenant_numero_unique UNIQUE (tenant_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_tickets_soporte_tenant_id   ON public.tickets_soporte (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_soporte_user_id     ON public.tickets_soporte (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_soporte_estado      ON public.tickets_soporte (estado);
CREATE INDEX IF NOT EXISTS idx_tickets_soporte_created_at  ON public.tickets_soporte (created_at DESC);

CREATE TABLE IF NOT EXISTS public.tickets_soporte_respuestas (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id     UUID         NOT NULL REFERENCES public.tickets_soporte(id) ON DELETE CASCADE,
    tenant_id     UUID         NOT NULL REFERENCES public.companies(id)       ON DELETE CASCADE,
    user_id       UUID         REFERENCES auth.users(id),
    mensaje       TEXT         NOT NULL,
    tipo          TEXT         NOT NULL DEFAULT 'COMENTARIO'
                               CHECK (tipo IN ('COMENTARIO','CAMBIO_ESTADO','RESOLUCION','SISTEMA')),
    estado_nuevo  TEXT,
    imagenes      JSONB        NOT NULL DEFAULT '[]',
    es_de_soporte BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tsr_ticket_id ON public.tickets_soporte_respuestas (ticket_id);
CREATE INDEX IF NOT EXISTS idx_tsr_tenant_id ON public.tickets_soporte_respuestas (tenant_id);

-- ── 2. updated_at triggers ────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at_soporte()
RETURNS TRIGGER LANGUAGE plpgsql AS $set_updated_at_soporte$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$set_updated_at_soporte$;

DROP TRIGGER IF EXISTS trg_tickets_soporte_updated_at ON public.tickets_soporte;
CREATE TRIGGER trg_tickets_soporte_updated_at
    BEFORE UPDATE ON public.tickets_soporte
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_soporte();

DROP TRIGGER IF EXISTS trg_tickets_soporte_resp_updated_at ON public.tickets_soporte_respuestas;
CREATE TRIGGER trg_tickets_soporte_resp_updated_at
    BEFORE UPDATE ON public.tickets_soporte_respuestas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_soporte();

-- ── 3. Función consecutivo race-safe ─────────────────────

CREATE OR REPLACE FUNCTION public.next_ticket_soporte_numero(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $next_ticket_soporte_numero$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text));
    RETURN (
        SELECT COALESCE(MAX(numero), 0) + 1
        FROM public.tickets_soporte
        WHERE tenant_id = p_tenant_id
    );
END;
$next_ticket_soporte_numero$;

GRANT EXECUTE ON FUNCTION public.next_ticket_soporte_numero(UUID) TO authenticated;

-- ── 4. RLS — tickets_soporte ──────────────────────────────

ALTER TABLE public.tickets_soporte ENABLE ROW LEVEL SECURITY;

-- Lectura: propios + admin_tenant ve todo el tenant + reporta_admin ve todo
DROP POLICY IF EXISTS "ts_select"  ON public.tickets_soporte;
DROP POLICY IF EXISTS "ts_insert"  ON public.tickets_soporte;
DROP POLICY IF EXISTS "ts_update"  ON public.tickets_soporte;
CREATE POLICY "ts_select" ON public.tickets_soporte
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
            AND (SELECT role  FROM public.profiles WHERE id = auth.uid()) IN ('admin_tenant','reporta_admin')
        )
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin'
    );

-- Inserción: cualquier usuario autenticado, siempre dentro de su tenant
CREATE POLICY "ts_insert" ON public.tickets_soporte
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id   = auth.uid()
        AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Actualización: admin_tenant de su tenant + reporta_admin
CREATE POLICY "ts_update" ON public.tickets_soporte
    FOR UPDATE TO authenticated
    USING (
        (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_tenant'
            AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin'
    );

-- ── 5. RLS — tickets_soporte_respuestas ──────────────────

ALTER TABLE public.tickets_soporte_respuestas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tsr_select" ON public.tickets_soporte_respuestas;
DROP POLICY IF EXISTS "tsr_insert" ON public.tickets_soporte_respuestas;
CREATE POLICY "tsr_select" ON public.tickets_soporte_respuestas
    FOR SELECT TO authenticated
    USING (
        ticket_id IN (
            SELECT id FROM public.tickets_soporte
            WHERE
                user_id = auth.uid()
                OR (
                    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
                    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_tenant','reporta_admin')
                )
                OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'reporta_admin'
        )
    );

CREATE POLICY "tsr_insert" ON public.tickets_soporte_respuestas
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND ticket_id IN (
            SELECT id FROM public.tickets_soporte
            WHERE user_id = auth.uid()
               OR (
                    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
                    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_tenant','reporta_admin')
               )
        )
    );

-- ── 6. Storage bucket 'problemas' ────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'problemas',
    'problemas',
    TRUE,
    10485760,  -- 10 MB por archivo
    ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política de upload: cualquier usuario autenticado puede subir
DROP POLICY IF EXISTS "problemas_insert" ON storage.objects;
DROP POLICY IF EXISTS "problemas_select" ON storage.objects;
DROP POLICY IF EXISTS "problemas_delete" ON storage.objects;
CREATE POLICY "problemas_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'problemas');

-- Política de lectura pública
CREATE POLICY "problemas_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'problemas');

-- Política de borrado: solo el que subió o admin
CREATE POLICY "problemas_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'problemas'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin_tenant','reporta_admin')
        )
    );
