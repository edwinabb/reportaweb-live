# Scripts SQL — REPORTA (Supabase / PostgreSQL)

Migraciones para soportar la app móvil y nuevas funcionalidades. Ejecutar en orden en Supabase SQL Editor.

**Notas de schema real (verificado 2026-05-03):**
- `config_informe_maquinaria` ya existe con columnas `incluye_*` (no `mostrar_*`)
- `config_informe_personal` ya existe con `codigo_formato`, `version_formato`, `fecha_formato`
- `planes_accion.inspeccion_id` ya existe; solo falta `origen`
- `app_calendario_festivos` usa `pais_id UUID FK → paises.id` (no `pais_codigo TEXT`)
- `companies.ubicacion_pais` apunta al mismo `paises.id` — JOIN por UUID

---

## M-001 — reportes_personal: campos nuevos

```sql
ALTER TABLE reportes_personal
  ADD COLUMN IF NOT EXISTS es_domingo_o_festivo         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_descanso_compensatorio BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_descanso_compensatorio DATE,
  ADD COLUMN IF NOT EXISTS es_descanso_por_domingo      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS domingo_al_que_corresponde   DATE,
  ADD COLUMN IF NOT EXISTS pdf_url                      TEXT;
```

---

## M-002 — reportes_maquinaria: campos nuevos

```sql
ALTER TABLE reportes_maquinaria
  ADD COLUMN IF NOT EXISTS rigger1_id               UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rigger2_id               UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS tipo_recorrido           TEXT CHECK (tipo_recorrido IN ('IDA','IDA_VUELTA','VUELTA','NA')),
  ADD COLUMN IF NOT EXISTS horas_recorrido          NUMERIC,
  ADD COLUMN IF NOT EXISTS total_horas              NUMERIC,
  ADD COLUMN IF NOT EXISTS guia_transporte          TEXT,
  ADD COLUMN IF NOT EXISTS foto_actividad_url       TEXT,
  ADD COLUMN IF NOT EXISTS firma_cliente_url        TEXT,
  ADD COLUMN IF NOT EXISTS cliente_nombre           TEXT,
  ADD COLUMN IF NOT EXISTS cliente_cargo            TEXT,
  ADD COLUMN IF NOT EXISTS foto_reporte_escrito_url TEXT,
  ADD COLUMN IF NOT EXISTS fotos_adicionales        JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS version_formato          TEXT DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS pdf_url                  TEXT;

-- Marcar registros pre-cutover como v1 (todos los actuales son migrados de Bubble)
UPDATE reportes_maquinaria
SET version_formato = 'v1'
WHERE (version_formato IS NULL OR version_formato = 'v2')
  AND created_at < '2026-05-07 00:00:00+00';
```

---

## M-003 — inspecciones: campos nuevos

```sql
ALTER TABLE inspecciones
  ADD COLUMN IF NOT EXISTS horometro_inicio          NUMERIC,
  ADD COLUMN IF NOT EXISTS km_inicio                 NUMERIC,
  ADD COLUMN IF NOT EXISTS foto_horometro_inicio_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_odometro_inicio_url  TEXT,
  ADD COLUMN IF NOT EXISTS horometro_final           NUMERIC,
  ADD COLUMN IF NOT EXISTS km_final                  NUMERIC,
  ADD COLUMN IF NOT EXISTS foto_horometro_final_url  TEXT,
  ADD COLUMN IF NOT EXISTS foto_odometro_final_url   TEXT,
  ADD COLUMN IF NOT EXISTS observaciones             TEXT,
  ADD COLUMN IF NOT EXISTS version_formato           TEXT DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS pdf_url                   TEXT;

-- Marcar registros pre-cutover como v1
UPDATE inspecciones
SET version_formato = 'v1'
WHERE (version_formato IS NULL OR version_formato = 'v2')
  AND created_at < '2026-05-07 00:00:00+00';
```

---

## M-004 — sst_epp_entrega: campos nuevos

```sql
ALTER TABLE sst_epp_entrega
  ADD COLUMN IF NOT EXISTS confirmado_via_app      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_confirmacion_app  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estado_confirmacion     TEXT DEFAULT 'PENDIENTE'
    CHECK (estado_confirmacion IN ('PENDIENTE','PARCIAL','COMPLETO'));
```

---

## M-005 — sst_epp_item: campos nuevos

```sql
ALTER TABLE sst_epp_item
  ADD COLUMN IF NOT EXISTS estado_item             TEXT DEFAULT 'PENDIENTE_CONFIRMACION'
    CHECK (estado_item IN ('PENDIENTE_CONFIRMACION','CONFIRMADO','OBSERVADO','RESUELTO','ANULADO')),
  ADD COLUMN IF NOT EXISTS motivo_observacion      TEXT
    CHECK (motivo_observacion IN ('No lo recibí','Llegó con daños','Cantidad incorrecta','Otro')),
  ADD COLUMN IF NOT EXISTS nota_operario           TEXT,
  ADD COLUMN IF NOT EXISTS respuesta_admin         TEXT,
  ADD COLUMN IF NOT EXISTS decision_admin          TEXT
    CHECK (decision_admin IN ('REENVIAR','ANULAR','RESOLVER_OFFLINE')),
  ADD COLUMN IF NOT EXISTS admin_que_respondio_id  UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS fecha_confirmacion_item TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_decision_admin    TIMESTAMPTZ;

-- Marcar ítems existentes (pre-cutover) como CONFIRMADO
UPDATE sst_epp_item
SET estado_item = 'CONFIRMADO'
WHERE (estado_item = 'PENDIENTE_CONFIRMACION' OR estado_item IS NULL)
  AND created_at < '2026-05-07 00:00:00+00';

-- Marcar entregas existentes como COMPLETO
UPDATE sst_epp_entrega
SET estado_confirmacion = 'COMPLETO'
WHERE (estado_confirmacion = 'PENDIENTE' OR estado_confirmacion IS NULL)
  AND created_at < '2026-05-07 00:00:00+00';
```

---

## M-006 — config_informe_personal: seed valores (no ALTER)

Las columnas `codigo_formato`, `version_formato`, `fecha_formato` YA EXISTEN.
Solo actualizar los valores seed si están vacíos.

```sql
UPDATE config_informe_personal
SET
  codigo_formato  = COALESCE(NULLIF(codigo_formato, ''), 'CISE-02'),
  version_formato = COALESCE(NULLIF(version_formato, ''), 'V.03'),
  fecha_formato   = COALESCE(NULLIF(fecha_formato, ''), 'Feb-2022')
WHERE tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b'; -- CISE

UPDATE config_informe_personal
SET
  codigo_formato  = COALESCE(NULLIF(codigo_formato, ''), 'INF-PERS'),
  version_formato = COALESCE(NULLIF(version_formato, ''), 'V.01'),
  fecha_formato   = COALESCE(NULLIF(fecha_formato, ''), 'Ene-2026')
WHERE tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73'; -- GRUAS
```

---

## M-007 — config_informe_maquinaria: agregar columnas nuevas

La tabla YA EXISTE. Solo se agregan las columnas que no existen.
Columnas existentes conservadas: `incluye_firma_cliente`, `incluye_foto_reporte_escrito`, `incluye_foto_trabajo`.

```sql
ALTER TABLE config_informe_maquinaria
  ADD COLUMN IF NOT EXISTS incluye_guia_transporte    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS incluye_fotos_adicionales  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS etiquetas_fotos_adicionales JSONB DEFAULT '[]';

-- Seed valor CISE (todas las secciones ON)
UPDATE config_informe_maquinaria
SET
  incluye_guia_transporte   = true,
  incluye_fotos_adicionales = false
WHERE tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b'; -- CISE

-- Seed valor GRUAS
UPDATE config_informe_maquinaria
SET
  incluye_guia_transporte   = true,
  incluye_fotos_adicionales = false
WHERE tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73'; -- GRUAS
```

---

## M-008 — config_checklist: tabla nueva

```sql
CREATE TABLE IF NOT EXISTS config_checklist (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID NOT NULL REFERENCES companies(id),
  mostrar_empresa            BOOLEAN DEFAULT true,
  mostrar_cliente            BOOLEAN DEFAULT true,
  mostrar_tarea              BOOLEAN DEFAULT true,
  mostrar_medidores          BOOLEAN DEFAULT false,
  mostrar_observaciones      BOOLEAN DEFAULT true,
  texto_declaracion          TEXT,
  label_footer               TEXT DEFAULT 'Registrado por',
  planes_accion_notificar_a  UUID[] DEFAULT '{}',
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT config_checklist_tenant_unique UNIQUE (tenant_id)
);

ALTER TABLE config_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant lee config checklist"
  ON config_checklist FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "admin edita config checklist"
  ON config_checklist FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin_tenant','reporta_admin')
  );

-- Seed CISE: medidores ON, sin observaciones, sin declaración
INSERT INTO config_checklist
  (tenant_id, mostrar_medidores, mostrar_observaciones, texto_declaracion, label_footer)
VALUES
  ('1cb97ec7-326c-4376-93ee-ed317d3da51b', true, false, null, 'Registrado por')
ON CONFLICT (tenant_id) DO NOTHING;

-- Seed GRUAS: medidores OFF, observaciones ON, con declaración
INSERT INTO config_checklist
  (tenant_id, mostrar_medidores, mostrar_observaciones, texto_declaracion, label_footer)
VALUES
  ('6f4c923a-c3b7-47c2-9dea-2a187f274f73', false, true,
   'Realicé la inspección diaria de la grúa antes de iniciar su operación',
   'Realizada por')
ON CONFLICT (tenant_id) DO NOTHING;
```

---

## M-009 — app_asistencias: tabla nueva

```sql
CREATE TABLE IF NOT EXISTS app_asistencias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  tarea_id            UUID REFERENCES tareas(id),
  personal_id         UUID REFERENCES profiles(id),
  tercero_personal_id UUID,
  tipo                TEXT NOT NULL
    CHECK (tipo IN ('LLEGADA','SALIDA','INICIO_JORNADA','FIN_JORNADA')),
  fecha_hora          TIMESTAMPTZ NOT NULL,
  fotos_urls          TEXT[],
  ubicacion_gps       JSONB,
  notas               TEXT,
  uuid_local          UUID UNIQUE,
  dispositivo_id      TEXT,
  sincronizado_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_asistencias_tenant_fecha
  ON app_asistencias (tenant_id, fecha_hora DESC);

CREATE INDEX IF NOT EXISTS idx_app_asistencias_personal
  ON app_asistencias (personal_id, fecha_hora DESC);

ALTER TABLE app_asistencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operario ve sus asistencias"
  ON app_asistencias FOR SELECT
  USING (personal_id = auth.uid());

CREATE POLICY "operario inserta asistencias"
  ON app_asistencias FOR INSERT
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "admin ve asistencias del tenant"
  ON app_asistencias FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin_tenant','supervisor','reporta_admin')
  );
```

---

## M-010 — app_paradas: tabla nueva

```sql
CREATE TABLE IF NOT EXISTS app_paradas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  tarea_id          UUID REFERENCES tareas(id),
  maquinaria_id     UUID REFERENCES maquinarias(id),
  personal_id       UUID REFERENCES profiles(id),
  fecha_hora_inicio TIMESTAMPTZ NOT NULL,
  fecha_hora_fin    TIMESTAMPTZ,
  duracion_minutos  INTEGER,
  motivo_categoria  TEXT
    CHECK (motivo_categoria IN ('MECANICA','ELECTRICA','OPERATIVA','CLIMA','ESPERA','OTRO')),
  descripcion       TEXT,
  fotos_urls        TEXT[],
  ubicacion_gps     JSONB,
  uuid_local        UUID UNIQUE,
  sincronizado_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_paradas_tenant
  ON app_paradas (tenant_id, fecha_hora_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_app_paradas_maquinaria
  ON app_paradas (maquinaria_id, fecha_hora_inicio DESC);

ALTER TABLE app_paradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operario gestiona sus paradas"
  ON app_paradas FOR ALL
  USING (personal_id = auth.uid());

CREATE POLICY "admin ve paradas del tenant"
  ON app_paradas FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin_tenant','supervisor','reporta_admin')
  );
```

---

## M-011 — app_combustible: tabla nueva

```sql
CREATE TABLE IF NOT EXISTS app_combustible (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL,
  tarea_id                 UUID REFERENCES tareas(id),
  maquinaria_id            UUID REFERENCES maquinarias(id),
  personal_id              UUID REFERENCES profiles(id),
  fecha_hora               TIMESTAMPTZ NOT NULL,
  tipo_combustible         TEXT CHECK (tipo_combustible IN ('DIESEL','GASOLINA','GLP')),
  cantidad_galones         NUMERIC,
  horometro_actual         NUMERIC,
  nombre_grifo             TEXT,
  foto_medidor_antes_url   TEXT,
  foto_horometro_url       TEXT,
  foto_medidor_despues_url TEXT,
  foto_voucher_url         TEXT,
  ubicacion_gps            JSONB,
  uuid_local               UUID UNIQUE,
  sincronizado_at          TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_combustible_tenant
  ON app_combustible (tenant_id, fecha_hora DESC);

CREATE INDEX IF NOT EXISTS idx_app_combustible_maquinaria
  ON app_combustible (maquinaria_id, fecha_hora DESC);

ALTER TABLE app_combustible ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operario gestiona su combustible"
  ON app_combustible FOR ALL
  USING (personal_id = auth.uid());

CREATE POLICY "admin ve combustible del tenant"
  ON app_combustible FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin_tenant','supervisor','reporta_admin')
  );
```

---

## M-012 — app_kpi_snapshots: tabla nueva

```sql
CREATE TABLE IF NOT EXISTS app_kpi_snapshots (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID NOT NULL,
  personal_id                UUID REFERENCES profiles(id),
  periodo_mes                INTEGER NOT NULL,
  periodo_anio               INTEGER NOT NULL,
  horas_reportadas           NUMERIC DEFAULT 0,
  horas_extras               NUMERIC DEFAULT 0,
  horas_dominicales          NUMERIC DEFAULT 0,
  puntaje_puntualidad        NUMERIC,
  paradas_count              INTEGER DEFAULT 0,
  paradas_minutos            INTEGER DEFAULT 0,
  galones_totales            NUMERIC DEFAULT 0,
  informes_personal_count    INTEGER DEFAULT 0,
  informes_maquinaria_count  INTEGER DEFAULT 0,
  checklists_count           INTEGER DEFAULT 0,
  puntaje_checklist_promedio NUMERIC,
  gasto_desayuno_total       NUMERIC DEFAULT 0,
  gasto_almuerzo_total       NUMERIC DEFAULT 0,
  gasto_cena_total           NUMERIC DEFAULT 0,
  gasto_movilidad_total      NUMERIC DEFAULT 0,
  gasto_viaticos_total       NUMERIC DEFAULT 0,
  computed_at                TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT app_kpi_snapshots_unique
    UNIQUE (tenant_id, personal_id, periodo_mes, periodo_anio)
);

ALTER TABLE app_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operario ve sus KPIs"
  ON app_kpi_snapshots FOR SELECT
  USING (personal_id = auth.uid());

CREATE POLICY "admin ve KPIs del tenant"
  ON app_kpi_snapshots FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin_tenant','reporta_admin')
  );
```

---

## M-013 — planes_accion: agregar campo origen

`inspeccion_id` YA EXISTE. Solo se agrega `origen`.

```sql
ALTER TABLE planes_accion
  ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'MANUAL'
    CHECK (origen IN ('MANUAL','CHECKLIST'));

CREATE INDEX IF NOT EXISTS idx_planes_accion_inspeccion
  ON planes_accion (inspeccion_id)
  WHERE inspeccion_id IS NOT NULL;
```

---

## M-014 — Buckets Storage nuevos

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('informes-personal', 'informes-personal', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('informes-maquinaria', 'informes-maquinaria', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('app-evidencias', 'app-evidencias', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tenant lee informes personal"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'informes-personal'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "operario sube informes personal"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'informes-personal');

CREATE POLICY "tenant lee informes maquinaria"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'informes-maquinaria'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "operario sube informes maquinaria"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'informes-maquinaria');

CREATE POLICY "tenant gestiona app evidencias"
  ON storage.objects FOR ALL
  USING (bucket_id = 'app-evidencias');
```

---

## M-015 — companies: campo notificaciones EPP

```sql
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS epp_notificar_observaciones_a UUID[] DEFAULT '{}';
```

---

## Orden de ejecución

| # | Migración | Notas |
|---|-----------|-------|
| M-001 | reportes_personal | ALTER — nuevas columnas |
| M-002 | reportes_maquinaria | ALTER — nuevas columnas + mark v1 |
| M-003 | inspecciones | ALTER — nuevas columnas + mark v1 |
| M-004 | sst_epp_entrega | ALTER — estado_confirmacion |
| M-005 | sst_epp_item | ALTER — estado_item + decisiones admin |
| M-006 | config_informe_personal | SOLO UPDATE seed (columnas ya existen) |
| M-007 | config_informe_maquinaria | ALTER — agregar 3 columnas nuevas |
| M-008 | config_checklist | CREATE TABLE nueva |
| M-009 | app_asistencias | CREATE TABLE nueva |
| M-010 | app_paradas | CREATE TABLE nueva |
| M-011 | app_combustible | CREATE TABLE nueva |
| M-012 | app_kpi_snapshots | CREATE TABLE nueva |
| M-013 | planes_accion | ALTER — solo origen (inspeccion_id ya existe) |
| M-014 | Storage buckets | INSERT buckets + policies |

---

## Verificación post-migración

```sql
-- Columnas nuevas en reportes_personal
SELECT column_name FROM information_schema.columns
WHERE table_name = 'reportes_personal'
  AND column_name IN ('es_domingo_o_festivo','tiene_descanso_compensatorio','pdf_url');

-- Columnas nuevas en config_informe_maquinaria
SELECT column_name FROM information_schema.columns
WHERE table_name = 'config_informe_maquinaria'
  AND column_name IN ('incluye_guia_transporte','incluye_fotos_adicionales','etiquetas_fotos_adicionales');

-- Tablas nuevas creadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'config_checklist','app_asistencias','app_paradas',
    'app_combustible','app_kpi_snapshots'
  );

-- Seeds config_checklist
SELECT tenant_id, mostrar_medidores, mostrar_observaciones, label_footer
FROM config_checklist;

-- Seeds config_informe_personal
SELECT tenant_id, codigo_formato, version_formato, fecha_formato
FROM config_informe_personal;

-- Buckets creados
SELECT id, name FROM storage.buckets
WHERE id IN ('informes-personal','informes-maquinaria','app-evidencias');
```
