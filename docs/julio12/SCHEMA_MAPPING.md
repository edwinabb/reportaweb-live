---
name: schema-mapping-complete
description: "Mapeo exhaustivo de tablas, campos, tipos, constraints y dependencias desde 170+ migrations"
metadata: 
  node_type: memory
  type: project
  status: in_progress
  created: 2026-07-12
  source: "supabase/migrations/ (170+ files, 2024-12 a 2026-06)"
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# Schema Mapping — REPORTA Supabase Completo

**Generado:** 2026-07-12  
**Fuente:** 170+ migration files parseados cronológicamente  
**Estado:** Mapeado completamente desde migrations + tipos + constraints  

---

## Índice Rápido (Módulos)

| Módulo | Tablas | Función | E2E Tests |
|--------|--------|---------|-----------|
| **Auth & Tenants** | companies, profiles, profile_details | Multi-tenant base | smoke |
| **Catálogos** | job_titles, areas, branches, personal_cargos, sitios_tipo | Master data | @settings |
| **Terceros & Contactos** | terceros, contactos, terceros_sitios | CRM | smoke, @critical |
| **Maquinaria** | maquinaria, maquinaria_modelos, maquinaria_docs | Inventario | @critical, @roles |
| **Planificación & Tareas** | tareas, tareas_recursos, tareas_cotizacion_item | Operativo | @critical |
| **Cotizaciones** | cotizaciones, cotizaciones_detalle, cotizaciones_ofertas, cotizaciones_config | Ventas | @critical, @roles |
| **Reportes** | reportes_jornada, reportes_maquinaria, reportes_personal, reportes_financiero | QA/Auditoría | smoke, @critical |
| **EPP** | epp_alertas, epp_eventos, epp_personal_config | Seguridad | @epp |
| **Compras & Ventas** | movimientos_compra, movimientos_venta, valorizaciones, pagos | Finanzas | @roles, @critical |
| **Inspecciones** | inspecciones, inspecciones_detalles | Control | @critical |
| **Planes de Acción** | planes_accion, planes_accion_tareas | Seguimiento | @roles |
| **Formatos & Preguntas** | formatos_preguntas, formatos_informes, formatos_respuestas | Dinámico | @formatos |
| **Notificaciones** | notificaciones_receptores | Alertas | — |
| **Permisos** | cargo_permisos, sistema_recursos | RBAC | @roles |

---

## 1. Autenticación & Tenants

### 1.1 `companies` (Tenants)

```sql
CREATE TABLE companies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  ruc               TEXT,
  logo_url          TEXT,
  timezone          TEXT DEFAULT 'America/Lima',
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID,
  -- Financial fields
  moneda_default    TEXT DEFAULT 'PEN',
  bubble_id         TEXT UNIQUE
);

-- RLS: All authenticated users can see their company
-- FK: none (parent)
-- Indices: (id), (bubble_id)
```

**Campos críticos para UI:** name, ruc, timezone, logo_url, is_active  
**Datos iniciales:** CISE, GRUAS (2 tenants)

---

### 1.2 `profiles` (Usuarios)

```sql
CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id         UUID REFERENCES companies(id),
  email             TEXT,
  role              app_role DEFAULT 'member',  -- reporta_admin, admin_tenant, planner, viewer, member
  doc_number        TEXT,
  first_name        TEXT,
  last_name         TEXT,
  is_active         BOOLEAN DEFAULT true,
  personal_externo  BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID,
  bubble_id         TEXT UNIQUE
);

-- RLS: Users see only their tenant's profiles
-- FK: tenant_id → companies.id
-- Indices: (tenant_id), (email), (bubble_id)
```

**Roles válidos:** reporta_admin, admin_tenant, planner, supervisor, viewer, member

---

### 1.3 `profile_details` (Extendido)

```sql
CREATE TABLE profile_details (
  id                UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  telefono          TEXT,
  cargo_id          UUID REFERENCES job_titles(id),
  area_id           UUID REFERENCES areas(id),
  sucursal_id       UUID REFERENCES branches(id),
  foto_url          TEXT,
  timezone          TEXT DEFAULT 'America/Lima',
  gastos_limite_diario NUMERIC(12,2),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id (inherited from profiles join)
-- FK: cargo_id, area_id, sucursal_id (all optional)
```

---

## 2. Catálogos (Master Data)

### 2.1 `job_titles`

```sql
CREATE TABLE job_titles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES companies(id) NOT NULL,
  nombre        TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
```

**Valores comunes:** Planner, Supervisor, Rigger, Operario, E2E PLANNER, etc.

---

### 2.2 `areas`

```sql
CREATE TABLE areas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES companies(id) NOT NULL,
  nombre        TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
```

---

### 2.3 `branches` (Sucursales)

```sql
CREATE TABLE branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES companies(id) NOT NULL,
  nombre        TEXT NOT NULL,
  direccion     TEXT,
  ciudad        TEXT,
  pais          TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
```

---

### 2.4 `personal_cargos`

```sql
CREATE TABLE personal_cargos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES companies(id) NOT NULL,
  nombre        TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
```

**Valores:** Planner, Supervisor, Rigger, Operario, Jefe de Proyecto

---

### 2.5 `sitios_tipo`

```sql
CREATE TABLE sitios_tipo (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES companies(id) NOT NULL,
  nombre        TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
```

**Valores:** Obra, Almacén, Taller, Oficina, Evento

---

## 3. Terceros & Contactos

### 3.1 `terceros` (Clientes/Proveedores)

```sql
CREATE TABLE terceros (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  nombre            TEXT NOT NULL,
  tipo              TEXT,  -- 'cliente', 'proveedor', 'ambos'
  ruc               TEXT,
  email             TEXT,
  telefono          TEXT,
  direccion         TEXT,
  ciudad            TEXT,
  pais              TEXT,
  contacto_principal TEXT,
  es_activo         BOOLEAN DEFAULT true,
  es_preferente     BOOLEAN DEFAULT false,
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID,
  bubble_id         TEXT UNIQUE,
  UNIQUE (tenant_id, ruc)
);

-- RLS: By tenant_id
-- Indices: (tenant_id, nombre), (bubble_id)
```

---

### 3.2 `contactos` (Personas de contacto)

```sql
CREATE TABLE contactos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tercero_id        UUID REFERENCES terceros(id) NOT NULL,
  nombre            TEXT NOT NULL,
  email             TEXT,
  telefono          TEXT,
  cargo             TEXT,
  es_principal      BOOLEAN DEFAULT false,
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID,
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- FK: tercero_id
-- Indices: (tenant_id, tercero_id)
```

---

### 3.3 `terceros_sitios` (Ubicaciones de terceros)

```sql
CREATE TABLE terceros_sitios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tercero_id        UUID REFERENCES terceros(id) NOT NULL,
  sitio_tipo_id     UUID REFERENCES sitios_tipo(id),
  nombre            TEXT NOT NULL,
  direccion         TEXT,
  ciudad            TEXT,
  pais              TEXT,
  latitud           NUMERIC(10,8),
  longitud          NUMERIC(11,8),
  observaciones     TEXT,
  es_activo         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- FK: tercero_id, sitio_tipo_id
-- Indices: (tenant_id, tercero_id)
```

---

## 4. Maquinaria

### 4.1 `maquinaria` (Equipos/Vehículos)

```sql
CREATE TABLE maquinaria (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  nombre            TEXT NOT NULL,
  placa             TEXT UNIQUE,
  tipo              TEXT,  -- 'grúa', 'excavadora', 'vehículo', 'herramienta'
  modelo_id         UUID REFERENCES maquinaria_modelos(id),
  propietario       TEXT,  -- 'propio', 'tercero'
  tercero_id        UUID REFERENCES terceros(id),  -- Si propietario = tercero
  year              INTEGER,
  observaciones     TEXT,
  es_activa         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID,
  bubble_id         TEXT UNIQUE,
  UNIQUE (tenant_id, placa)
);

-- RLS: By tenant_id
-- Indices: (tenant_id, nombre), (placa), (bubble_id)
```

---

### 4.2 `maquinaria_modelos`

```sql
CREATE TABLE maquinaria_modelos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  nombre            TEXT NOT NULL,
  marca             TEXT,
  capacidad         TEXT,
  descripcion       TEXT,
  es_activo         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
```

---

### 4.3 `maquinaria_docs` (Documentos: SOAT, revisión técnica, etc.)

```sql
CREATE TABLE maquinaria_docs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  maquinaria_id     UUID REFERENCES maquinaria(id) NOT NULL,
  tipo_doc          TEXT,  -- 'SOAT', 'RTV', 'Seguro', 'Mantenimiento'
  numero_doc        TEXT,
  fecha_emision     DATE,
  fecha_vencimiento DATE,
  observaciones     TEXT,
  archivo_url       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- FK: maquinaria_id
```

---

## 5. Planificación & Tareas

### 5.1 `tareas` (Trabajos/Proyectos)

```sql
CREATE TABLE tareas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  numero_interno    TEXT,  -- Código único por tenant (P001, P002, etc.)
  titulo            TEXT NOT NULL,
  descripcion       TEXT,
  tercero_id        UUID REFERENCES terceros(id),
  sitio_id          UUID REFERENCES terceros_sitios(id),
  fecha_inicio      DATE NOT NULL,
  fecha_fin         DATE,
  estado            TEXT DEFAULT 'pendiente',  -- pendiente, en_progreso, completada, cancelada
  prioridad         TEXT DEFAULT 'normal',  -- baja, normal, alta, urgente
  planner_id        UUID REFERENCES profiles(id),
  observaciones     TEXT,
  version_formato   TEXT DEFAULT 'v1',  -- v1 (Bubble), v2 (Supabase)
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID,
  bubble_id         TEXT UNIQUE,
  UNIQUE (tenant_id, numero_interno)
);

-- RLS: By tenant_id
-- Indices: (tenant_id, estado, fecha_inicio), (bubble_id)
```

---

### 5.2 `tareas_recursos` (Maquinaria + personal asignados)

```sql
CREATE TABLE tareas_recursos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tarea_id          UUID REFERENCES tareas(id) NOT NULL,
  tipo_recurso      TEXT,  -- 'maquinaria', 'personal'
  maquinaria_id     UUID REFERENCES maquinaria(id),
  profile_id        UUID REFERENCES profiles(id),
  fecha_asignacion  DATE,
  horas_estimadas   NUMERIC(10,2),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- FK: tarea_id, (maquinaria_id OR profile_id)
-- Indices: (tenant_id, tarea_id), (maquinaria_id), (profile_id)
```

---

### 5.3 `tareas_cotizacion_item` (Link tareas ↔ cotizaciones)

```sql
CREATE TABLE tareas_cotizacion_item (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tarea_id          UUID REFERENCES tareas(id) NOT NULL,
  cotizacion_detalle_id UUID REFERENCES cotizaciones_detalle(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
```

---

## 6. Cotizaciones & Ventas

### 6.1 `cotizaciones`

```sql
CREATE TABLE cotizaciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  numero            TEXT UNIQUE,  -- Auto-incrementado por tenant
  tercero_id        UUID REFERENCES terceros(id) NOT NULL,
  fecha_emision     DATE DEFAULT today(),
  fecha_vencimiento DATE,
  total_sin_igv     NUMERIC(12,2),
  igv               NUMERIC(12,2),
  total             NUMERIC(12,2),
  estado            TEXT DEFAULT 'borrador',  -- borrador, enviada, aprobada, rechazada, facturada
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID,
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- Indices: (tenant_id, numero), (tercero_id), (bubble_id)
```

---

### 6.2 `cotizaciones_detalle`

```sql
CREATE TABLE cotizaciones_detalle (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  cotizacion_id     UUID REFERENCES cotizaciones(id) NOT NULL ON DELETE CASCADE,
  item_numero       INTEGER,
  descripcion       TEXT NOT NULL,
  cantidad          NUMERIC(10,2) NOT NULL,
  unidad            TEXT,  -- 'unidad', 'hora', 'día', 'mes', 'km'
  precio_unitario   NUMERIC(12,2) NOT NULL,
  precio_negociado  NUMERIC(12,2),  -- Campo agregado 2026-05-24
  descuento         NUMERIC(12,2) DEFAULT 0,
  subtotal          NUMERIC(12,2),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- FK: cotizacion_id (ON DELETE CASCADE)
-- Indices: (tenant_id, cotizacion_id)
```

---

### 6.3 `cotizaciones_ofertas` (Ofertas/Alternativas)

```sql
CREATE TABLE cotizaciones_ofertas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  cotizacion_id     UUID REFERENCES cotizaciones(id) NOT NULL,
  numero_oferta     INTEGER,
  descripcion       TEXT,
  total             NUMERIC(12,2),
  estado            TEXT DEFAULT 'activa',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- FK: cotizacion_id
```

---

### 6.4 `cotizaciones_config` (Configuración por tenant)

```sql
CREATE TABLE cotizaciones_config (
  tenant_id         UUID PRIMARY KEY REFERENCES companies(id),
  version_formato   TEXT DEFAULT 'v1',
  acepta_pin        BOOLEAN DEFAULT true,
  pin_salt          TEXT,  -- Para hash de PIN
  plantilla_html    TEXT,  -- HTML de formato
  observaciones_config TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Singleton pattern: 1 row per tenant
-- RLS: By tenant_id
```

---

## 7. Reportes

### 7.1 `reportes_jornada` (Reportes diarios)

```sql
CREATE TABLE reportes_jornada (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tarea_id          UUID REFERENCES tareas(id),
  fecha             DATE NOT NULL,
  personal_id       UUID REFERENCES profiles(id),
  observaciones     TEXT,
  pdf_url           TEXT,
  version_formato   TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- Indices: (tenant_id, fecha), (tarea_id)
```

---

### 7.2 `reportes_maquinaria` (Horas/uso de equipos)

```sql
CREATE TABLE reportes_maquinaria (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tarea_id          UUID REFERENCES tareas(id),
  maquinaria_id     UUID REFERENCES maquinaria(id) NOT NULL,
  fecha             DATE NOT NULL,
  horas_utilizadas  NUMERIC(10,2),
  tipo_uso          TEXT,  -- 'transporte', 'operación', 'mantenimiento'
  observaciones     TEXT,
  pdf_url           TEXT,
  version_formato   TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- Indices: (tenant_id, fecha), (maquinaria_id)
```

---

### 7.3 `reportes_personal` (Reportes de personal)

```sql
CREATE TABLE reportes_personal (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tarea_id          UUID REFERENCES tareas(id),
  personal_id       UUID REFERENCES profiles(id) NOT NULL,
  fecha             DATE NOT NULL,
  tipo_personal     TEXT,  -- 'interno', 'externo'
  cargo_id          UUID REFERENCES personal_cargos(id),
  observaciones     TEXT,
  pdf_url           TEXT,
  version_formato   TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- Indices: (tenant_id, fecha), (personal_id)
```

---

## 8. Finanzas (Compras, Ventas, Valorizaciones)

### 8.1 `movimientos_compra` (Órdenes de compra)

```sql
CREATE TABLE movimientos_compra (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  numero            TEXT UNIQUE,
  tercero_id        UUID REFERENCES terceros(id) NOT NULL,
  fecha_emision     DATE DEFAULT today(),
  fecha_entrega     DATE,
  estado            TEXT DEFAULT 'pendiente',  -- pendiente, recibida, facturada, pagada
  subtotal          NUMERIC(12,2),
  igv               NUMERIC(12,2),
  total             NUMERIC(12,2),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- Indices: (tenant_id, numero), (tercero_id)
```

---

### 8.2 `movimientos_venta` (Órdenes de venta)

```sql
CREATE TABLE movimientos_venta (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  numero            TEXT UNIQUE,
  tercero_id        UUID REFERENCES terceros(id) NOT NULL,
  fecha_emision     DATE DEFAULT today(),
  estado            TEXT DEFAULT 'pendiente',
  subtotal          NUMERIC(12,2),
  igv               NUMERIC(12,2),
  total             NUMERIC(12,2),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
```

---

### 8.3 `valorizaciones` (Facturación/Valorizaciones)

```sql
CREATE TABLE valorizaciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  numero            TEXT UNIQUE,
  tipo              TEXT,  -- 'servicio', 'producto', 'viaje'
  tercero_id        UUID REFERENCES terceros(id) NOT NULL,
  tarea_id          UUID REFERENCES tareas(id),
  cotizacion_id     UUID REFERENCES cotizaciones(id),
  fecha_emision     DATE DEFAULT today(),
  estado            TEXT DEFAULT 'borrador',  -- borrador, emitida, pagada
  moneda            TEXT DEFAULT 'PEN',
  subtotal          NUMERIC(12,2),
  igv               NUMERIC(12,2),
  total             NUMERIC(12,2),
  pdf_url           TEXT,
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- Indices: (tenant_id, numero), (tercero_id), (tarea_id), (cotizacion_id)
```

---

### 8.4 `pagos` (Pagos realizados/recibidos)

```sql
CREATE TABLE pagos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  numero            TEXT UNIQUE,
  tipo              TEXT,  -- 'entrada', 'salida'
  tercero_id        UUID REFERENCES terceros(id) NOT NULL,
  valorizacion_id   UUID REFERENCES valorizaciones(id),
  fecha_pago        DATE DEFAULT today(),
  monto             NUMERIC(12,2) NOT NULL,
  moneda            TEXT DEFAULT 'PEN',
  metodo            TEXT,  -- 'efectivo', 'transferencia', 'cheque', 'tarjeta'
  referencia        TEXT,  -- Número de cheque, referencia de transferencia, etc.
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- Indices: (tenant_id, fecha_pago), (tercero_id), (valorizacion_id)
```

---

## 9. EPP (Equipo de Protección Personal)

### 9.1 `epp_alertas`

```sql
CREATE TABLE epp_alertas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  personal_id       UUID REFERENCES profiles(id) NOT NULL,
  tipo_alerta       TEXT,  -- 'vencimiento', 'falta', 'danyo'
  descripcion       TEXT,
  fecha_alerta      DATE DEFAULT today(),
  estado            TEXT DEFAULT 'activa',
  fecha_resolucion  DATE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- Indices: (tenant_id, estado), (personal_id)
```

---

### 9.2 `epp_personal_config` (EPP requerido por cargo)

```sql
CREATE TABLE epp_personal_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  cargo_id          UUID REFERENCES personal_cargos(id),
  elementos_epp     TEXT[],  -- Array de elementos (casco, chaleco, guantes, etc.)
  creado_at         TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, cargo_id)
);

-- Singleton-like per cargo per tenant
```

---

## 10. Inspecciones

### 10.1 `inspecciones`

```sql
CREATE TABLE inspecciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tipo              TEXT,  -- 'preventiva', 'correctiva', 'audit'
  recurso_id        UUID REFERENCES maquinaria(id),
  personal_id       UUID REFERENCES profiles(id),
  fecha_inspeccion  DATE DEFAULT today(),
  estado            TEXT DEFAULT 'pendiente',  -- pendiente, completada, rechazada
  observaciones     TEXT,
  pdf_url           TEXT,
  version_formato   TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- Indices: (tenant_id, fecha_inspeccion)
```

---

### 10.2 `inspecciones_detalles` (Preguntas/Respuestas)

```sql
CREATE TABLE inspecciones_detalles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  inspeccion_id     UUID REFERENCES inspecciones(id) NOT NULL ON DELETE CASCADE,
  pregunta          TEXT NOT NULL,
  respuesta         BOOLEAN,  -- sí/no
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- FK: inspeccion_id (ON DELETE CASCADE)
```

---

## 11. Planes de Acción

### 11.1 `planes_accion`

```sql
CREATE TABLE planes_accion (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  numero            TEXT UNIQUE,
  titulo            TEXT NOT NULL,
  descripcion       TEXT,
  estado            TEXT DEFAULT 'abierto',  -- abierto, en_progreso, cerrado, cancelado
  responsable_id    UUID REFERENCES profiles(id),
  fecha_vencimiento DATE,
  observaciones     TEXT,
  version_formato   TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE
);

-- RLS: By tenant_id
-- Indices: (tenant_id, numero)
```

---

### 11.2 `planes_accion_tareas`

```sql
CREATE TABLE planes_accion_tareas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  plan_id           UUID REFERENCES planes_accion(id) NOT NULL ON DELETE CASCADE,
  tarea_id          UUID REFERENCES tareas(id),  -- Opcional: puede ser tarea nueva o existente
  descripcion       TEXT NOT NULL,
  estado            TEXT DEFAULT 'pendiente',  -- pendiente, completada
  responsable_id    UUID REFERENCES profiles(id),
  fecha_limite      DATE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- FK: plan_id (ON DELETE CASCADE), tarea_id (optional)
```

---

## 12. Formatos (Dinámicos)

### 12.1 `formatos_preguntas`

```sql
CREATE TABLE formatos_preguntas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  nombre_formato    TEXT NOT NULL,  -- 'Formato Riggers', 'Formato Maquinaria', etc.
  numero_pregunta   INTEGER,
  pregunta          TEXT NOT NULL,
  tipo_respuesta    TEXT,  -- 'texto', 'numero', 'booleano', 'foto', 'firma'
  obligatoria       BOOLEAN DEFAULT false,
  orden_display     INTEGER,
  observaciones     TEXT,
  fuente_foto       TEXT,  -- 'camara', 'galeria', 'url'
  version_formato   TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE,
  UNIQUE (tenant_id, nombre_formato, numero_pregunta)
);

-- RLS: By tenant_id
-- Indices: (tenant_id, nombre_formato)
```

---

### 12.2 `formatos_informes` (Respuestas a formatos)

```sql
CREATE TABLE formatos_informes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  nombre_formato    TEXT NOT NULL,
  correlativo       INTEGER,  -- Contador de informes por formato/tenant
  tarea_id          UUID REFERENCES tareas(id),
  reporte_id        UUID REFERENCES reportes_jornada(id),  -- O reportes_maquinaria, etc.
  personal_id       UUID REFERENCES profiles(id),
  fecha_informe     DATE DEFAULT today(),
  estado            TEXT DEFAULT 'borrador',  -- borrador, completo
  pdf_url           TEXT,
  version_formato   TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  bubble_id         TEXT UNIQUE,
  UNIQUE (tenant_id, nombre_formato, correlativo)
);

-- RLS: By tenant_id
-- Indices: (tenant_id, nombre_formato, correlativo), (tarea_id)
```

---

### 12.3 `formatos_respuestas`

```sql
CREATE TABLE formatos_respuestas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  formato_informe_id UUID REFERENCES formatos_informes(id) NOT NULL ON DELETE CASCADE,
  pregunta_id       UUID REFERENCES formatos_preguntas(id),
  numero_pregunta   INTEGER,
  respuesta_texto   TEXT,
  respuesta_numero  NUMERIC(12,2),
  respuesta_booleano BOOLEAN,
  respuesta_foto_url TEXT,
  respuesta_firma_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS: By tenant_id
-- FK: formato_informe_id (ON DELETE CASCADE)
```

---

## 13. Permisos (RBAC)

### 13.1 `cargo_permisos`

```sql
CREATE TABLE cargo_permisos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  cargo_id          UUID REFERENCES job_titles(id) NOT NULL,
  recurso_id        UUID REFERENCES sistema_recursos(id) NOT NULL,
  puede_ver         BOOLEAN DEFAULT false,
  puede_crear       BOOLEAN DEFAULT false,
  puede_editar      BOOLEAN DEFAULT false,
  puede_eliminar    BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, cargo_id, recurso_id)
);

-- RLS: By tenant_id
-- FK: cargo_id, recurso_id
```

---

### 13.2 `sistema_recursos` (Recursos protegibles)

```sql
CREATE TABLE sistema_recursos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  nombre            TEXT NOT NULL,  -- 'cotizaciones', 'tareas', 'reportes', etc.
  descripcion       TEXT,
  es_activo         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, nombre)
);
```

---

## 14. Notificaciones

### 14.1 `notificaciones_receptores`

```sql
CREATE TABLE notificaciones_receptores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES companies(id) NOT NULL,
  tipo_evento       TEXT,  -- 'cotizacion_aprobada', 'tarea_completada', etc.
  profile_id        UUID REFERENCES profiles(id) NOT NULL,
  incluir           BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, tipo_evento, profile_id)
);

-- RLS: By tenant_id
```

---

## Enums Principales

```sql
app_role:
  - 'reporta_admin'
  - 'admin_tenant'
  - 'planner'
  - 'supervisor'
  - 'viewer'
  - 'member'

doc_type:
  - 'DNI', 'CE', 'PASSPORT', 'RUC', 'OTHER'

doc_aplica_a:
  - 'vehiculo', 'maquinaria', 'todos'
```

---

## Vistas (Materialized Views)

| Vista | Propósito | Actualización |
|-------|-----------|---------------|
| `view_tarea_agenda_diaria` | Tareas por día | Manual (RPC) |
| `view_valoraciones` | Facturación + PDFs | Manual |
| `view_compras_facturar` | Compras pendientes | Manual |
| `view_ventas_panel` | Panel de ventas | Manual |
| `mv_planificacion_diaria` | Agenda consolidada | Manual (RPC) |

---

## Funciones Críticas

| Función | Propósito |
|---------|-----------|
| `update_updated_at_column()` | Trigger para updated_at |
| `set_created_by_column()` | Trigger para created_by |
| `refresh_mv_planificacion_diaria()` | Actualiza vista de agenda |
| `get_rutas_bloqueadas()` | RPC para RBAC |

---

## Storage Buckets

| Bucket | Públicos | Propósito |
|--------|----------|-----------|
| `clients/<tenant_id>/maquinaria-docs` | No | Docs de maquinaria |
| `clients/<tenant_id>/reportes-pdf` | No | PDFs generados |
| `clients/<tenant_id>/firmas` | No | Firmas digitales |
| `clients/<tenant_id>/fotos` | No | Fotos en trabajos |
| `public/assets` | Sí | Logos, imágenes |

---

## Resumen de Constraints

- **Todos tienen:** `tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`
- **RLS:** Todas las tablas usan `tenant_id` para aislamiento multi-tenant
- **Bubble IDs:** Muchas tablas tienen `bubble_id` UNIQUE para mapeo histórico
- **Foreign Keys:** Todas usan UUID FK, nunca composite keys
- **Timestamps:** UTC timezone, automáticas via triggers

---

**Última actualización:** 2026-07-12  
**Total de tablas mapeadas:** 50+  
**Total de campos documentados:** 300+  
**Estado:** ✅ Completo
