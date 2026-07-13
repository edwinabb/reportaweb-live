# Plan de Implementación — REPORTA Web (reportaweb3)

Cambios requeridos en el proyecto Next.js para soportar la app móvil y las nuevas funcionalidades de informes, checklist, EPP y planificación.

---

## 1. Principio de Paridad App ↔ Web

Los informes Personal y Maquinaria son los mismos en app y web. Todo cambio de schema, lógica de cálculo y generación de PDF que se diseñe para la app debe implementarse también en la web. La base de datos Supabase es compartida.

Implica:
- Campos nuevos en `reportes_personal`, `reportes_maquinaria`, `inspecciones` → migración SQL única que ambos lados usan
- Lógica de autocalculado de horas → función `lib/utils/calcular-horas.ts` compartida (misma lógica copiada en la app)
- Generación PDF → Gotenberg en web, expo-print en app, misma plantilla HTML
- Configuración de encabezado PDF por tenant → campos en `config_informe_personal` y `config_informe_maquinaria`

---

## 2. Schema — Nuevos campos y tablas

### 2.1 `reportes_personal` — campos nuevos
```
es_domingo_o_festivo          BOOLEAN
tiene_descanso_compensatorio  BOOLEAN
fecha_descanso_compensatorio  DATE
es_descanso_por_domingo       BOOLEAN
domingo_al_que_corresponde    DATE
pdf_url                       TEXT
```

### 2.2 `reportes_maquinaria` — campos nuevos / eliminados
```
-- ELIMINAR (ya no aplica):
tipo_uso

-- AGREGAR:
rigger1_id               UUID REFERENCES profiles(id)
rigger2_id               UUID REFERENCES profiles(id)
tipo_recorrido           TEXT   -- IDA | IDA_VUELTA | VUELTA | NA
horas_recorrido          NUMERIC
total_horas              NUMERIC
guia_transporte          TEXT
foto_actividad_url       TEXT
firma_cliente_url        TEXT
cliente_nombre           TEXT
cliente_cargo            TEXT
foto_reporte_escrito_url TEXT
fotos_adicionales        JSONB  -- [{ subtitulo, url }]
version_formato          TEXT   -- 'v1' Bubble | 'v2' nuevo
pdf_url                  TEXT
```

### 2.3 `inspecciones` — campos nuevos
```
horometro_inicio          NUMERIC
km_inicio                 NUMERIC
foto_horometro_inicio_url TEXT
foto_odometro_inicio_url  TEXT
horometro_final           NUMERIC
km_final                  NUMERIC
foto_horometro_final_url  TEXT
foto_odometro_final_url   TEXT
observaciones             TEXT
version_formato           TEXT   -- 'v1' | 'v2'
pdf_url                   TEXT
```

### 2.4 `sst_epp_entrega` — campos nuevos
```
confirmado_via_app      BOOLEAN DEFAULT false
fecha_confirmacion_app  TIMESTAMPTZ
estado_confirmacion     TEXT DEFAULT 'PENDIENTE'
  -- PENDIENTE | PARCIAL | COMPLETO
```

### 2.5 `sst_epp_item` — campos nuevos
```
estado_item                TEXT DEFAULT 'PENDIENTE_CONFIRMACION'
  -- PENDIENTE_CONFIRMACION | CONFIRMADO | OBSERVADO | RESUELTO | ANULADO
motivo_observacion         TEXT
nota_operario              TEXT
respuesta_admin            TEXT
decision_admin             TEXT   -- REENVIAR | ANULAR | RESOLVER_OFFLINE
admin_que_respondio_id     UUID REFERENCES profiles(id)
fecha_confirmacion_item    TIMESTAMPTZ
fecha_decision_admin       TIMESTAMPTZ
```

### 2.6 Tablas nuevas

#### `config_informe_personal` — campos nuevos
```
codigo_formato_personal  TEXT   -- ej: 'CISE-02'
version_formato_personal TEXT   -- ej: 'V.03'
fecha_formato_personal   TEXT   -- ej: 'Feb-2022'
```
(Se agregan a la tabla existente, una fila por tenant)

#### `config_informe_maquinaria` — tabla nueva
```sql
CREATE TABLE config_informe_maquinaria (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID NOT NULL REFERENCES companies(id) UNIQUE,
  mostrar_guia_transporte    BOOLEAN DEFAULT true,
  mostrar_foto_actividad     BOOLEAN DEFAULT true,
  mostrar_firma_cliente      BOOLEAN DEFAULT true,
  mostrar_foto_reporte_escrito BOOLEAN DEFAULT true,
  mostrar_fotos_adicionales  BOOLEAN DEFAULT false,
  etiquetas_fotos_adicionales JSONB DEFAULT '[]',
  codigo_formato             TEXT,
  version_formato_doc        TEXT,
  fecha_formato_doc          TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);
```

#### `config_checklist` — tabla nueva
```sql
CREATE TABLE config_checklist (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                    UUID NOT NULL REFERENCES companies(id) UNIQUE,
  mostrar_empresa              BOOLEAN DEFAULT true,
  mostrar_cliente              BOOLEAN DEFAULT true,
  mostrar_tarea                BOOLEAN DEFAULT true,
  mostrar_medidores            BOOLEAN DEFAULT false,
  mostrar_observaciones        BOOLEAN DEFAULT true,
  texto_declaracion            TEXT,
  label_footer                 TEXT DEFAULT 'Registrado por',
  planes_accion_notificar_a    UUID[] DEFAULT '{}',
  created_at                   TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tablas nuevas para la app (Supabase)
```sql
-- Ver archivo scripts-sql.md para DDL completo de:
-- app_asistencias, app_paradas, app_combustible, app_kpi_snapshots
```

---

## 3. Informes Personal — Cambios web

### 3.1 Formulario web (`/informes/personal/nuevo` o form embebido)

- **Horas calculadas automáticamente** — los campos de horas normales/extras/extraordinarias/dominicales pasan a ser **solo lectura**. El sistema los calcula en tiempo real usando `lib/utils/calcular-horas.ts`.
- **Jornada 1 y 2 siempre visibles**; botón "Agregar jornada 3" para la tercera.
- **Selector de fecha** resalta días festivos con color ámbar (consulta `app_calendario_festivos` para el país del tenant via `companies.ubicacion_pais`).
- Si la fecha es domingo o festivo → banner de aviso + campo `tiene_descanso_compensatorio` + `fecha_descanso_compensatorio` (solo el admin puede editar estos campos; el operario los ve en modo lectura en la app).

### 3.2 Función `lib/utils/calcular-horas.ts`
```typescript
export function calcularHoras(params: {
  jornadas: { inicio: string; fin: string }[]
  esDomingoOFestivo: boolean
  tieneDescansoCompensatorio: boolean
}): {
  totalRaw: number
  horasNormales: number
  horasExtras: number
  horasExtrasExtraordinarias: number
  horasDominicales: number
}
```
Lógica:
```
total_raw = Σ (fin - inicio) de todas las jornadas en horas decimales
horas_normales               = min(total_raw, 8.0)
exceso                       = max(0, total_raw - 8.0)
horas_extras                 = min(exceso, 2.0)          → recargo 25%
horas_extras_extraordinarias = max(0, exceso - 2.0)      → recargo 35%
horas_dominicales            = total_raw  si esDomingoOFestivo = true
                                           Y tieneDescansoCompensatorio = false
                             = 0           en cualquier otro caso
```

### 3.3 PDF Informe Personal (Gotenberg)
Estructura HTML que replica el formato CISE-02 / V.03:
- Header: logo tenant + título "REPORTE DE PERSONAL" + código/versión/fecha (desde `config_informe_personal`)
- Sección registro + empresa/cliente/tarea
- Tabla de horas trabajadas (jornadas + totales)
- Tabla de gastos personales (desayuno/almuerzo/cena/movilidad/total)
- Descripción del trabajo
- Firma del trabajador (imagen canvas)
- Footer: registrado por + timestamp

PDF se sube a `informes-personal/{tenant_id}/{año}/{mes}/` en Storage; URL se graba en `reportes_personal.pdf_url`.

---

## 4. Informes Maquinaria — Cambios web

### 4.1 Formulario web
- **Quitar campo** `tipo_uso`
- **Agregar**: Operador/Chofer (obligatorio), Rigger 1 (opcional), Rigger 2 (opcional) — selectores desde `profiles` del tenant
- **Tipo de recorrido**: Ida / Ida y Vuelta / Vuelta / N/A — si N/A se oculta campo de horas recorrido
- **Total horas = suma jornadas + horas recorrido** (solo lectura, calculado en tiempo real)
- Secciones opcionales por tenant (config via `config_informe_maquinaria`):
  - Guía de transporte
  - Foto actividad
  - Aceptación cliente (firma canvas + nombre + cargo)
  - Foto reporte escrito (2048px min resolución)
  - Fotos adicionales con subtítulos configurables

### 4.2 Estrategia v1 → v2
- Registros Bubble migrados tienen `version_formato = 'v1'` — mostrar en modo lectura con layout legacy, no editar como v2
- Nuevos registros (web y app) → `version_formato = 'v2'`
- Función `renderPdfMaquinaria(reporte)` detecta `version_formato` y elige plantilla

### 4.3 PDF Informe Maquinaria (Gotenberg)
Mismo mecanismo que Personal. Header por tenant desde `config_informe_maquinaria`. Secciones incluidas/excluidas según config del tenant.

---

## 5. Checklist — Cambios web

### 5.1 Formulario web de inspecciones
- **Respuestas**: SI / NO / NO APLICA (3 opciones, siempre disponibles)
  - NO → campo de observación obligatorio
- **Puntaje calculado**: `count(SI) / (total - count(NO APLICA)) * 100` → guardado en `inspecciones.puntaje`
- Sección medidores (horómetro + km + fotos) visible solo si `config_checklist.mostrar_medidores = true`
- Sección observaciones visible solo si `config_checklist.mostrar_observaciones = true`
- Texto de declaración al pie si `config_checklist.texto_declaracion` no es null

### 5.2 Planes de acción automáticos desde checklist
Cuando el operario responde NO a un ítem:
- Se crea automáticamente un plan de acción en `planes_accion`:
  ```
  titulo       = "Resolver: [texto_pregunta]"
  origen       = 'CHECKLIST'
  inspeccion_id = FK a la inspección
  tarea_id     = tarea de la inspección
  maquinaria_id = maquinaria de la inspección
  estado       = 'ABIERTO'
  responsable_id = null (admin asigna)
  fecha_compromiso = null (admin configura)
  ```
- En la lista de planes de acción web: badge "Desde Checklist" para identificarlos
- Al asignar responsable → notificación Resend al responsable
- Destinatarios adicionales configurables en `config_checklist.planes_accion_notificar_a`

### 5.3 PDF Checklist (Gotenberg)
Header por tenant: logo + nombre formato + código (`INF-10610` para CISE, `INF-3097` para GRUAS) + versión + fecha. Tabla de ítems con SI/NO/NO APLICA. Secciones según config tenant.

---

## 6. EPP — Cambios web

### 6.1 Vista de detalle de entrega — gestión de observaciones

Cuando `sst_epp_entrega.estado_confirmacion = PARCIAL` (operario confirmó desde la app con observaciones):

- Nueva sección en el detalle de la entrega con tabla ítem × estado/gestión
- Por cada ítem con `estado_item = OBSERVADO`:
  - Muestra: motivo del operario + nota del operario
  - Admin puede escribir: respuesta al operario + decisión (REENVIAR / ANULAR / RESOLVER_OFFLINE)
  - Botón "Guardar decisión" por ítem

**Comportamiento al guardar decisión:**
- **REENVIAR**: crea nueva `sst_epp_entrega` con solo ese ítem; `estado_confirmacion = PENDIENTE`
- **ANULAR**: `estado_item = ANULADO`
- **RESOLVER_OFFLINE**: `estado_item = RESUELTO`

En los tres casos: guarda `respuesta_admin`, `decision_admin`, `admin_que_respondio_id`, `fecha_decision_admin`. Cuando todos los ítems tienen estado final → `estado_confirmacion = COMPLETO`.

### 6.2 Lista de entregas — badge de estado

Nueva columna en la tabla de entregas:
| Badge | Estado | Acción requerida |
|-------|--------|-----------------|
| ⏳ Pendiente | PENDIENTE | Ninguna — esperando al operario |
| ⚠ Parcial | PARCIAL | Admin debe responder observaciones |
| ✅ Completo | COMPLETO | Ninguna |

Las filas con estado PARCIAL se ordenan primero y se resaltan con fondo ámbar claro.

### 6.3 Notificación Resend al admin
Cuando el operario confirma desde la app con ítems OBSERVADOS → email al admin del tenant:
- Nombre del colaborador y fecha de entrega
- Lista de ítems observados con motivo y nota
- Link directo al detalle en la web

### 6.4 Configuración de destinatarios de notificación EPP
En `Settings → Notificaciones`:
```
EPP — Observaciones de operarios
Notificar a: [lista usuarios con checkbox]
```
Campo: `epp_notificar_observaciones_a: UUID[]` en tabla de config del tenant.

---

## 7. Planificación — Festivos

Consulta `app_calendario_festivos WHERE pais_codigo = companies.ubicacion_pais` al cargar el panel.

- **Vista Timeline (Personal y Maquinaria)**: columnas de días festivos con fondo ámbar + tooltip con `descripcion`
- **Vista Listado**: badge/ícono en columna fecha cuando la tarea cae en festivo
- **Form nueva tarea** (calendario multi-fecha): días festivos resaltados con color ámbar + descripción en hover

---

## 8. Settings — Configuración de informes por tenant

Nueva sección en `Settings → Formatos / Informes`:

### Personal
- Código formato (ej: `CISE-02`)
- Versión (ej: `V.03`)
- Fecha del formato (ej: `Feb-2022`)

### Maquinaria
- Código, versión, fecha del formato
- Toggles para secciones opcionales (Guía transporte, Foto actividad, Firma cliente, Foto reporte escrito, Fotos adicionales)
- Si Fotos adicionales ON → gestión de subtítulos

### Checklist
- Toggles: Empresa, Cliente, Tarea, Medidores, Observaciones
- Texto de declaración (textarea o vacío para desactivar)
- Label del footer
- Destinatarios de notificación planes de acción

---

## 9. Orden de implementación sugerido

1. SQL migrations (ver `docs/scripts-sql.md`)
2. `lib/utils/calcular-horas.ts` — función compartida ✅
3. Settings UI completo (Phase 10 abajo) — `config_informe_personal` + `config_informe_maquinaria` + `config_checklist` + notificaciones
4. Informe Personal web — horas auto-calculadas + festivos en selector fecha
5. PDF Informe Personal (Gotenberg)
6. Informe Maquinaria web — campos nuevos + secciones opcionales
7. PDF Informe Maquinaria (Gotenberg)
8. Checklist web — SI/NO/NO APLICA + puntaje + planes de acción automáticos
9. PDF Checklist (Gotenberg)
10. EPP web — detalle entrega con gestión observaciones + lista con estado
11. EPP web — notificación Resend + config destinatarios
12. Planificación — resaltar festivos en calendario y timeline

---

## 10. Settings — Configuración completa por tenant

Todas las opciones configurables de informes, checklist y notificaciones se gestionan en `/settings/informes` (expandido) y `/settings/notificaciones` (nuevo). Solo `admin_tenant` y `reporta_admin` pueden acceder.

### 10.1 Ruta `/settings/informes` — 3 tabs

**Tab 1: Reporte de Maquinaria** (`config_informe_maquinaria`)

```
ENCABEZADO DEL FORMATO
Código   [G.PAC-04      ]   Versión  [V.04  ]   Fecha  [Nov-2024]

CONFIGURACIÓN DE SECCIONES
Cantidad de turnos     [1 turno ▼]
Cantidad de riggers    [Ninguno ▼]

SECCIONES VISIBLES  (toggle ON/OFF por fila)
☑ Tipo de recorrido + horas de recorrido
☑ Guía de transporte
☑ Firma del representante del cliente
☑ Salida autorizada por
☑ Tonelaje y placa solicitado
☑ Foto de la actividad realizada
☑ Foto del reporte escrito físico
☐ Fotos adicionales con subtítulos
  └─ Si ON: lista editable de subtítulos
     [FMT                 ] [✕]
     [Guía de remisión    ] [✕]
     [+ Agregar subtítulo ]
```

Campos guardados: todos los `incluye_*` existentes + `incluye_guia_transporte` (nuevo) + `incluye_fotos_adicionales` (nuevo) + `etiquetas_fotos_adicionales` JSONB (nuevo).

---

**Tab 2: Reporte de Personal** (`config_informe_personal`)

```
ENCABEZADO DEL FORMATO
Código   [G.PAC-02      ]   Versión  [V.03  ]   Fecha  [Feb-2022]

JORNADAS
Cantidad de jornadas   [2 jornadas ▼]

COLUMNAS DE HORAS
☑ Horas extras (recargo 25%)
☑ Horas extras extraordinarias (recargo 35%)
☑ Horas dominicales

BLOQUES ADICIONALES
☑ Bloque de gastos personales (Desayuno / Almuerzo / Cena / Movilidad)
☑ Firma del trabajador
☑ Firma del cliente validando horas
☑ Foto del trabajo realizado
```

Campos guardados: todos los `incluye_*` + `codigo_formato` + `version_formato` + `fecha_formato` (columnas ya existentes).

---

**Tab 3: Checklist / Inspecciones** (`config_checklist`)

```
SECCIONES VISIBLES EN EL CHECKLIST
☑ Bloque empresa (nombre, RUC, domicilio)
☑ Bloque cliente (nombre, RUC, cotización)
☑ Bloque tarea (código, descripción, sitio)
☐ Sección medidores (horómetro + km + fotos antes/después)
☑ Sección observaciones (área de texto libre)

DECLARACIÓN AL PIE
Texto de declaración:
┌─────────────────────────────────────────────────────┐
│ Realicé la inspección diaria de la grúa antes de   │
│ iniciar su operación                                │
└─────────────────────────────────────────────────────┘
(vacío = no mostrar declaración)

Label del pie: [Realizada por          ]

PLANES DE ACCIÓN — NOTIFICACIONES
Notificar al crear plan desde checklist:
☑ Luis García    (admin_tenant)
☐ María Torres   (supervisor)
☐ Pedro Díaz     (supervisor)
(lista de todos los usuarios del tenant)
```

Campos guardados: `mostrar_empresa`, `mostrar_cliente`, `mostrar_tarea`, `mostrar_medidores`, `mostrar_observaciones`, `texto_declaracion`, `label_footer`, `planes_accion_notificar_a UUID[]`.

---

### 10.2 Ruta `/settings/notificaciones` — EPP y alertas

**Sección EPP — Observaciones**

```
EPP — OBSERVACIONES DE OPERARIOS
Cuando un operario confirma la recepción con ítems observados (Pantalla C de la app),
notificar a:
☑ Luis García    (admin_tenant)
☐ María Torres   (supervisor)
☑ Carlos López   (admin_tenant)
```

Campo: `epp_notificar_observaciones_a UUID[]` en tabla `companies` (columna nueva, M-015).

---

### 10.3 Migración adicional — M-015

```sql
-- Agregar campo de notificaciones EPP a companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS epp_notificar_observaciones_a UUID[] DEFAULT '{}';
```

No requiere seed (por defecto vacío; el admin configura los destinatarios en el primer uso).

---

### 10.4 Archivos a crear/modificar

| Archivo | Cambio |
|---------|--------|
| `lib/actions/informes-config.ts` | Agregar `ConfigChecklist` type + `getConfigChecklist()` + `updateConfigChecklist()` |
| `app/(dashboard)/settings/informes/informes-config-tabs.tsx` | 3er tab Checklist + nuevos toggles en Maquinaria (`incluye_guia_transporte`, `incluye_fotos_adicionales` + editor subtítulos) |
| `app/(dashboard)/settings/informes/page.tsx` | Fetch `config_checklist` en paralelo con los otros dos |
| `app/(dashboard)/settings/notificaciones/page.tsx` | Nuevo — config EPP notificaciones |
| `lib/actions/notificaciones-config.ts` | Nuevo — `getEppNotifConfig()` + `updateEppNotifConfig()` |
| `docs/scripts-sql.md` | Agregar M-015 |
