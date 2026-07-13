-- Módulo Formatos (antes "Checklist") — Fase A.3
--
-- Spec base: docs/auditoria/08-formatos.md (adaptado del spec v3 con rename obligatorio).
-- El módulo reemplaza a futuro las tablas legacy `formato` + `respuestas`.
-- La APP móvil Expo es post-cutover; la web pre-cutover usa este mismo schema.
--
-- Convenciones:
--   - snake_case español, UUID v4, is_active, bubble_id nullable.
--   - CHECK en vez de ENUMs.
--   - Triggers de integridad: versión publicada inmutable + correlativo atómico.
--
-- Tablas:
--   formatos                     → plantilla conceptual (ej. INF-3298 Grúas)
--   formatos_versiones           → versión publicada (inmutable)
--   formatos_preguntas           → preguntas de una versión
--   formatos_opciones            → opciones de pregunta tipo SELECCION_*
--   formatos_informes            → instancia llenada (reemplaza a `respuestas`)
--   formatos_informes_respuestas → respuestas individuales (1 fila por pregunta)
--   formatos_informes_maquinarias
--   formatos_informes_personal
--   formatos_informes_comentarios
--   formatos_correlativos        → secuencial por tenant + formato + año

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) formatos — plantilla conceptual
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,                     -- Ej: INF-3298
    nombre TEXT NOT NULL,                     -- Ej: CHECKLIST DE GRUAS
    descripcion TEXT,
    version_actual_id UUID,                   -- FK circular hacia formatos_versiones — se agrega abajo

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    bubble_id TEXT UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id),

    CONSTRAINT formatos_tenant_codigo_unique UNIQUE (tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_formatos_tenant
    ON public.formatos (tenant_id) WHERE is_active = TRUE;

COMMENT ON TABLE public.formatos IS
    'Plantilla conceptual de un formato (ej. INF-3298 Checklist de Grúas). Puede tener N versiones publicadas.';

-- ─────────────────────────────────────────────────────────────
-- 2) formatos_versiones
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_versiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    formato_id UUID NOT NULL REFERENCES public.formatos(id) ON DELETE CASCADE,
    numero_version INTEGER NOT NULL,          -- 1, 2, 3...
    etiqueta_version TEXT,                    -- Ej: "V.03"

    -- Estado
    estado TEXT NOT NULL DEFAULT 'BORRADOR'
        CHECK (estado IN ('BORRADOR', 'PUBLICADA', 'ARCHIVADA')),
    publicado_at TIMESTAMPTZ,

    -- Flags de bloques visibles en el informe (nivel plantilla)
    muestra_bloque_empresa BOOLEAN NOT NULL DEFAULT TRUE,
    muestra_bloque_cliente BOOLEAN NOT NULL DEFAULT TRUE,
    muestra_bloque_cotizacion BOOLEAN NOT NULL DEFAULT TRUE,
    muestra_bloque_tarea BOOLEAN NOT NULL DEFAULT TRUE,
    muestra_bloque_observaciones BOOLEAN NOT NULL DEFAULT TRUE,
    muestra_bloque_firma BOOLEAN NOT NULL DEFAULT TRUE,

    -- Cardinalidad de recursos
    requisito_maquinaria TEXT NOT NULL DEFAULT 'OPCIONAL'
        CHECK (requisito_maquinaria IN ('DESHABILITADO', 'OPCIONAL', 'UNICO', 'MULTIPLE')),
    requisito_personal TEXT NOT NULL DEFAULT 'OPCIONAL'
        CHECK (requisito_personal IN ('DESHABILITADO', 'OPCIONAL', 'UNICO', 'MULTIPLE')),

    min_app_version TEXT,                     -- Para bloquear apps viejas en sync móvil

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id),

    CONSTRAINT formatos_versiones_unique UNIQUE (formato_id, numero_version)
);

CREATE INDEX IF NOT EXISTS idx_formatos_versiones_tenant ON public.formatos_versiones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_formatos_versiones_formato ON public.formatos_versiones (formato_id);
CREATE INDEX IF NOT EXISTS idx_formatos_versiones_estado ON public.formatos_versiones (estado);

COMMENT ON TABLE public.formatos_versiones IS
    'Versión de un formato. Estado PUBLICADA es inmutable (trigger). Cambios requieren nueva versión.';

-- FK circular (formatos.version_actual_id → formatos_versiones.id)
-- Idempotente: chequea pg_constraint antes de agregar.
DO $do_fk_circular$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'formatos_version_actual_fkey'
          AND conrelid = 'public.formatos'::regclass
    ) THEN
        ALTER TABLE public.formatos
            ADD CONSTRAINT formatos_version_actual_fkey
            FOREIGN KEY (version_actual_id)
            REFERENCES public.formatos_versiones(id) ON DELETE SET NULL;
    END IF;
END
$do_fk_circular$;

-- ─────────────────────────────────────────────────────────────
-- 3) formatos_preguntas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_preguntas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.formatos_versiones(id) ON DELETE CASCADE,

    seccion TEXT,                             -- Ej: "INSPECCIÓN REALIZADA" (agrupar)
    orden INTEGER NOT NULL,
    texto TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'SELECCION_UNICA'
        CHECK (tipo IN (
            'SELECCION_UNICA',
            'SELECCION_MULTIPLE',
            'TEXTO_CORTO',
            'TEXTO_LARGO',
            'NUMERO',
            'FECHA',
            'BOOLEANO',
            'FOTO'
        )),
    requerida BOOLEAN NOT NULL DEFAULT TRUE,
    texto_ayuda TEXT,
    permite_nota BOOLEAN NOT NULL DEFAULT TRUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_formatos_preguntas_version
    ON public.formatos_preguntas (version_id, orden);

-- ─────────────────────────────────────────────────────────────
-- 4) formatos_opciones
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_opciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    pregunta_id UUID NOT NULL REFERENCES public.formatos_preguntas(id) ON DELETE CASCADE,

    orden INTEGER NOT NULL,
    etiqueta TEXT NOT NULL,                   -- "SI", "NO", "NO APLICA"
    valor TEXT NOT NULL,                      -- "si", "no", "na"
    es_conforme BOOLEAN,                      -- true=cumple, false=no cumple, null=neutral

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT formatos_opciones_pregunta_valor_unique UNIQUE (pregunta_id, valor)
);

CREATE INDEX IF NOT EXISTS idx_formatos_opciones_pregunta
    ON public.formatos_opciones (pregunta_id, orden);

-- ─────────────────────────────────────────────────────────────
-- 5) formatos_informes — instancia llenada
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_informes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.formatos_versiones(id),

    -- FKs a catálogos existentes
    cliente_id UUID REFERENCES public.terceros(id),
    cotizacion_id UUID REFERENCES public.cotizaciones(id),
    contacto_id UUID REFERENCES public.terceros_contactos(id),
    tarea_id UUID REFERENCES public.tareas(id),
    sitio_id UUID REFERENCES public.terceros_sitios(id),

    -- Snapshots JSON (reproducibilidad histórica)
    cliente_snapshot JSONB,
    cotizacion_snapshot JSONB,
    contacto_snapshot JSONB,
    tarea_snapshot JSONB,
    sitio_snapshot JSONB,

    -- Overrides editables
    tarea_codigo_override TEXT,
    tarea_descripcion_override TEXT,
    sitio_descripcion_override TEXT,

    observaciones TEXT,

    -- Firma final (profile del sistema)
    firmante_profile_id UUID REFERENCES public.profiles(id),
    firmante_snapshot JSONB,
    firma_url TEXT,
    firma_hash TEXT,
    firma_metadata JSONB,
    pin_validado_at TIMESTAMPTZ,

    -- Tiempos del trabajo
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,

    -- Estado del informe
    estado TEXT NOT NULL DEFAULT 'BORRADOR'
        CHECK (estado IN ('BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO', 'CON_COMENTARIOS')),
    enviado_at TIMESTAMPTZ,
    aprobado_at TIMESTAMPTZ,
    aprobado_por UUID REFERENCES public.profiles(id),
    rechazado_at TIMESTAMPTZ,
    rechazado_por UUID REFERENCES public.profiles(id),
    razon_rechazo TEXT,

    -- Correlativo (asignado en servidor al transicionar a ENVIADO)
    numero_correlativo INTEGER,
    codigo_informe TEXT,                      -- Ej: "INF-3298-2026-000123"
    correlativo_asignado_at TIMESTAMPTZ,

    -- Sync móvil (outbox pattern)
    uuid_local UUID UNIQUE,                   -- UUID generado en el dispositivo (idempotencia)
    dispositivo_id TEXT,
    app_version TEXT,
    sincronizado_at TIMESTAMPTZ,

    -- PDF generado
    pdf_url TEXT,
    pdf_generado_at TIMESTAMPTZ,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    bubble_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_formatos_informes_tenant_estado
    ON public.formatos_informes (tenant_id, estado) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_formatos_informes_cliente ON public.formatos_informes (cliente_id);
CREATE INDEX IF NOT EXISTS idx_formatos_informes_version ON public.formatos_informes (version_id);
CREATE INDEX IF NOT EXISTS idx_formatos_informes_tarea ON public.formatos_informes (tarea_id);
CREATE INDEX IF NOT EXISTS idx_formatos_informes_created_at ON public.formatos_informes (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uk_formatos_informes_correlativo
    ON public.formatos_informes (codigo_informe) WHERE codigo_informe IS NOT NULL;

COMMENT ON TABLE public.formatos_informes IS
    'Instancia llenada de un formato. Reemplaza la tabla legacy `respuestas`.';

-- ─────────────────────────────────────────────────────────────
-- 6) formatos_informes_respuestas — 1:N con formatos_informes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_informes_respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    informe_id UUID NOT NULL REFERENCES public.formatos_informes(id) ON DELETE CASCADE,
    pregunta_id UUID NOT NULL REFERENCES public.formatos_preguntas(id),

    -- Sólo uno se llena según el tipo de pregunta
    opcion_id UUID REFERENCES public.formatos_opciones(id),      -- SELECCION_UNICA
    opciones_ids UUID[],                                          -- SELECCION_MULTIPLE
    valor_texto TEXT,
    valor_numero NUMERIC,
    valor_fecha DATE,
    valor_booleano BOOLEAN,
    valor_foto_url TEXT,

    nota TEXT,                                                    -- Nota por pregunta

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT formatos_informes_respuestas_unique UNIQUE (informe_id, pregunta_id)
);

CREATE INDEX IF NOT EXISTS idx_formatos_informes_respuestas_informe
    ON public.formatos_informes_respuestas (informe_id);

-- ─────────────────────────────────────────────────────────────
-- 7) formatos_informes_maquinarias — N:M
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_informes_maquinarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    informe_id UUID NOT NULL REFERENCES public.formatos_informes(id) ON DELETE CASCADE,
    maquinaria_id UUID NOT NULL REFERENCES public.maquinarias(id),
    maquinaria_snapshot JSONB NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT formatos_informes_maquinarias_unique UNIQUE (informe_id, maquinaria_id)
);

CREATE INDEX IF NOT EXISTS idx_formatos_informes_maq
    ON public.formatos_informes_maquinarias (informe_id);

-- ─────────────────────────────────────────────────────────────
-- 8) formatos_informes_personal — N:M (propio O externo)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_informes_personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    informe_id UUID NOT NULL REFERENCES public.formatos_informes(id) ON DELETE CASCADE,

    -- Exactamente una de las dos FKs se llena
    profile_id UUID REFERENCES public.profiles(id),
    terceros_personal_id UUID REFERENCES public.terceros_personal(id),

    tipo_personal TEXT NOT NULL CHECK (tipo_personal IN ('PROPIO', 'PROVEEDOR')),
    personal_snapshot JSONB NOT NULL,
    rol_en_trabajo TEXT,                      -- 'OPERADOR', 'RIGGER', 'SUPERVISOR'...
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT formatos_informes_personal_one_fk CHECK (
        (profile_id IS NOT NULL AND terceros_personal_id IS NULL)
     OR (profile_id IS NULL AND terceros_personal_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS formatos_informes_personal_unique_profile
    ON public.formatos_informes_personal (informe_id, profile_id)
    WHERE profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS formatos_informes_personal_unique_externo
    ON public.formatos_informes_personal (informe_id, terceros_personal_id)
    WHERE terceros_personal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formatos_informes_personal
    ON public.formatos_informes_personal (informe_id);

-- ─────────────────────────────────────────────────────────────
-- 9) formatos_informes_comentarios
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_informes_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    informe_id UUID NOT NULL REFERENCES public.formatos_informes(id) ON DELETE CASCADE,

    autor_profile_id UUID REFERENCES public.profiles(id),
    autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('INTERNO', 'CLIENTE')),
    texto TEXT NOT NULL,
    pregunta_id UUID REFERENCES public.formatos_preguntas(id),     -- opcional

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formatos_comentarios_informe
    ON public.formatos_informes_comentarios (informe_id)
    WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────
-- 10) formatos_correlativos — secuencial por tenant + formato + año
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formatos_correlativos (
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    formato_codigo TEXT NOT NULL,
    anio INTEGER NOT NULL,
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, formato_codigo, anio)
);

-- ─────────────────────────────────────────────────────────────
-- 11) TRIGGERS — inmutabilidad de versión PUBLICADA
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.formatos_prevent_published_edit()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn_prevent_edit$
BEGIN
    IF OLD.estado = 'PUBLICADA' THEN
        -- Sólo permitimos cambiar min_app_version y estado → ARCHIVADA
        IF OLD.muestra_bloque_empresa IS DISTINCT FROM NEW.muestra_bloque_empresa
        OR OLD.muestra_bloque_cliente IS DISTINCT FROM NEW.muestra_bloque_cliente
        OR OLD.muestra_bloque_cotizacion IS DISTINCT FROM NEW.muestra_bloque_cotizacion
        OR OLD.muestra_bloque_tarea IS DISTINCT FROM NEW.muestra_bloque_tarea
        OR OLD.muestra_bloque_observaciones IS DISTINCT FROM NEW.muestra_bloque_observaciones
        OR OLD.muestra_bloque_firma IS DISTINCT FROM NEW.muestra_bloque_firma
        OR OLD.requisito_maquinaria IS DISTINCT FROM NEW.requisito_maquinaria
        OR OLD.requisito_personal IS DISTINCT FROM NEW.requisito_personal THEN
            RAISE EXCEPTION 'Versión publicada no editable. Clone a una nueva versión.';
        END IF;
    END IF;
    RETURN NEW;
END
$fn_prevent_edit$;

DROP TRIGGER IF EXISTS trg_formatos_prevent_edit_published ON public.formatos_versiones;
CREATE TRIGGER trg_formatos_prevent_edit_published
    BEFORE UPDATE ON public.formatos_versiones
    FOR EACH ROW EXECUTE FUNCTION public.formatos_prevent_published_edit();

-- Bloquear cambios en preguntas de versiones publicadas
CREATE OR REPLACE FUNCTION public.formatos_prevent_question_edit_if_published()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn_question_lock$
DECLARE
    _estado_version TEXT;
    _version_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        _version_id := OLD.version_id;
    ELSE
        _version_id := NEW.version_id;
    END IF;

    -- Asignación con := y subselect (evita SELECT INTO que el Studio parsea mal)
    _estado_version := (
        SELECT estado FROM public.formatos_versiones WHERE id = _version_id
    );

    IF _estado_version = 'PUBLICADA' THEN
        RAISE EXCEPTION 'No se pueden modificar preguntas de una versión publicada.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END
$fn_question_lock$;

DROP TRIGGER IF EXISTS trg_formatos_preguntas_lock ON public.formatos_preguntas;
CREATE TRIGGER trg_formatos_preguntas_lock
    BEFORE INSERT OR UPDATE OR DELETE ON public.formatos_preguntas
    FOR EACH ROW EXECUTE FUNCTION public.formatos_prevent_question_edit_if_published();

-- ─────────────────────────────────────────────────────────────
-- 12) FUNCIÓN ATÓMICA — asignar correlativo
--     Formato: INF-{codigo_formato}-{anio}-{6_digits}
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.asignar_correlativo_formato_informe(p_informe_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_correlativo$
DECLARE
    _tenant_id UUID;
    _formato_codigo TEXT;
    _anio INT;
    _numero INT;
    _codigo TEXT;
    _correlativo_actual INT;
    _codigo_actual TEXT;
BEGIN
    -- Lock de la fila (sin leer — sólo bloquear contra concurrentes)
    PERFORM 1
    FROM public.formatos_informes
    WHERE id = p_informe_id
    FOR UPDATE;

    -- Lectura vía asignación con := (evita SELECT INTO que el Studio parsea mal)
    _tenant_id := (
        SELECT fi.tenant_id
        FROM public.formatos_informes fi
        WHERE fi.id = p_informe_id
    );

    IF _tenant_id IS NULL THEN
        RAISE EXCEPTION 'Informe de formato no encontrado: %', p_informe_id;
    END IF;

    _formato_codigo := (
        SELECT f.codigo
        FROM public.formatos_informes fi
        JOIN public.formatos_versiones fv ON fv.id = fi.version_id
        JOIN public.formatos f ON f.id = fv.formato_id
        WHERE fi.id = p_informe_id
    );

    _anio := (
        SELECT EXTRACT(YEAR FROM COALESCE(fi.enviado_at, NOW()))::INT
        FROM public.formatos_informes fi
        WHERE fi.id = p_informe_id
    );

    _correlativo_actual := (
        SELECT fi.numero_correlativo
        FROM public.formatos_informes fi
        WHERE fi.id = p_informe_id
    );

    _codigo_actual := (
        SELECT fi.codigo_informe
        FROM public.formatos_informes fi
        WHERE fi.id = p_informe_id
    );

    -- Idempotencia: si ya tiene correlativo, devuelve el existente
    IF _correlativo_actual IS NOT NULL THEN
        RETURN _codigo_actual;
    END IF;

    -- UPSERT atómico del siguiente número (sin RETURNING INTO)
    INSERT INTO public.formatos_correlativos (tenant_id, formato_codigo, anio, ultimo_numero)
    VALUES (_tenant_id, _formato_codigo, _anio, 1)
    ON CONFLICT (tenant_id, formato_codigo, anio)
    DO UPDATE SET
        ultimo_numero = public.formatos_correlativos.ultimo_numero + 1,
        updated_at = NOW();

    _numero := (
        SELECT ultimo_numero
        FROM public.formatos_correlativos
        WHERE tenant_id = _tenant_id
          AND formato_codigo = _formato_codigo
          AND anio = _anio
    );

    -- Construir código
    _codigo := 'INF-' || _formato_codigo || '-' || _anio || '-' || LPAD(_numero::TEXT, 6, '0');

    -- Escribir en informe
    UPDATE public.formatos_informes
    SET numero_correlativo = _numero,
        codigo_informe = _codigo,
        correlativo_asignado_at = NOW()
    WHERE id = p_informe_id;

    RETURN _codigo;
END
$fn_correlativo$;

-- Trigger que asigna correlativo al transicionar BORRADOR → ENVIADO
CREATE OR REPLACE FUNCTION public.formatos_trg_llamar_asignacion_correlativo()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn_trg_corr$
BEGIN
    PERFORM public.asignar_correlativo_formato_informe(NEW.id);
    RETURN NULL;
END
$fn_trg_corr$;

DROP TRIGGER IF EXISTS trg_formatos_informes_after_enviado ON public.formatos_informes;
CREATE TRIGGER trg_formatos_informes_after_enviado
    AFTER UPDATE ON public.formatos_informes
    FOR EACH ROW
    WHEN (NEW.estado = 'ENVIADO' AND (OLD.estado IS NULL OR OLD.estado = 'BORRADOR'))
    EXECUTE FUNCTION public.formatos_trg_llamar_asignacion_correlativo();

-- ─────────────────────────────────────────────────────────────
-- 13) RLS — tenant isolation en todas las tablas nuevas
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.formatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_opciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_informes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_informes_respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_informes_maquinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_informes_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_informes_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatos_correlativos ENABLE ROW LEVEL SECURITY;

DO $do_rls$
DECLARE
    _tabla TEXT;
BEGIN
    FOR _tabla IN
        SELECT unnest(ARRAY[
            'formatos',
            'formatos_versiones',
            'formatos_preguntas',
            'formatos_opciones',
            'formatos_informes',
            'formatos_informes_respuestas',
            'formatos_informes_maquinarias',
            'formatos_informes_personal',
            'formatos_informes_comentarios',
            'formatos_correlativos'
        ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = _tabla AND policyname = 'tenant_isolation_select'
        ) THEN
            EXECUTE format(
                'CREATE POLICY tenant_isolation_select ON public.%I '
                || 'FOR SELECT TO authenticated '
                || 'USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))',
                _tabla
            );
        END IF;
    END LOOP;
END
$do_rls$;

COMMIT;
