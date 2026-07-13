-- ── Permisos por Cargo ────────────────────────────────────────────────────────
-- sistema_recursos : catálogo global de módulos/rutas del menú
-- cargo_permisos   : VIED por cargo + tenant
-- get_rutas_bloqueadas() : RPC que devuelve las rutas con puede_ver=false
--                          para el usuario autenticado (usado por middleware)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. sistema_recursos (global, sin tenant)
CREATE TABLE IF NOT EXISTS public.sistema_recursos (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     TEXT        NOT NULL,
    ruta_base  TEXT        NOT NULL UNIQUE,
    seccion    TEXT        NOT NULL,
    orden      SMALLINT    NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sistema_recursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sistema_recursos_select" ON public.sistema_recursos;
CREATE POLICY "sistema_recursos_select"
    ON public.sistema_recursos FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "sistema_recursos_modify" ON public.sistema_recursos;
CREATE POLICY "sistema_recursos_modify"
    ON public.sistema_recursos FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'reporta_admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'reporta_admin')
    );

-- 2. cargo_permisos (por tenant)
CREATE TABLE IF NOT EXISTS public.cargo_permisos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES public.companies(id)          ON DELETE CASCADE,
    cargo_id        UUID        NOT NULL REFERENCES public.job_titles(id)         ON DELETE CASCADE,
    recurso_id      UUID        NOT NULL REFERENCES public.sistema_recursos(id)   ON DELETE CASCADE,
    puede_ver       BOOLEAN     NOT NULL DEFAULT TRUE,
    puede_ingresar  BOOLEAN     NOT NULL DEFAULT TRUE,
    puede_editar    BOOLEAN     NOT NULL DEFAULT TRUE,
    puede_eliminar  BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT cargo_permisos_unique UNIQUE (tenant_id, cargo_id, recurso_id)
);

CREATE INDEX IF NOT EXISTS idx_cargo_permisos_cargo    ON public.cargo_permisos(cargo_id);
CREATE INDEX IF NOT EXISTS idx_cargo_permisos_tenant   ON public.cargo_permisos(tenant_id);

ALTER TABLE public.cargo_permisos ENABLE ROW LEVEL SECURITY;

-- Miembros del tenant leen sus permisos
DROP POLICY IF EXISTS "cargo_permisos_select" ON public.cargo_permisos;
CREATE POLICY "cargo_permisos_select"
    ON public.cargo_permisos FOR SELECT TO authenticated
    USING (tenant_id = get_auth_tenant_id());

-- Admin tenant y reporta_admin modifican
DROP POLICY IF EXISTS "cargo_permisos_modify" ON public.cargo_permisos;
CREATE POLICY "cargo_permisos_modify"
    ON public.cargo_permisos FOR ALL TO authenticated
    USING (
        tenant_id = get_auth_tenant_id() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('reporta_admin', 'admin_tenant')
        )
    )
    WITH CHECK (
        tenant_id = get_auth_tenant_id() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('reporta_admin', 'admin_tenant')
        )
    );

-- 3. Seed sistema_recursos
INSERT INTO public.sistema_recursos (nombre, ruta_base, seccion, orden) VALUES
    ('Dashboard',        '/',              'Negocio',     1),
    ('Cotizaciones',     '/cotizaciones',  'Negocio',     2),
    ('Ventas',           '/ventas',        'Negocio',     3),
    ('Compras',          '/compras',       'Negocio',     4),
    ('Terceros',         '/terceros',      'Recursos',    5),
    ('Maquinaria',       '/maquinarias',   'Recursos',    6),
    ('Usuarios',         '/users',         'Recursos',    7),
    ('Gestión Formatos', '/formatos',      'Recursos',    8),
    ('Planificación',    '/planificacion', 'Operaciones', 9),
    ('Informes',         '/informes',      'Operaciones', 10),
    ('Gestión EPP',      '/epp',           'Operaciones', 11),
    ('Planes de Acción', '/planes-accion', 'Operaciones', 12),
    ('Soporte',          '/soporte',       'Config',      13),
    ('Configuración',    '/settings',      'Config',      14)
ON CONFLICT (ruta_base) DO NOTHING;

-- 4. Seed cargo_permisos para todos los cargos activos en los dos tenants
--    (por defecto: todos los permisos en true, excepto eliminar)
DO $seed$
DECLARE
    r_cargo   RECORD;
    r_recurso RECORD;
BEGIN
    FOR r_cargo IN
        SELECT id, tenant_id
        FROM public.job_titles
        WHERE is_active = TRUE
          AND tenant_id IN (
              '1cb97ec7-326c-4376-93ee-ed317d3da51b',   -- CISE
              '6f4c923a-c3b7-47c2-9dea-2a187f274f73'    -- GRUAS
          )
    LOOP
        FOR r_recurso IN SELECT id FROM public.sistema_recursos LOOP
            INSERT INTO public.cargo_permisos
                (tenant_id, cargo_id, recurso_id, puede_ver, puede_ingresar, puede_editar, puede_eliminar)
            VALUES
                (r_cargo.tenant_id, r_cargo.id, r_recurso.id, TRUE, TRUE, TRUE, FALSE)
            ON CONFLICT ON CONSTRAINT cargo_permisos_unique DO NOTHING;
        END LOOP;
    END LOOP;
END;
$seed$;

-- 5. RPC: get_rutas_bloqueadas()
--    Retorna las ruta_base donde puede_ver = FALSE para el usuario autenticado.
--    Devuelve [] si: no autenticado, sin cargo, sin permisos configurados,
--    o si el usuario es reporta_admin.
CREATE OR REPLACE FUNCTION public.get_rutas_bloqueadas()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_uid          UUID;
    v_role         TEXT;
    v_tenant_id    UUID;
    v_job_title_id UUID;
BEGIN
    v_uid := auth.uid();

    IF v_uid IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    SELECT role, tenant_id
    INTO v_role, v_tenant_id
    FROM public.profiles
    WHERE id = v_uid;

    -- reporta_admin no tiene restricciones de rutas
    IF v_role = 'reporta_admin' THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    SELECT job_title_id
    INTO v_job_title_id
    FROM public.profile_details
    WHERE id = v_uid;

    -- Sin cargo → sin restricciones
    IF v_job_title_id IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- Retorna rutas con puede_ver = FALSE
    RETURN ARRAY(
        SELECT sr.ruta_base
        FROM public.cargo_permisos cp
        JOIN public.sistema_recursos sr ON sr.id = cp.recurso_id
        WHERE cp.cargo_id  = v_job_title_id
          AND cp.tenant_id = v_tenant_id
          AND cp.puede_ver = FALSE
    );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_rutas_bloqueadas() TO authenticated;
