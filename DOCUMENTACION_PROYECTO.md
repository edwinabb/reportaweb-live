# Documentación del Proyecto — REPORTA WEB v3

> Última revisión: 2026-04-12 (actualizada tras completar MIG-VALIDACION Bloque A — A.1 a A.5)

---

## 1. Visión General del Sistema

**Reporta.la** es una plataforma SaaS multi-tenant para la **gestión integral de maquinaria, personal y operaciones** en empresas del sector minero/industrial peruano.

### Ecosistema Macro

| Componente       | Stack / Tech                     | Rol                                                        |
|------------------|----------------------------------|------------------------------------------------------------|
| **reportaweb3**  | Next.js 16 / React 19 / TS       | Panel web de administración y gestión                      |
| **ReportaApp**   | (app móvil, repo aparte)         | App de campo para operadores y técnicos                    |
| **Supabase**     | PostgreSQL + Auth + Storage      | Base de datos compartida, autenticación y almacenamiento   |
| **n8n**          | *(por implementar)*              | Automatización de mensajes, notificaciones y reportes      |

---

## 2. Stack Tecnológico

### Frontend
| Librería               | Versión    | Uso                                      |
|------------------------|------------|------------------------------------------|
| Next.js                | ^16.1.2    | Framework principal (App Router)         |
| React                  | 19.2.0     | UI                                       |
| TypeScript             | ^5         | Tipado estático                          |
| Tailwind CSS           | ^4         | Estilos utilitarios                      |
| shadcn/ui              | —          | Componentes UI (Radix UI base)           |
| lucide-react           | ^0.556.0   | Iconografía                              |
| @tanstack/react-table  | ^8.21.3    | Tablas avanzadas                         |
| react-hook-form        | ^7.68.0    | Manejo de formularios                    |
| zod                    | ^4.1.3     | Validación de esquemas                   |
| sonner                 | ^2.0.7     | Notificaciones toast                     |
| date-fns               | ^4.1.0     | Manejo de fechas                         |
| react-leaflet          | ^5.0.0     | Mapas interactivos                       |
| next-themes            | ^0.4.6     | Dark/Light mode                          |

### Backend / Data
| Servicio               | Versión / Detalle                | Uso                                      |
|------------------------|----------------------------------|------------------------------------------|
| Supabase               | @supabase/supabase-js ^2.86.2   | Base de datos, Auth, Storage             |
| @supabase/ssr          | ^0.8.0                           | Auth SSR para Next.js                    |
| Gotenberg              | (servicio externo)               | Generación de PDFs desde HTML            |
| docxtemplater + pizzip | ^3.67.6 / ^3.2.0                | Generación de documentos Word            |

### Herramientas
| Herramienta     | Uso                              |
|-----------------|----------------------------------|
| ESLint 9        | Linting                          |
| Supabase CLI    | Migraciones y CLI local          |

---

## 3. Arquitectura

### Patrón General
```
app/
  (auth)/          → Rutas públicas (login, select-tenant)
  (dashboard)/     → Rutas protegidas (layout con sidebar)
  api/             → API Routes (PDF generation)
  aprobacion/      → Ruta pública para aprobación de cotizaciones por PIN
  tareas/          → Vista de tareas (pendiente)
lib/
  actions/         → Server Actions (operaciones de BD)
  config/          → Configuración de menú
  utils/           → Utilidades (storage, tenant-context)
components/        → Componentes reutilizables
contexts/          → Contextos React (user-context)
types/             → Tipos TypeScript
utils/supabase/    → Clientes Supabase (client, server, admin, middleware)
supabase/
  migrations/      → 61 migraciones SQL
```

### Multi-Tenancy
- Cada empresa (tenant) tiene su propia entrada en la tabla `companies`
- El `tenant_id` se almacena en perfiles y en todas las tablas de datos
- RLS (Row Level Security) en Supabase aísla los datos por tenant
- Los admins de REPORTA pueden cambiar de tenant activo mediante una cookie `managed_tenant_id` (httpOnly)
- La función `get_auth_tenant_id()` en Supabase resuelve el tenant activo del usuario
- El servidor expone `getActiveTenantId()` server action para que el contexto cliente lea la cookie de forma segura

### Flujo de Autenticación
```
Login (email + password)
  → Supabase Auth
  → Consulta perfil + company
  → Si role = 'reporta_admin' → /select-tenant
  → Resto → /dashboard
```

### Protección de Rutas (Middleware)
El middleware en `utils/supabase/middleware.ts` protege todas las rutas excepto:
- `/login` — pantalla de ingreso
- `/auth/*` — callbacks de Supabase Auth
- `/aprobacion/*` — flujo público de aprobación de cotizaciones por PIN

Si el usuario no tiene sesión e intenta acceder a una ruta protegida, es redirigido a `/login?redirect=<ruta-original>`. Si ya tiene sesión e intenta ir a `/login`, es redirigido al dashboard.

---

## 4. Módulos y Funcionalidades

### 4.1 Dashboard (`/`)
- Panel principal con KPIs (pendiente: datos reales, actualmente placeholder)
- Resumen de ventas (pendiente: conectar con datos reales)

### 4.2 Planificación (`/planificacion`)
- Vista semanal de tareas por fecha
- Vistas de listado, personal y maquinaria (las 2 últimas son placeholder "Próximamente")
- Registro de nuevas tareas (`/planificacion/nueva`)

### 4.3 Inspecciones / Formatos (`/formatos`)
- Listado de inspecciones (formatos)
- Vista de papelera (soft delete)
- Plantillas de formularios (`/formatos/plantillas`)
- Editor de plantillas con campos dinámicos
- Nueva inspección con form dinámico y checklist de grúas
- Generación de PDF de inspección via Gotenberg

### 4.4 Cotizaciones (`/cotizaciones`)
- Gestión completa del ciclo de cotizaciones
- Flujo: Borrador → Enviada → Aprobada/Rechazada
- Configuración de servicios y tasas de cambio
- Precios en múltiples monedas (PEN, USD)
- Generación de PDF configurable
- **Aprobación externa por PIN** (`/aprobacion/[token]`) — flujo público para el cliente
  - Rate limiting: máximo 5 intentos, bloqueo de 15 minutos tras excederlos
  - Columnas `pin_attempts` y `pin_locked_until` en tabla `cotizaciones`
- Envío de cotización al cliente (actualmente con email mock, pendiente Resend)
- Matriz de responsabilidad
- Historial de ofertas de proveedores

### 4.5 Ventas (`/ventas`)
- Panel con KPIs (informes, horas, valoraciones, montos)
- Listado de pendientes de valorizar y facturar (agrupados por cliente)
- Valoraciones
- Facturas de venta

### 4.6 Compras (`/compras`)
- Panel similar a ventas (compras)
- Valoraciones de compra
- Facturas de compra

### 4.7 Terceros (`/terceros`)
- Directorio de empresas / personas jurídicas
- Contactos asociados a terceros
- Personal (personas físicas)
- Sitios / Ubicaciones (con geolocalización via Leaflet)

### 4.8 Maquinaria (`/maquinarias`)
- Inventario de equipos con ficha completa
- Modelos de maquinaria
- Tipos de maquinaria
- Documentación de equipos

### 4.9 Usuarios (`/users`)
- Directorio de usuarios del sistema
- Documentación personal de usuarios
- Creación, edición y eliminación de usuarios

### 4.10 Configuración (`/settings`)
- Configuración de tipos de documento
- Configuración de cotizaciones
- Tipos de maquinaria
- Sitios
- Terceros (catálogos)
- Usuarios y cargos

### 4.11 Sistema (`/sistema`)
- Solo para usuarios con rol `reporta_admin`
- Listado de empresas (tenants)
- Selector de empresa activa (administración cross-tenant)
- Acceso validado server-side antes de cualquier operación

---

## 5. Base de Datos (Supabase)

### Tablas Principales

| Tabla                              | Descripción                                  |
|------------------------------------|----------------------------------------------|
| `companies`                        | Tenants / Empresas                           |
| `profiles`                         | Usuarios del sistema                         |
| `profile_details`                  | Datos extendidos de perfil                   |
| `job_titles`                       | Cargos                                       |
| `document_types`                   | Tipos de documento                           |
| `user_documents`                   | Documentos de usuarios                       |
| `maquinarias`                      | Equipos                                      |
| `maquinaria_modelos`               | Modelos de equipos                           |
| `maquinaria_tipos_docs`            | Tipos de documento de equipo (SOAT, etc.)    |
| `maquinaria_documentos`            | Docs físicos de equipo + Storage             |
| `terceros`                         | Clientes / Proveedores                       |
| `terceros_contactos`               | Contactos de terceros                        |
| `terceros_sitios`                  | Sitios / obras                               |
| `personal`                         | Personal técnico                             |
| `tareas`                           | Tareas / actividades                         |
| `asignaciones`                     | Asignaciones de personal/equipo a tareas     |
| `cotizaciones`                     | Cotizaciones (incluye `pin_attempts`, `pin_locked_until`) |
| `cotizaciones_detalle`             | Ítems de cotización                          |
| `cotizaciones_matriz_responsabilidad` | Matriz de responsabilidad               |
| `cotizaciones_ofertas_proveedores` | Ofertas de proveedores                       |
| `servicios`                        | Catálogo de servicios                        |
| `tasas_cambio`                     | Tasas de cambio                              |
| `reportes_maquinaria`              | Reportes diarios de campo                    |
| `facturas_venta`                   | Facturas de venta                            |
| `facturas_compra`                  | Facturas de compra                           |
| `inspecciones` (formatos)          | Inspecciones / formularios                   |
| `plantillas`                       | Plantillas de formularios                    |

### Vistas
- `view_ventas_pendiente_valorizar`
- `view_ventas_pendiente_facturar`
- `view_compras_pendiente_valorizar`
- `view_compras_pendiente_facturar`
- `view_valoraciones_ventas`
- `view_valoraciones_compras`

### Seguridad
- RLS habilitado en todas las tablas principales
- Función `get_auth_tenant_id()` centraliza la resolución del tenant activo
- Roles: `reporta_admin`, `admin_tenant`, `supervisor`, `member`
- Las server actions de gestión de tenants validan rol `reporta_admin` antes de operar

### Storage Buckets
- `logos` — Logos de empresas
- `avatars` — Fotos de usuarios
- `public-assets` — Assets públicos (logos de cotizaciones)
- `finance-docs` — Documentos financieros

---

## 6. Variables de Entorno Requeridas

```env
# Supabase (runtime)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Supabase CLI (dev-time — solo para regenerar types)
# Personal Access Token de https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=

# PDF Generation
GOTENBERG_URL=

# Email
RESEND_API_KEY=

# Bubble (solo scripts de migración)
BUBBLE_API_TOKEN=

# n8n (pendiente)
N8N_WEBHOOK_URL=
N8N_API_KEY=
```

> **Importante:** Ninguna de estas variables debe commitearse al repositorio. El `.gitignore` ya excluye `.env*`.

### Datos fijos no secretos (útiles para scripts)

- **Project ID Supabase:** `wioozisskjjgjjybsoqo` (aparece en URLs del dashboard y comando `supabase gen types`).
- **Tenant IDs:**
  - CISE: `1cb97ec7-326c-4376-93ee-ed317d3da51b`
  - GRUAS: `6f4c923a-c3b7-47c2-9dea-2a187f274f73`
- **Buckets Storage (6 activos):** `maquinarias`, `doc_maquinarias`, `cotizaciones`, `reporte-maquinaria`, `reporta-maquinaria-fotos`, `doc_usuarios`. El bucket `reporta-files` (legacy) está muerto — no usar.

---

## 7. Roles y Permisos

| Rol              | Acceso                                                           |
|------------------|------------------------------------------------------------------|
| `reporta_admin`  | Acceso total, puede cambiar de tenant, ve /sistema               |
| `admin_tenant`   | Gestión completa de su empresa                                   |
| `supervisor`     | Gestión operativa (inspecciones, tareas, planificación)          |
| `member`         | Solo lectura / acceso básico                                     |

La detección del rol se hace siempre desde el campo `role` del perfil en la BD — nunca por email hardcodeado.

---

## 8. Generación de PDFs

Flujo para generación de PDFs de cotizaciones e inspecciones:

```
Componente React (renderiza HTML)
  → API Route /api/pdf/generate (POST)
  → Gotenberg (servicio externo Chromium headless)
  → Retorna PDF binario
  → El browser dispara descarga
```

Para documentos Word:
```
docxtemplater + pizzip
  → Plantilla .docx con variables
  → Rellena con datos de la cotización
  → file-saver dispara descarga
```

---

## 8.1 Convenciones de Supabase Storage (archivos migrados desde Bubble)

> Estas convenciones aplican a todo archivo migrado en el **Bloque B de MIG-VALIDACION** (Bubble S3 → Supabase Storage) y a cualquier archivo nuevo subido por la app que entre en los mismos buckets.

### Buckets y mapeo por tabla/campo

| Tabla.campo                              | Bucket                     | Tipo de archivo     |
|------------------------------------------|----------------------------|---------------------|
| `maquinarias.foto_url`                   | `maquinarias`              | imagen              |
| `maquinaria_documentos.archivo_url`      | `doc_maquinarias`          | PDF / imagen        |
| `cotizaciones.pdf_url`                   | `cotizaciones`             | PDF                 |
| `reportes_maquinaria.pdf_url`            | `reporte-maquinaria`       | PDF (10 MB)         |
| `reportes_maquinaria.firma_cliente_url`  | `reporta-maquinaria-fotos` | imagen (5 MB)       |
| `reportes_usuario.pdf_url` *(futuro)*    | `reporte-usuario`          | PDF (10 MB)         |

> **Nota de naming:** existe inconsistencia intencional — `reporte-maquinaria` vs. `reporta-maquinaria-fotos`. Se respetan los nombres tal como fueron creados en el dashboard; no renombrar sin coordinación.

### Estructura de path dentro del bucket

```
{tenant_slug}/{tercero_slug}/{yyyy}/{codigo}-{tercero_slug}-{yyyy-mm-dd}.{ext}
```

**Reglas:**

1. **`tenant_slug`** — valor fijo por tenant, no deriva del nombre completo del tenant:
   - CISE → `cise`
   - GRUAS → `gruaspacifico`
2. **`tercero_slug`** — slug del cliente (tercero) asociado a la fila:
   - Solo aplica a tablas con FK a `terceros` (ej. `maquinaria_documentos`, `cotizaciones`, `reportes_maquinaria`).
   - Si la fila **no tiene `tercero_id`** (ej. `maquinarias.foto_url`, filas huérfanas), se **omite completamente** este segmento — el archivo queda directamente bajo `{tenant_slug}/{yyyy}/...`.
3. **`yyyy`** — año del `created_at` del registro (no la fecha de negocio).
4. **`codigo`** — código de identificación del documento según la tabla:
   - `cotizaciones.codigo`, `reportes_maquinaria.codigo`, `tareas.codigo`, etc.
   - Si la fila **no tiene código**, se omite ese segmento del filename y se continúa con `{tercero_slug}-{yyyy-mm-dd}.{ext}`.
5. **`yyyy-mm-dd`** — fecha formateada de `created_at`.
6. **`{ext}`** — extensión derivada del `Content-Type` de la respuesta HTTP al descargar desde Bubble S3. **No se fuerza ni se modifica** — si Bubble devuelve `application/pdf` → `.pdf`; `image/jpeg` → `.jpg`; etc. Fallback a la extensión de la URL si el `Content-Type` falta.

### Clean-for-URL (algoritmo de slug)

Se aplica al `tenant_slug` (aunque son fijos, valida) y al `tercero_slug`:

1. `String.normalize('NFD')` y remover diacríticos (`á` → `a`, `ñ` → `n`, `ü` → `u`).
2. `toLowerCase()`.
3. Reemplazar cualquier carácter que no sea `[a-z0-9]` por `-`.
4. Colapsar secuencias de `-` múltiples a un solo `-`.
5. Trim de `-` al inicio y al final.
6. Si el resultado queda vacío → usar `sin-nombre`.

**Ejemplos:**

| Entrada                                  | Salida                         |
|------------------------------------------|--------------------------------|
| `Construcciones & Cía. Ltda.`            | `construcciones-cia-ltda`      |
| `José Ñandú S.A.C.`                      | `jose-nandu-s-a-c`             |
| `GRUAS PACÍFICO`                         | `gruas-pacifico`               |
| (solo espacios o guiones)                | `sin-nombre`                   |

### URL almacenada en la tabla

Después de subir el archivo, la columna original (`pdf_url`, `foto_url`, etc.) se actualiza con la **URL pública completa** devuelta por `supabase.storage.from(bucket).getPublicUrl(path)`, no con el path relativo. Esto evita tocar los componentes del frontend que hoy leen la URL directa.

### Tabla de control `file_migration_log`

Controla idempotencia y resume del script `scripts/migrate-files-to-storage.ts`:

| Columna          | Tipo           | Descripción                                        |
|------------------|----------------|----------------------------------------------------|
| `table_name`     | text           | Tabla origen (`cotizaciones`, etc.)                |
| `row_id`         | uuid           | ID del registro en Supabase                        |
| `field`          | text           | Columna del archivo (`pdf_url`, `foto_url`, etc.)  |
| `bubble_url`     | text           | URL original en Bubble S3                          |
| `storage_bucket` | text           | Bucket destino                                     |
| `storage_path`   | text           | Path final dentro del bucket                       |
| `public_url`     | text           | URL pública de Supabase Storage                    |
| `status`         | text           | `pending` / `done` / `skipped` / `error`           |
| `error`          | text           | Mensaje de error (si `status = 'error'`)           |
| `updated_at`     | timestamptz    | Última actualización                               |

PK compuesta: `(table_name, row_id, field)`.

El script lee esta tabla antes de descargar: si el registro ya está en `done`, lo salta.

---

## 9. Emails

Actualmente el servicio de email **es un mock** (`lib/email.ts`). Solo imprime en consola.

Flujo planeado (pendiente — Fase 2):
- Proveedor: Resend (`npm install resend`, `RESEND_API_KEY` en env)
- Casos: Envío de cotización al cliente, notificaciones de aprobación/rechazo

---

## 10. Integración n8n (Pendiente — Fase 4)

No implementada. Casos de uso planeados:
- Notificaciones push/email cuando se crea una tarea
- Alertas de vencimiento de documentos de maquinaria
- Reportes automáticos periódicos
- Webhooks de aprobación de cotizaciones

---

## 11. Coordinación con ReportaApp (Móvil)

Ambas apps comparten la misma base de datos Supabase. Los datos críticos que el móvil consume/produce:
- `tareas` y `asignaciones` (planificación de campo)
- `reportes_maquinaria` (reportes diarios de operadores)
- `inspecciones` / `formatos` (checklists de campo)
- `profiles` (autenticación compartida)

---

## 12. Estado de Migración desde Bubble

> Última actualización 2026-04-15. Ver [COMO MIGRAR.md](COMO%20MIGRAR.md) para instrucciones detalladas, [RUNBOOK-DOMINGO.md](RUNBOOK-DOMINGO.md) para el cutover, y [MIGRACION_DIAGNOSTICO.md](MIGRACION_DIAGNOSTICO.md) para el detalle por tabla.

**IDs fijos verificados:**

| Tenant | Supabase UUID | Bubble ID |
|---|---|---|
| CISE PERU SAC | `1cb97ec7-326c-4376-93ee-ed317d3da51b` | `1596035803087x371442079041323000` |
| GRUAS DEL PACIFICO | `6f4c923a-c3b7-47c2-9dea-2a187f274f73` | `1691779382086x534175713862630160` |

**Resumen ejecutivo:**

- ✅ **MIG-0..MIG-7** completos — migración base (117,150+ registros).
- ✅ **Bloque A** completo (A.1..A.5) — plantillas, planes_accion, matriz, gaps pequeños, huérfanos.
- ✅ **Bloque B** cerrado 2026-04-14 — 33,110 archivos migrados a Supabase Storage. Ver changelog v3.1.17.
- ✅ **Planes de Acción Fase 0** cerrada 2026-04-14 — 386 planes + 937 responsables N:N + 44 avances.
- ✅ **Inspecciones migration** cerrada 2026-04-15 — 13,327 informes (10,027 CISE + 3,300 GRUAS), 0 errores, 0 FK misses. 366 planes_accion vinculados al FK `inspeccion_id`, 0 missed.
- ✅ **Bug `migrate-users.ts` MIG-2d** resuelto 2026-04-15 (descubierto en dress-rehearsal). Ver changelog v3.1.17.
- ✅ **Dress-rehearsal end-to-end** validado 2026-04-15 — **40m 15s** contra `version-test`, **19 fases OK**, audit 0 regresiones. Ver changelog v3.1.18.
- ✅ **Pagos de facturas (Grupo B)** migrados 2026-04-15 — 521 `factura_venta_pagos` + 22 `facturas_compra_pagos`, 0 errores. 6 skipped (huérfanos sin factura padre). Ver changelog v3.1.18.
- ✅ **Valorizaciones (Grupo C)** migradas 2026-04-15 — 752 `valorizaciones` (CISE only), 0 errores. `reporte_maquinaria_id` NULL (FK apunta a Bubble tipo `maquinaria_horas`, no a `maquinaria_reporte_horas_new`). Ver changelog v3.1.18.
- ✅ **Profile Detail (Grupo F)** migrado 2026-04-15 — 101 profiles actualizados (birthday, dirección, contacto emergencia), 213 sin campos nuevos, 3 FK miss. Ver changelog v3.1.18.
- ✅ **Gastos usuario (Grupo D)** migrados 2026-04-15 — 3,277 `gastos_usuario` (CISE only), 0 errores, 0 FK misses. Ver changelog v3.1.18.
- ✅ **Batch 2 (5 tipos)** migrados 2026-04-15 — 626 `user_documents`, 1,917 `maquinaria_horas`, 13,218 `informe_objetos`, 505 `cotizaciones_motivo_rechazo`, 46 `servicios_tipo_precios`. 752 `valorizaciones` linkeadas a `maquinaria_horas_id`. Ver changelog v3.1.18.
- ✅ **Respuestas 2026** migradas 2026-04-15 — 25,096 `inspecciones_detalles` (CISE 5,830 + GRUAS 19,266), 0 errores, 0 FK miss. Solo 2026+; pre-2026 cubierto por PDFs. 1,221 inspecciones pre-2026 sin PDF deshabilitadas.
- 🔒 **Cutover final**: domingo **2026-04-26** (re-programado desde 2026-04-19), ventana ~4-5 h, orchestrator `scripts/migrate-all-prod.ts`.

**Orchestrator parametrizable:**

- [scripts/migrate-all-prod.ts](scripts/migrate-all-prod.ts) corre 19 fases en orden (MIG 2-7 + MIG-4b pagos + MIG-6b valorizaciones + Bloque A + Inspecciones + profileDetail + gastos + batch2 + respuestas2026 + Bloque B + audit).
- Los 17 scripts canónicos leen `BUBBLE_API_URL` de env con fallback a `version-test`. Soporta `--phase=<id>`, `--from=<id>`, `--dry-run`, logs persistentes en `logs/`.
- [scripts/migrate-files-to-storage.ts](scripts/migrate-files-to-storage.ts) usa worker pool con `--concurrency=N`. **El cutover prod debe usar `--concurrency=8`** para que Bloque B quepa en ~60-90 min en vez de 9 h.
- [scripts/migrate-files-to-storage.ts:176-193](scripts/migrate-files-to-storage.ts#L176-L193) `classifyUrl` distingue `supa_dead` (URLs al bucket borrado `reporta-files`) y las fuerza por el flujo re-fetch-desde-Bubble via `bubble_id`.

Correr contra prod:

```bash
BUBBLE_API_URL=https://reporta.la/api/1.1/obj npx tsx scripts/migrate-all-prod.ts
```

**Buckets vigentes en Supabase Storage:**

```text
banca, cotizaciones, doc_maquinarias, doc_usuarios, facturas_compras,
facturas_ventas, logos, maquinarias, reporta-maquinaria-fotos,
reporte-maquinaria, reporte-usuario, usuarios
```

> ⚠️ Bucket muerto: `reporta-files` (eliminado ~2026-04-07). Cualquier URL `…supabase.co/storage/v1/object/public/reporta-files/…` es rota — ya drenada vía `supa_dead`.

**Bloque B — estado final (2026-04-14 noche):**

| Target | Total | Migrado | Estado |
| :--- | ---: | ---: | :--- |
| `maquinarias.foto_url` | 15 | 15 | ✅ |
| `maquinaria_documentos.archivo_url` | 224 | 224 | ✅ |
| `cotizaciones.pdf_url` | 2,224 | 2,224 | ✅ (+164 supa_dead drenados) |
| `reportes_maquinaria.firma_cliente_url` | 9,864 | 9,864 | ✅ (+9 supa_dead drenados) |
| `reportes_maquinaria.pdf_url` | 20,783 | 20,782 | ✅ (+733 supa_dead drenados; 1 row `c25c481b` con URL origen rota, pérdida 0.005% aceptada) |

**Campos de origen vacío (no son gaps reales):**

- `reportes_maquinaria.foto_actividad_url` 0/22,197 — Bubble no tiene campo equivalente. Columna residual, aceptar NULL o `DROP COLUMN` post-cutover.
- `reportes_usuario.pdf_url` 0/24,974 — Bubble nunca persistió PDF de usuario. Aceptar NULL.

**Tablas principales (Supabase post A.1..A.5):**

| Tabla | S.Total | Gap per-tenant | Estado |
|---|---|---|---|
| `companies` | 2 | 0 | ✅ |
| `terceros` | 614 | 0 | ✅ (CISE 388 + GRUAS 226) |
| `terceros_contactos` | 810 | — | ✅ (50 sin `tercero_id` en Bubble) |
| `terceros_sitios` | 1,616 | **0** | ✅ A.4 cerrado |
| `maquinarias` | 260 | 0 | ✅ (CISE 120 + GRUAS 140) |
| `maquinaria_modelos` | 230 | 0 | ✅ |
| `maquinaria_tipos_docs` | 30 | 0 | ✅ |
| `maquinaria_documentos` | 230 | -1 GRUAS | ⚠️ Aceptado (1 doc Bubble sin link) |
| `servicios` | 430 | 0 | ✅ (CISE 231 + GRUAS 199) |
| `profiles` | 318 | — | ✅ (1 admin manual) |
| `cotizaciones` | 2,555 | 0 | ✅ (CISE 2,297 + GRUAS 258) |
| `cotizaciones_detalle` | 4,059 | -58 | ⚠️ Aceptado (58 huérfanos Bubble sin padre) |
| `cotizaciones_matriz_responsabilidad` | 52,108 | — | ✅ A.3 cerrado (30 repaired, 1,062 borrados) |
| `plantillas` | 322 | — | ✅ A.1 (161 × 2 tenants) |
| `planes_accion` | 386 | 0 | ✅ A.2 (20 CISE + 366 GRUAS) |
| `tareas` | 13,738 | 0 | ✅ (CISE 4,798 + GRUAS 8,940) |
| `facturas_venta` | 2,731 | — | ✅ A.5: 2 vacíos eliminados |
| `facturas_venta_item` | 18,393 | -2,737 | ⚠️ A.5: 1,043 fantasma eliminados. Resto = huérfanos documentados |
| `facturas_compra` | 1,265 | 0 | ✅ (CISE 74 + GRUAS 1,191) |
| `facturas_compra_item` | 20,761 | 0 | ✅ A.5: 7 fantasma eliminados |
| `reportes_maquinaria` | 22,197 | 0 | ✅ (CISE 5,541 + GRUAS 16,656) |
| `reportes_usuario` | 24,974 | 0 | ✅ (CISE 11,604 + GRUAS 13,370) |
| `tasas_cambio` | 871 | — | ⚠️ Sembrado sin `bubble_id` |
| `tipos_precio` | 20 | — | ✅ Catálogo global compartido (tenant NULL intencional) |
| `factura_venta_pagos` | 521 | -6 | ✅ MIG-4b (6 huérfanos sin factura padre) |
| `facturas_compra_pagos` | 22 | 0 | ✅ MIG-4b |
| `valorizaciones` | 752 | 0 | ✅ MIG-6b (CISE only; `reporte_maquinaria_id` NULL — FK pendiente) |
| `planes_accion_responsables` | 937 | — | ✅ Fase 0 |
| `planes_accion_avances` | 44 | — | ✅ Fase 0 |
| `inspecciones` | 13,327 | 0 | ✅ (CISE 10,027 + GRUAS 3,300) |
| `gastos_usuario` | 3,277 | 0 | ✅ MIG-D (CISE only) |
| `user_documents` | 626 | -183 | ⚠️ Batch2 (183 sin document_type_id match, 4 sin user_id) |
| `maquinaria_horas` | 1,917 | 0 | ✅ Batch2 (CISE only, 0 FK miss) |
| `informe_objetos` | 13,218 | 0 | ✅ Batch2 (CISE 10,123 + GRUAS 3,095) |
| `cotizaciones_motivo_rechazo` | 505 | -3 | ✅ Batch2 (3 de otros tenants) |
| `servicios_tipo_precios` | 46 | 0 | ✅ Batch2 (CISE 22 + GRUAS 24) |
| `inspecciones_detalles` | 25,096 | 0 | ✅ Solo 2026+ (CISE 5,830 + GRUAS 19,266) |

### Mapa completo de tipos Bubble (153) — clasificación definitiva 2026-04-15

> Fuentes: `bubble_types.txt` (153 tipos), `bubble_full_schema.json` (36 probed), `docs/bubble_remaining_usage.json` (140 triaged), probe masivo 2026-04-15 (26 tipos). Este mapa es la referencia definitiva para saber qué se migró, qué falta, y por qué se descartó cada tipo.

**Resumen:**

| Categoría | # tipos | Registros | Decisión |
|---|---:|---:|---|
| ✅ Migrados | 45 | ~163,000 | En Supabase (45 tablas con datos) |
| ✅ Parcialmente migrado | 1 | 25,096 de 350,926 | `informe_respuesta` → solo 2026+ migrado. Pre-2026 cubierto por PDFs. |
| ⚫ Vacíos (0 rows) | 53 | 0 | No migrar |
| 🔘 Infraestructura Bubble | ~20 | — | No aplica (app_*, kpi*, versiones) |
| 🟤 Embebidos en JSONB | 7 | ~177 | Cubiertos por `plantillas.estructura` |
| ⚪ Descartados por decisión | 4 | ~80,000 | Logs/notificaciones históricas |
| 🔵 Baja prioridad / triviales | ~24 | ~2,300 | No migrar (ver detalle abajo) |

#### 🔴 Candidatos a migrar (6 tipos — pendientes)

| # | Tipo Bubble | Rows | CISE | GRUAS | Supabase destino | Estado |
|---|---|---:|---:|---:|---|---|
| 1 | `informe_respuesta` | 350,926 | 203,566 | 99,250 | `inspecciones_detalles` | ✅ **25,096 migrados** (solo 2026+: CISE 5,830 + GRUAS 19,266). Pre-2026 cubierto por PDFs. 1,221 inspecciones sin PDF deshabilitadas. |
| 2 | `user_documents` | 809 | 171 | 638 | `user_documents` | ✅ **626 migrados** (183 sin doc_type_id match). 25 document_types con bubble_id (14 CISE + 11 GRUAS). |
| 3 | `maquinaria_horas` | 1,954 | 1,917 | 0 | `maquinaria_horas` | ✅ **1,917 migrados**. 0 FK miss. 752 valorizaciones linkeadas via `maquinaria_horas_id`. |
| 4 | `informe_objeto` | 14,296 | 10,123 | 3,095 | `informe_objetos` | ✅ **13,218 migrados**. 0 FK miss. |
| 5 | `cotizaciones_motivo_rechazo` | 508 | 504 | 1 | `cotizaciones_motivo_rechazo` | ✅ **505 migrados** (3 otros tenants). |
| 6 | `servicios_tipo_precios` | 58 | 22 | 24 | `servicios_tipo_precios` | ✅ **46 migrados**. |

#### ⚫ Vacíos confirmados (53 tipos — 0 registros CISE+GRUAS)

Módulos completos sin datos: **Proyectos** (12 tablas), **SST** (9 tablas), **Notas** (tareas_notas, sitio_notas, tercero_notas, tercero_contacto_nota = 0), **Otros** (fotos_pruebas, mensajes, material, usuario_cargos, terceros_personal, maquinaria_reporte_aceptacion_new, maquinaria_item_factura_*, margen_utilidad, usuariopagos, formato_notificacion*, formato_pregunta_checklist, formato_info_opc_multiples, formato_autorizados-borrar, formatos_preguntas_listas*, informes_respuesta_info_cantidad, informe_pdf-borrar, app_bancos, app_colores, app_empresa_menu_perfiles, app_regimen_laboral, app_ubicacion_interna, empresa_consecutivosepp, empresa_partidas, empresa_sucursal, usuario_0modulosautorizados, usuario_categoria, usuario_categoria_precios_historico, usuario_turnos).

#### 🔘 Infraestructura Bubble (~20 tipos — no aplica migrar)

Configuración interna del app Bubble que no tiene equivalente en Supabase:
`app`, `app_email`, `app_menu_paginas`, `app_perfil_permisos`, `app_permisos`, `app_profiles`, `app_videos`, `confi_roles_importantes_empresa`, `kpifunnel`, `kpisources`, `maquinariakpi`, `meses`, `semanas`, `versiones`, `reporta-la`, `modeloequipo`, `configuracionopcioneslistas-no`, `serviciotipo-revisar`, `cotizacise`, `cotizaitemcise`, `informecise`.

#### 🟤 Embebidos en `plantillas.estructura` JSONB (7 tipos)

`formato_seccion` (18), `formato_opciones_multiples` (138), `formato_setup_pdf` (7), `formato-docx` (11), `formato_preg_info_adicional` (2), `formato_grupo_opciones_multiple` (1), `formato_pregunta` (4,100 — son las definiciones de preguntas, ya embebidas como secciones/preguntas dentro de `plantillas.estructura`).

#### ⚪ Descartados por decisión del usuario (4 tipos)

`app-log-acceso` (38,679), `notificaciones` (40,832), `usuario_1listadosrelacionados` (138), `informe_infoadicional-borrar` (1,822). Motivo: logs/notificaciones históricas sin valor en el sistema nuevo, tipo deprecated (sufijo -borrar), metadata admin Bubble.

#### 🔵 Baja prioridad / triviales (no migrar salvo necesidad futura)

| Tipo | Rows | Motivo de exclusión |
|---|---:|---|
| `informe_seccion` | 6,808 | Secciones de informes completados — ya cubierto por `plantillas.estructura` JSONB. Solo CISE (4,607). |
| `tareas_recursos` | 1,009 | Recursos asignados a tareas. Tiene múltiples campos "BORRAR" y arrays complejos. Solo CISE. |
| `soporte_avance_tiquetes` | 1,542 | Avances de tickets de soporte interno. Sin tenant. Herramienta interna Bubble. |
| `empresas` | 22 | Las 22 empresas de Bubble — ya migradas como `companies` (2 rows CISE+GRUAS). Podría enriquecer fields (Logo, RUC, Dirección) pero no es prioritario. |
| `empresas_consecutivos` | 39 | Consecutivos por empresa/tipo. 5 CISE + 5 GRUAS. El sistema nuevo genera códigos vía funciones SQL. |
| `configuraciones_opciones_listas` | 575 | Opciones de listas config (áreas, estados, etc.). Sin tenant match directo (usa `Id Empresa - Nuevo` con espacios). |
| `formato_aprobacion` | 19 | Aprobaciones de formatos. 0 match por tenant a pesar de tener `id_empresa`. |
| `app_calendario_festivos` | 87 | Feriados nacionales. Sin tenant match. Se pueden re-sembrar. |
| `app_horaintervalos` | 49 | Catálogo de horas (00:00 a 23:00). Generable desde cero. |
| `sitio_ubicacion_interna` | 21 | Ubicaciones internas de sitios. Usa `Id_empresa` (capital I) — 0 match. Volumen trivial. |
| `servicionotas` | 4 | 4 notas de servicios sin tenant. Trivial. |
| `usuariotipodoc` | 3 | Tracking de descargas. 3 records. Trivial. |

---

## 13. Archivos de Desarrollo / Migración (para limpiar)

Los siguientes archivos son artefactos de migración/desarrollo y deben eliminarse del repositorio:

- `bubble_cotizaciones_dump.json` / `.txt`
- `bubble_detalle_dump.json`
- `bubble_finance_fields.json`
- `bubble_id_audit.txt` / `_utf8.txt`
- `bubble_samples.json` / `_v2.json`
- `bubble_schema_dump.json`
- `bubble_tarea_dump.json`
- `bubble_tercero_dump.json`
- `bubble_types.txt`
- `supabase_consolidated_migration.sql`
- `tmp/audit-files.ts`
- `verify_flow.js`
- `cambios-any-registro.md`

> Nota: Todos estos están cubiertos por el `.gitignore` — solo deben eliminarse del árbol de trabajo local.

---

## 14. Comandos Principales

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Lint
npm run lint

# Supabase local
supabase start
supabase db push           # Aplica migraciones pendientes
supabase migration new <nombre>
```

---

## 15. Patrones técnicos y gotchas (Supabase)

Lecciones aprendidas durante la implementación. Lectura obligatoria antes de tocar queries con joins o auth-context.

### FK ambiguo en `planes_accion.maquinaria_id`

Al hacer join sobre `planes_accion.maquinaria_id`, **siempre** usar el nombre explícito del FK:

```ts
// ✅ correcto
.select(`maquinaria:maquinarias!planes_accion_maquinaria_id_fkey(...)`)

// ❌ incorrecto — devuelve [] silenciosamente
.select(`maquinaria:maquinarias(...)`)
```

**Por qué:** el FK `planes_accion_maquinaria_id_fkey` está referenciado por 3 relaciones (tabla `maquinarias` + views `view_valoraciones_compras` + `view_valoraciones_ventas`). Sin el FK explícito, Supabase rechaza por ambigüedad y `error` queda en `{}` (silencioso). El patrón aplica a cualquier columna cuyo FK target tenga views encima.

**Defensa:** **siempre logear `error`** en queries nuevas:
```ts
const { data, error } = await query
if (error) {
    console.error('[nombreQuery] error:', error)
    return []
}
```

### Joins de Supabase devuelven arrays en los types, objetos en runtime

Para relaciones many-to-one (el caso típico), Supabase JS devuelve un objeto en runtime pero el type generado lo tipa como array. Casting directo falla:

```ts
// ❌ error 2352 "neither type sufficiently overlaps"
return data as PlanAccion[]

// ✅ funciona en runtime + tsc
return (data || []) as unknown as PlanAccion[]
```

Y accederlo defensivamente: `row.maquinaria?.nombre` (no `row.maquinaria.nombre`).

### `getTareas` tenía un join roto (corregido 2026-04-18)

El select previo era `asignaciones:asignaciones(*)` — el alias apuntaba a una FK llamada `asignaciones` que no existe. La tabla real es `tareas_recursos`. Silenciosamente devolvía `tarea.asignaciones = []`. Resuelto en `lib/actions/planificacion.ts` con `asignaciones:tareas_recursos(*)`.

**Lección:** el patrón Supabase es `alias:FK_name(cols)`. El `FK_name` es el nombre de la FK real o el nombre de la tabla cuando hay una sola relación. Verificar contra `types/supabase.ts` si la query parece "retornar vacío sin errores".

### `profiles` no tiene `avatar_url` ni `full_name`

Columnas reales: `first_name`, `last_name`, `email`, `doc_number`, `phone`, `birthday`, `direccion`, `contacto_emergencia_*`, `pin`, `role`, `tenant_id`, `is_active`.

- **Label:** `[first_name, last_name].filter(Boolean).join(' ') || email || 'Sin nombre'`
- **Avatar:** solo iniciales (2 chars desde first+last, fallback a email[0]).

Helpers estándar ya existen en [components/planes/planes-columns.tsx](components/planes/planes-columns.tsx) (`profileLabel`, `profileInitials`) — reusar.

### Enum `maquinaria_propietario`: `'propio' | 'tercero'`

Ventas = `'propio'`, Compras = `'tercero'`. Cualquier view nueva relacionada con reportes/valorizaciones debe filtrar con `INNER JOIN maquinarias m ON r.maquinaria_id = m.id AND m.propietario = '...'`.

### `getSupabaseContext()` canónico en `lib/action-context.ts`

**Nunca** duplicar este helper localmente en un action file. El canónico retorna `{ adminClient, tenantId, user }` y usa `service_role` (bypassa RLS). Cualquier copia local que use `createClient` bajo RLS crea divergencia de permisos entre actions. El duplicado en `lib/actions/reportes.ts` fue eliminado en 2026-04-17.

**Patrón para actions:**
```ts
import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'

export async function miAction(...) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }
    // ...
    safeRevalidatePath('/mi-path')  // respeta VERIFICATION_MODE
}
```

### Bucket para evidencias de planes de acción

Se reutiliza `reporta-maquinaria-fotos` (no hay bucket dedicado). Path: `planes-accion/{tenant_id}/{plan_id}/{timestamp}.{ext}`. Constante en [lib/actions/planes.ts](lib/actions/planes.ts) (`EVIDENCIA_BUCKET`) — cambiar si se crea un bucket separado en el futuro.

### Migrations: se aplican vía SQL Editor, no `supabase db push`

El proyecto **no** usa `supabase db push`. Para aplicar una migration:

1. Crear archivo en `supabase/migrations/YYYYMMDDHHMMSS_*.sql` (versionado).
2. Copiar contenido y pegar en Supabase dashboard → SQL Editor → Run.
3. Confirmar visualmente "Success."

El schema dump canónico vive en `types/supabase.ts` (regenerar con el comando documentado en §14).

### Errores pre-existentes conocidos en el repo

- [scripts/migrate-cotizaciones-draft.ts:252-253](scripts/migrate-cotizaciones-draft.ts#L252-L253) — errores TS1128 de sintaxis desde el commit inicial. No bloqueantes, script no se usa.
- Varios `prevState: any` en action signatures (cotizaciones, terceros, tareas, auth) — patrón de React useFormState que requiere refactor con `ActionState` tipado. Pendiente §3.3.

---

## 16. Historial de Cambios Técnicos

### v3.5.2 — 2026-04-23 (Pre-UAT hardening: `next build` prod limpio + embeds PostgREST)

Sesión de verificación dev-env exhaustiva el jueves pre-UAT. Arrancó con diagnóstico paralelo (typecheck, smoke `check-imagenes-cotizaciones`, E2E 07+08) y expuso que `next build` prod — que nadie había corrido en esta pasada — fallaba con cadena de errores de tipo y prerender que no aparecían en `tsc --noEmit` aislado. Queda verde para el cutover: 32/32 E2E ✅, `tsc --noEmit` limpio, `next build` OK, 57 rutas server-rendered-on-demand.

**Commits del día** (ordenados):

| Commit | Scope |
|---|---|
| `efc60c5` | `test(e2e)`: fix strict-mode locators en spec 08 (selector de plantilla + header agenda matcheaban varios elementos → `getByRole` preciso). |
| `566b98e` | `fix(build+embeds)`: resuelve cadena de errores de `next build` + embeds PostgREST ambiguos. 16 archivos. |

**Build errors resueltos en `566b98e`:**

- **Dead code eliminado** (rompía validator y/o tipo):
  - `app/(dashboard)/terceros/create/page.tsx` — archivo vacío (0 bytes), sin referencias. El navegar real usa `/terceros/new`.
  - `components/cotizaciones/cotizacion-pdf-config-form.tsx` — componente huérfano con campo `facturacion` inexistente en el tipo `CotizacionPDFConfig` actual.
- **Static prerender → dynamic**: `app/(dashboard)/layout.tsx` ahora exporta `dynamic = 'force-dynamic'`. Las páginas del dashboard usan cookies por tenant auth (`getSupabaseContext`), no pueden renderizarse estáticamente en Next 16. Antes el error era `DYNAMIC_SERVER_USAGE` durante `generateStaticParams`.
- **`useSearchParams` Suspense boundary**: `/planificacion` necesita `<Suspense>` wrap para que Next 16 no falle prerendering (`missing-suspense-with-csr-bailout`). Se separó `PlanificacionPage` en wrapper + `PlanificacionPageInner`.
- **`tsconfig.json` exclude `scripts/`**: los scripts one-shot (tsx) tenían errores de tipo dormidos que se compilaban dentro del build de Next. Ahora scripts siguen ejecutándose con `npx tsx` pero no entran al build.
- **Coerce null→undefined en `defaultValue`** de 7 inputs en `components/cotizaciones/servicio-form.tsx` (`servicio?.toneladas`, `precio_1/2/3_valor`, `precio_1/2/3_campo_adicional`). `React.HTMLInputElement.defaultValue` no acepta `null`.
- **`Buffer` → `Uint8Array`** al construir `Blob` en `app/api/pdf/generate-docx/route.ts`. Con `strict: true` de TS, `Buffer<ArrayBufferLike>` no es asignable a `BlobPart` porque `SharedArrayBuffer` no tiene ciertos métodos nuevos.
- **Zod `.issues` reemplaza `.errors`** en `lib/actions/auth.ts` (API breaking en zod v4 que ya está en `package.json`).
- **Null-guards**: `lib/actions/users.ts` (`supabaseAdmin` puede ser null al montar), `tests/helpers/supabase-admin.ts` (tighten guard en user id).

**Embeds PostgREST resueltos:**

- **PGRST201 activo en `/formatos`**: `lib/actions/formatos.ts#getFormatos` tenía embed ambiguo `formatos↔formatos_versiones` (hay 2 FKs: `formatos_versiones.formato_id` y `formatos.version_actual_id`). Se disambigua con `!formatos_versiones_formato_id_fkey` y `!formatos_version_actual_fkey`.
- **PGRST200 latente**: `getFormatos` también intentaba embed directo `formatos↔formatos_informes` que no existe (informes linkean a formatos via `version_id → formatos_versiones`). Ahora contamos informes via join anidado por versiones.
- **`version_actual` shape normalization**: Supabase types marcan los joins to-one como `[...][]`. Se agregó `Array.isArray ? [0] : v` en `getFormatos`, `getFormatoById`, `getPlantillasPublicadas`, y `startInforme` de `formatos-informes.ts`.
- **Cast via `unknown`** en `app/api/informes/[id]/pdf/route.ts` y `components/informes/informe-read-view.tsx` para los shapes de Supabase join donde el runtime es más estrecho que el tipo inferido.
- **`maquinarias/documentos`**: `DocGlobal` exportado desde client-page y casteado en page.tsx (el retorno de `getGlobalDocuments` y el shape esperado por el cliente no coincidían exactamente).

**Resultado:**

```bash
npx tsc --noEmit                 # → 0 errores
npx next build                   # → OK (57 rutas, todas ƒ dynamic)
npm run test:e2e                 # → 32/32 passed (2.9 min)
```

### v3.5.1 — 2026-04-21 noche (Runbook deploy Vercel + .env.example + plan semana)

- Decisión infra: **Vercel Pro** para app server (no Cloudflare Pages — Next 16 adapter todavía fricciona con Gotenberg CPU limit, crons separados, Server Actions streaming). DNS queda en **Cloudflare**, **Resend** para emails, Supabase sin cambios.
- [DEPLOYMENT.md](DEPLOYMENT.md) — runbook paso-a-paso (pre-requisitos, DNS, Resend, import Vercel, env vars, cron jobs, smoke, rollback).
- `.env.example` y `.env.local.example` actualizados con `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.
- Plan de semana redactado (Mar–Vie config+smoke+handoff UAT, Sáb–Vie UAT, Sáb 05-02 cutover).

### v3.5.0 — 2026-04-21 noche (Fase H Formatos WEB 8/8 + J/K/L + O parcial)

Sesión marathon de 8 fases en una pasada. Cerró el módulo de **Formatos WEB** completo (seed CISE+GRUAS, admin CRUD, editor Google-Forms-like, publish/clone, llenado web con firma+PIN, listado con aprobación, PDF output vía Gotenberg). Shippeó **Resend + EPP emails** (Fase J), **reporte semanal EPP con cron Vercel** (Fase K), **tests E2E smoke** (Fase L), y **agenda admin** (`/admin/agenda`, Fase O parcial — portal cliente diferido post-cutover).

**Decisiones confirmadas (no re-negociar):**

- Tablas `formatos_*` (NO `checklist_*`).
- 2 plantillas seed: CISE `INF-10676 V.03` (52 preguntas) + GRUAS `INF-3458 V.03` (31 preguntas).
- Editor UX: Google Forms-like (lista + ↑↓), no drag&drop.
- PDF output obligatorio pre-cutover: ✓ en `/api/informes/[id]/pdf`.
- Correlativo atómico de informes: `INF-{codigo_formato}-{año}-{6_digits}` asignado por trigger DB.
- Firma canvas → base64 PNG → bucket `formatos` con service role. PIN contra `profiles.pin` (INT).
- Versión publicada inmutable por triggers (`formatos_prevent_published_edit`, `formatos_prevent_question_edit_if_published`). Clone-on-edit obligatorio.
- Portal cliente `/portal/[token]` diferido post-cutover (requiere rol `cliente_externo` — scope creep).

**Hallazgos técnicos reutilizables:**

- Radix `Select` no admite `value=""` — usar centinela `'__all__'`.
- `canvas.toDataURL('image/png')` → regex parse `^data:(.+);base64,(.+)$` + hash SHA-256 del buffer como `firma_hash`.
- `formatos_preguntas` delete-reinsert en BORRADOR funciona porque el trigger solo bloquea versiones PUBLICADA; cascade DELETE de opciones es automático por FK.
- Path convention bucket `formatos`: `{tenant_id}/{informe_id}/{pregunta_id}/{timestamp}_{filename}` (fotos); `{tenant_id}/{informe_id}/firma_{ts}.png` (firmas); `{tenant_id}/{informe_id}/pdf/{codigo}.pdf` (output).

### v3.3.0 — 2026-04-20 (Fase D completa + E + F 10/10 + fix cotización 404 + brand guide)

Sesión de consolidación pre-cutover que cerró **Fase D, E y F enteras** (10 sub-fases de F) en 11 commits atómicos. Incluye 3 fixes de bugs pre-existentes descubiertos mientras se probaba la UI. Total: ~62 casos de prueba documentados nuevos en `docs/PLAN-PRUEBAS-PRE-CUTOVER.md` (secciones 2.4–2.7, 5.1–5.6).

**Commits del día** (ordenados):

| Commit | Scope |
|---|---|
| `8c10ab7` | D.4 + D.6 — detalle dialog con metadatos (cliente, contacto, cotización, sitio, prioridad, comentarios) + recursos con nombres legibles y badges interno/externo. Buscador en /planificacion por código/título/cliente/cotización + toggle "Solo cotización aprobada". |
| `ae5947a` | E — `getHistoricalClientQuotes` acepta `cliente_id` opcional (toggle "Solo este cliente" en Paso 3). `finalizarAprobacion` arreglado (código T-YYYY-XXXX consecutivo, estado 'BORRADOR' válido, persiste `cotizaciones.tarea_id`). Card verde "Tarea generada" en Paso 5 con CTA "Ver tarea" → deep-link a /planificacion?tarea=<id> (auto-abre detail dialog). |
| `7496b75` | `Promise.allSettled` en `TareaDetailDialog.loadDetails` para tolerancia a fallas parciales. Flow 6 Playwright actualizado (filter por "Información General"). Tests 5/5 ✅. Plan de pruebas D documentado. |
| `b2f669c` | `docs/BRAND-GUIDE.md` — prompt autocontenido de identidad visual (paleta naranja #EA580C/#F97316, Geist Sans/Mono, tokens shadcn, patrones UI, idioma es-latino/tú, anti-patrones). Reutilizable para otras sesiones de IA o dev externo. |
| `569c660` | F.1 + F.2 — Dialog "Valorizar Venta" bulk con código `YYYY-NNNNN` consecutivo por tenant, preview con subtotal/IGV/detracción desde `config_valorizacion_venta`, validaciones (mismo cliente + moneda). Endpoint `GET /api/valorizaciones/[codigo]/pdf` renderiza `lib/valorizacion-venta-pdf-template.ts` vía Gotenberg. |
| `d7bccac` | Fix `/cotizaciones/[id]` 404: embed `actividad_details:actividades_matriz(...)` en `getCotizacionById` buscaba FK inexistente (`cotizaciones_matriz_responsabilidad` solo tiene FK a `cotizaciones` y `companies`). Fix `saveMatrizResponsabilidad`: persiste `descripcion` (estaba `// REMOVED`) y elimina `actividad_id` inexistente. Placeholders visibles en preview cuando faltan `imagen_banco`/`imagen_firma` en `cotizaciones_configuracion`. Fix permanente de Turbopack root: `turbopack.root: path.resolve(__dirname)` en `next.config.ts` (evita el error `Can't resolve 'tailwindcss' in 'c:\Proyectos'` cuando Next asciende buscando workspace root). |
| `1baadea` | F.3 — Menú masivo en `/ventas/valoraciones`: Valorizar (solo PENDIENTE), PDF Valorización (1 código único), Deshacer Valorización (AlertDialog rojo con guardas de estado y facturación), Facturar stub. Hints visibles a la derecha ("solo PENDIENTE", "1 valorización", "facturada") en items deshabilitados. |
| `cd7159d` | F.4 + F.5 — `/ventas/facturas` funcional con 3 KPIs (facturado/cobrado/pendiente USD), toolbar con búsqueda + filtros de estado (ALL/PENDIENTE/PARCIAL/PAGADA/VENCIDA), 13 columnas, acciones por fila (Ver, Editar, PDF cliente, PDF Valorización). Dialog Ver/Editar con secciones Datos/Montos/Detracción, modo edición togglable. Server actions: `getFacturasVentaData`, `getFacturaVentaById`, `updateFacturaVenta`. |
| `f5422c7` | F.6 + F.7 + F.8 — Cobros parciales (NuevoCobroDialog: tipo, monto+moneda, fecha, banco, comentarios; tabla embebida con anulación soft; recálculo automático de `monto_pagado_factura`/`pendiente_por_cobrar_*`/`estado_pago`). Registro de detracción (DetraccionDialog: %, monto S/, a cargo de, N° constancia, fecha). Deshacer factura (AlertDialog rojo + cascade: `esta_activa=false`, cobros soft-deleted, reportes a VALORADO). Server actions: `getBancosActivos`, `getCobrosByFactura`, `registrarCobroVenta`, `deshacerCobroVenta`, `registrarDetraccion`, `deshacerFacturaVenta`. |
| `2f42aa5` | F.9 + F.10 — Menú ⋮ individual por fila en `/ventas/valoraciones` (`ValoracionRowActions`): Copiar ID, Ver PDF reporte, Precio por Día (stub post-cutover), Deshabilitar informe (con guardas `deshabilitarReporteMaquinaria` que aborta si valorizado/facturado). Matriz de 11 escenarios cross-module consistency documentada en plan de pruebas 5.6.2. |
| `0bcac91` | Fix `/settings/cotizaciones`: `saveGlobalPDFConfig` intentaba persistir `texto_aceptacion` pero la tabla `cotizaciones_configuracion` no tiene esa columna (solo `pie_pagina`). Bloqueaba el submit entero con PGRST "column not found" aunque el usuario solo estuviera subiendo imágenes. Mapeo al save: `texto_aceptacion → pie_pagina` (consistente con la lectura del form, línea 76). |

**Alcance diferido post-cutover:**
- Upload real de PDF de factura al bucket Supabase Storage (hoy solo URL manual).
- Crear factura nueva desde dropdown de valoraciones — requiere workaround del `facturas_venta.bubble_id NOT NULL` legacy (columna heredada de la migración Bubble).
- Informe de Movilización virtual (F.9 extended).
- Override real del precio unitario por día (requiere nueva columna en `reportes_maquinaria`).

**Deuda técnica visible** (no bloquea cutover):
- Error pre-existente `column profiles_1.full_name does not exist` en `getInspeccionesByTarea` — mitigado con `Promise.allSettled` pero el embed sigue mal. Fix real: actualizar el embed para no referenciar la columna inválida.
- `<img>` en lugar de `next/image` en preview de cotización + facturas: intencional (Gotenberg no procesa `<Image>` de Next), el warning del linter se ignora.

### v3.1.22 — 2026-04-18 (Mapeo real Bubble → tareas completo: fechas, recursos, horas, sitio, contacto)

- **Contexto.** v3.1.21 cerró el modelo 3-tablas pero dejó las 13,738 tareas migradas sin intervalos ni recursos (solo header). Los campos Bubble `fecha_rango-2024`, `fechas_listado`, `lista_personal`, `lista_maquinaria`, `id_sitio-2025`, `id_contacto_cliente`, `Hora Inicio/Final--BORRAR-27-08` nunca se habían mapeado. Decisión con el usuario: NO borrar/reemplazar — hacer mapeo real completo (es un SaaS con datos de años de 2 clientes).
- **Migration [20260418180000_tareas_horas_sitio_bubble.sql](supabase/migrations/20260418180000_tareas_horas_sitio_bubble.sql).**
  - `tareas`: add `sitio_id UUID → terceros_sitios(id)`, `hora_inicio TIME`, `hora_fin TIME`. Previamente solo tenía `sitio TEXT` (nunca se populaba) y `contacto_id` (agregado en 20260107120000 pero tampoco se populaba en migración).
  - `tareas_fechas`: add `bubble_id TEXT` + UNIQUE index para upsert idempotente desde el script.
- **Reescrito [scripts/migrate-tareas-mig5.ts](scripts/migrate-tareas-mig5.ts) con mapeo completo.** Tres passes por tenant:
  1. **Header** (upsert on `bubble_id`): agrega `sitio_id` ← `id_sitio-2025`, `contacto_id` ← `id_contacto_cliente`, `hora_inicio` ← parse `Hora Inicio--BORRAR-27-08` (ej. `"07:00 AM"` → `07:00:00`), `hora_fin` ← idem, `descripcion` ← `comentarios`.
  2. **`tareas_fechas`** (upsert on `bubble_id = <tarea>_interval`): 1 intervalo por tarea según `Fecha Tipo-2024`:
     - `"Rango de fechas"` → `fecha_inicio`/`fecha_fin` desde `fecha_rango-2024[0..1]`.
     - `"Fecha(s) específica(s)"` → `fechas_multiples` desde `fechas_listado`.
     - **Fallbacks para inconsistencias Bubble** (tipo declarado sin datos asociados, o viceversa): se prefiere el campo que realmente tiene datos.
     - **Lista de 1 fecha** → normalizada a rango `fecha_inicio=fecha_fin=X` (forma canónica de "tarea de 1 día").
  3. **`tareas_recursos`** (delete+insert por tenant — no hay data de UI en prod aún): 1 row por bubble_id en `lista_personal[]` (→ `profiles` vía `user._id`) y `lista_maquinaria[]` (→ `maquinarias`), con `tarea_fecha_id` apuntando al intervalo único.
- **Resultado del run completo** (idempotente — probado con 2 pasadas seguidas en `--limit=50`):
  - **CISE**: 4,798 headers / 4,321 intervalos / 11,976 recursos. 477 sin fecha (tareas padre, sin fecha data, etc).
  - **GRUAS**: 8,940 headers / 8,783 intervalos / 22,744 recursos. 157 sin fecha.
  - **Total: 13,738 tareas / 13,104 intervalos / 34,720 recursos.** FK misses totales: 9 (orfandades aceptables: 1 cotización + 6 cot-items + 2 personal que no existen en Supabase).
- **Decisiones tomadas con el usuario.**
  - Fuente de horas: los campos `Hora Inicio/Final--BORRAR-27-08` (TEXT "HH:MM AM/PM"), NO los IDs `id_hora_inicio-NUEVO-27-08`/`id_hora_final_NUEVA-27-08` que referencian `app_horaintervalos` (49 filas). Los nombres de los campos están correctos (no hay inversión).
  - Lista de 1 fecha → rango(X, X), no `fechas_multiples=[X]` — forma canónica consistente.
  - Recursos delete+reinsert por tenant (simple, no hay data UI aún).

### v3.1.21 — 2026-04-18 (Modelo planificación 3 tablas + E2E tests Flow 2/3 + editar fechas UI)

- **Rediseño modelo de Planificación (3 tablas).** Hasta v3.1.20 el código de `createTarea` insertaba `fecha_inicio/fecha_fin/fechas_multiples` directo en `tareas`, pero esas columnas **no existían en DB** (había solo `fecha_vencimiento` legacy). `tareas_fechas` existía pero estaba huérfana (0 lecturas/escrituras). Decisión con el usuario: header-sin-fechas, intervalos en `tareas_fechas`, recursos en `tareas_recursos` vinculados al intervalo.
  - Migration [20260418170000_tareas_modelo_3_tablas.sql](supabase/migrations/20260418170000_tareas_modelo_3_tablas.sql):
    - `tareas`: `DROP fecha_vencimiento` (legacy).
    - `tareas_fechas`: drop `fecha`/`assigned_by` (single-day); add `fecha_inicio DATE`, `fecha_fin DATE`, `fechas_multiples DATE[]`, `notas TEXT`, `is_active`, `updated_at`. CHECK constraint: al menos uno de los dos modos (consecutivo vs salteado) tiene que estar presente; si consecutivo, `fecha_fin >= fecha_inicio`.
    - `tareas_recursos`: add `tarea_fecha_id UUID → tareas_fechas(id) ON DELETE CASCADE`; drop `fecha_asignada` (implícita en el intervalo). `tarea_id` se mantiene denormalizado para filtros rápidos.
  - Una tarea de un mes con el mismo recurso es **1 fila** en cada tabla (antes hubiera requerido 30). Si un recurso distinto trabaja otra semana, se crea otra fila de `tareas_fechas` y se le asignan sus recursos allí.
- **Refactor [lib/actions/planificacion.ts](lib/actions/planificacion.ts) al nuevo modelo.**
  - `createTarea(payload: CreateTareaPayload)` — acepta `{ header, intervalos: [{ fecha_inicio, fecha_fin, fechas_multiples, recursos[] }] }`. Inserta header + N intervalos + M recursos por intervalo con rollback best-effort (CASCADE limpia en cascada).
  - `getTareas(startDate?, endDate?)` — filtro por overlap sobre intervalos (step-1: buscar `tareas_fechas` cuyo rango cruce; step-2: traer esas `tareas` con fechas + recursos joined).
  - `getAvailability(startDate, endDate)` — expande cada intervalo a días individuales (consecutive → loop entre fecha_inicio..fecha_fin; salteado → intersección con rango) del lado del servidor para que el timeline client-side no tenga que reinterpretar `fechas_multiples`.
  - `updateTareaIntervals(tareaId, intervalos)` — **nuevo.** Estrategia replace-all: borra todos los intervalos (CASCADE limpia recursos) y crea los nuevos. Simple y consistente — evita diffs granulares para v1.
  - `getTareaById(id)` — **nuevo.** Trae tarea con `fechas:tareas_fechas(*, recursos:tareas_recursos(*))`. Usado por el dialog de edición.
- **UI edición de fechas — nueva.**
  - [components/planificacion/editar-fechas-dialog.tsx](components/planificacion/editar-fechas-dialog.tsx) — dialog con calendario multi-select + notas, carga primer intervalo, auto-detecta consecutivas vs salteadas al guardar, preserva recursos del intervalo original. Warning visible si la tarea tiene >1 intervalo (se colapsan a 1).
  - [components/planificacion/planificacion-table.tsx](components/planificacion/planificacion-table.tsx) — columna "Fechas" nueva que muestra resumen (`"15 — 17 abr"` consecutivo / `"N días"` salteado / `"N intervalos"` si múltiples). Columna "Acciones" con botón "Editar fechas". Callback `onEditFechas` pasado via TanStack Table `meta`.
  - [app/(dashboard)/planificacion/page.tsx](app/(dashboard)/planificacion/page.tsx) — monta `EditarFechasDialog`, `reloadKey` en el `useEffect` para refetch después de guardar.
  - [components/planificacion/nueva-tarea-wizard.tsx](components/planificacion/nueva-tarea-wizard.tsx) y [nueva-tarea-form.tsx](components/planificacion/nueva-tarea-form.tsx) — refactorizados para mandar el nuevo payload `{ header, intervalos }`. Forma simple agrupa recursos por date-signature → 1 intervalo por firma única de fechas.
- **Tests E2E críticos — Flows 2 y 3.**
  - [tests/flows/02-tarea-con-recursos.spec.ts](tests/flows/02-tarea-con-recursos.spec.ts) — crea tarea + 1 intervalo consecutivo de 3 días + 2 personal + 1 maquinaria vía API; verifica listado, timeline Personal, timeline Maquinaria en UI.
  - [tests/flows/03-editar-fechas-tarea.spec.ts](tests/flows/03-editar-fechas-tarea.spec.ts) — crea tarea consecutiva, llama `updateTareaIntervals` equivalente con service_role para cambiar a fechas no consecutivas, verifica: (1) intervalos DB con `fechas_multiples` correctas, (2) recurso preservado apuntando al intervalo nuevo, (3) listado UI muestra "3 días".
  - [tests/helpers/data-factory.ts](tests/helpers/data-factory.ts) — patrón tracker: `newTracker()` + `ensurePersonal` / `ensureMaquinaria` / `createTarea` (header) / `addIntervalo` / `assignResource` / `cleanupTestData`. Orden de cleanup respeta FKs. `ensurePersonal` idempotente con reconciliación de leftover de auth.users huérfano (paginado de listUsers).
  - [tests/pages/planificacion.page.ts](tests/pages/planificacion.page.ts) — Page Object. `switchToList/Personal/Maquinaria` scopean a `<main>` para desambiguar del sidebar.
  - Smoke 18/18 verde después del refactor.
- **Deudas conocidas (para próxima iteración).**
  - `tareas` no tiene `tipo_tarea`, `cotizacion_ref`, `servicio_ref` aunque el UI los expone. Silenciados en el server action y el data-factory. Decisión pendiente: ¿migrar `tipo_tarea`? ¿Tirar los `_ref` si ya hay FKs?
  - Scripts Bubble→Supabase NO mapean fechas a `tareas_fechas`. Las 13,738 tareas migradas quedan sin intervalos. Habría que reabrir `scripts/migrate-tareas-*.ts`.
  - `EditarFechasDialog` v1 colapsa múltiples intervalos a uno. Para editar N intervalos individualmente falta tabs o editor por intervalo.
  - `SUPABASE_ACCESS_TOKEN` expuesto en `.env.local` — funciona el regen, pero el shell no lo exporta automáticamente. Patrón documentado: `export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d '=' -f2-)`.

### v3.1.20 — 2026-04-18 (Cleanup pre-cutover: timeline, getTareas fix, console.log, DROP servicios_tipos, 3 commits)

- **Timeline planificación (2.5) cerrada.** Las vistas "Personal" y "Maquinaria" en `/planificacion` mostraban "Próximamente..." aunque `ResourceTimeline` y `getAvailability()` estaban implementados. Cableado correcto en [app/(dashboard)/planificacion/page.tsx](app/(dashboard)/planificacion/page.tsx): cada toggle pasa `assignments.filter(a => a.tipo === ...)` + recursos correspondientes al componente. Reload de `getAvailability(startIso, endIso)` en paralelo con `getTareas` cuando cambia la semana.
- **§3.4 Bug `getTareas` join roto — corregido.** [lib/actions/planificacion.ts:17](lib/actions/planificacion.ts#L17) tenía `asignaciones:asignaciones(*)` — alias a FK inexistente. Supabase devolvía `tarea.asignaciones = []` silenciosamente en todas las tareas. Fix: `asignaciones:tareas_recursos(*)`. No afectaba los timelines (usan `getAvailability` que sí estaba bien), sí afectaba potencialmente a consumers de `tarea.asignaciones` desde UI de listado. Documentado en §15 como gotcha.
- **§3.2 Cleanup parcial de `console.log`.** Eliminados 7 `console.log` de debug en acciones de producción: [lib/actions/ventas.ts](lib/actions/ventas.ts) (×2), [lib/actions/maquinaria-models.ts](lib/actions/maquinaria-models.ts) (×2), [lib/actions/users.ts](lib/actions/users.ts), [lib/actions/update-user.ts](lib/actions/update-user.ts), [lib/actions/create-user.ts](lib/actions/create-user.ts). Los `console.error` en paths de error legítimos se mantienen (son logging intencional, no debug).
- **`DROP TABLE servicios_tipos` aplicado.** Migration [20260417210000_drop_servicios_tipos_obsolete.sql](supabase/migrations/20260417210000_drop_servicios_tipos_obsolete.sql) versionada y aplicada vía SQL Editor. Tabla obsoleta (0 filas, plural; la activa es `servicios_tipo` singular) eliminada.
- **Historia git organizada.** Con el commit inicial `4c9e837` siendo la única referencia en el repo (ImpulsarNext), se organizó el trabajo acumulado en 3 commits nuevos:
  - `e4fed4f` — `chore: baseline pre-2026-04-17` (158 archivos): todas las migrations SQL de Bubble→Supabase, scripts de orchestrator/auditoría/fixes, server actions, UI, docs de migración.
  - `408e30b` — `feat: fase 2 pre-cutover` (26 archivos): Planes de Acción Fase 1 (listado + panel + detalle + cerrar), timeline planificación, views ventas panel, fix `getSupabaseContext` duplicado, regen types, migrations de hoy, updates de docs.
  - `1da649d` — `chore: marcar acciones manuales hechas`: DROP + nota sobre backup automático.
- **Snapshot pre-cutover.** Plan actual de Supabase no permite backups físicos manuales. Confirmado con el usuario que el backup automático diario (< 24 h antes del cutover) cumple la necesidad de red de seguridad. Actualizado el texto en TAREAS_PRIORIZADAS.md.
- **§15 Patrones técnicos y gotchas Supabase — nueva sección.** Documentados los hallazgos del día como referencia permanente: FK ambiguo en `planes_accion.maquinaria_id`, casting through `unknown` en joins, patrón de alias Supabase, fields reales de `profiles` (no `avatar_url`/`full_name`), enum `maquinaria_propietario`, canonical `getSupabaseContext`, bucket de evidencias, convención de aplicar migrations vía SQL Editor, errores pre-existentes conocidos.
- **§6 Variables de entorno — extendida.** Agregado `SUPABASE_ACCESS_TOKEN` (dev-time, CLI) + sub-sección "Datos fijos no secretos" con project-id Supabase, tenant IDs, buckets activos.

### v3.1.19 — 2026-04-17 (Fase 2 pre-cutover: 2.4 + B.1 + 2.7 Fase 1 + fix views ventas)

- **2.7 Planes de Acción Fase 1 — cerrada.** UI solo-lectura + cierre para los 386 planes migrados, sobre el schema de Fase 0 (N:N responsables, `pregunta_ref` JSONB, `lista_fotos` JSONB, `maquinaria_id` directo).
  - **Código previo inválido:** la implementación inicial en [lib/actions/planes.ts](lib/actions/planes.ts) y [components/planes/](components/planes/) era pre-Fase 0 — joins rotos (`maquinaria:inspecciones(maquinaria:maquinarias(...))` con alias repetido, `inspeccion_id` NULL en 100% de migrados), `responsable_id` single en vez de tabla N:N, `PlanAccion` type desalineado con schema real. Se reescribió todo.
  - **Bug encontrado durante debugging:** el FK `planes_accion_maquinaria_id_fkey` tiene 3 referencias en Supabase (tabla `maquinarias` + views `view_valoraciones_compras` y `view_valoraciones_ventas`). Supabase rechazaba la query por ambigüedad y `error` silencioso devolvía `[]`. Fix: `maquinaria:maquinarias!planes_accion_maquinaria_id_fkey(...)` con FK explícito. Misma ambigüedad resuelta en `getPlanAccionById` y `getPlanesAggregates`.
  - Nuevos archivos:
    - [components/planes/donut-chart.tsx](components/planes/donut-chart.tsx) — SVG puro con `stroke-dasharray`, sin dep de recharts.
    - [components/planes/bar-list.tsx](components/planes/bar-list.tsx) — barras CSS puro.
    - [components/planes/close-plan-dialog.tsx](components/planes/close-plan-dialog.tsx) — dialog de cierre con upload opcional.
    - [app/(dashboard)/planes-accion/panel/page.tsx](app/(dashboard)/planes-accion/panel/page.tsx) — 5 stat cards (incluye "vencidos") + 2 donuts (estado/prioridad) + 2 barras (top 10 maquinarias / preguntas).
    - [app/(dashboard)/planes-accion/[id]/page.tsx](app/(dashboard)/planes-accion/[id]/page.tsx) — detalle con contexto lateral, galería de `lista_fotos`, historial de `planes_accion_avances`.
  - Reescritos: [lib/actions/planes.ts](lib/actions/planes.ts) (+`getPlanAccionById`, +`getPlanAvances`, +`getPlanesAggregates`, +`closePlanAccion`, stats con `count({head:true})` en 5 queries paralelas), [types/formatos.ts](types/formatos.ts) (`PlanAccion` al schema real + `PlanAccionResponsable`, `PlanAccionAvance`, `PreguntaRef`), [components/planes/planes-columns.tsx](components/planes/planes-columns.tsx) (avatares stacked con tooltip, fecha_límite vencida en rojo, cascada de fallbacks para título), [components/planes/planes-stats.tsx](components/planes/planes-stats.tsx) (5 cards con `vencidos`).
  - Sidebar: entry "Planes de Acción" con `AlertTriangle` icon, children `Panel` / `Listado`.
  - Evidencia de cierre: bucket reutilizado `reporta-maquinaria-fotos` (path `planes-accion/{tenant_id}/{plan_id}/{timestamp}.{ext}`). Si más adelante se prefiere un bucket dedicado, crear `planes-accion-evidencias` y cambiar `EVIDENCIA_BUCKET` en [lib/actions/planes.ts](lib/actions/planes.ts).
- **Fix views ventas panel — cerrado.** Bug pre-existente desde el commit inicial (4c9e837): [lib/actions/ventas.ts](lib/actions/ventas.ts) lee de `view_ventas_pendiente_valorizar` y `view_ventas_pendientes_facturar`, y una migration previa (`20260201060000_grant_panel_views.sql`) granteó privilegios sobre ellas — pero las views nunca se crearon. `getPanelVentasData()` devolvía silenciosamente `emptyData()` en cada call. Al revisar `/ventas/panel` durante la QA de Planes de Acción apareció el `console.error` con objeto vacío `{}` (Supabase devuelve "relation does not exist" sin detalle).
  - Migration [supabase/migrations/20260417200000_create_view_ventas_panel.sql](supabase/migrations/20260417200000_create_view_ventas_panel.sql) crea ambas views como mirror de `view_compras_pendiente_valorizar` / `view_compras_pendientes_facturar`, flipped en: `m.propietario = 'propio'` (vs `'tercero'`), campos `valorizacion_venta` / `factura_venta_item`, y agregación por `tareas.cliente_id → terceros` en vez de proveedor.
  - Aplicada vía SQL Editor del dashboard.
- **2.4 `getSupabaseContext` duplicado — cerrada.** [lib/actions/reportes.ts](lib/actions/reportes.ts) mantenía una copia local de `getSupabaseContext()` (28 líneas) que usaba `createClient` (RLS-bound) en lugar del `adminClient` canónico de [lib/action-context.ts](lib/action-context.ts). Consecuencia: el path de creación de `tareas_recursos` / `reportes_personal` / `reportes_maquinaria` / `reportes_combustible` dependía de RLS del usuario, divergente del resto de los 17 action files.
  - Eliminada la función local; import ahora desde `@/lib/action-context`.
  - Renombrado `supabase` → `adminClient` (8 destructuraciones).
  - `revalidatePath` → `safeRevalidatePath` (2 ocurrencias) — respeta `VERIFICATION_MODE` como el resto del codebase.
  - 0 referencias residuales a la firma vieja. No hay callers externos que dependan del shape antiguo (la función era `async function` privada del módulo).
- **B.1 `types/supabase.ts` regenerado — cerrada.** Archivo estaba vacío (0 líneas) desde que se agregaron columnas en Fase 0 (Planes de Acción) e Inspecciones. Resuelto con Personal Access Token en `SUPABASE_ACCESS_TOKEN` del `.env.local`.
  - Comando: `npx supabase gen types typescript --project-id wioozisskjjgjjybsoqo > types/supabase.ts`.
  - Resultado: **6556 líneas, 215 KB**. Todas las 45+ tablas presentes (cotizaciones, terceros, profiles, inspecciones, planes_accion, plantillas, maquinarias, tareas, reportes_maquinaria, etc.).
  - `tsc --noEmit`: **0 regresiones**. Los únicos 2 errores residuales son TS1128 de sintaxis en [scripts/migrate-cotizaciones-draft.ts:252-253](scripts/migrate-cotizaciones-draft.ts#L252-L253) — pre-existentes desde el commit inicial (4c9e837), no relacionados con types.
  - Desbloquea §3.3 (reemplazo de `any` por tipos reales en cotizaciones/terceros/auth) — tarea de deuda técnica, no bloqueante para cutover.

- **2.4 `getSupabaseContext` duplicado — cerrada.** [lib/actions/reportes.ts](lib/actions/reportes.ts) mantenía una copia local de `getSupabaseContext()` (28 líneas) que usaba `createClient` (RLS-bound) en lugar del `adminClient` canónico de [lib/action-context.ts](lib/action-context.ts). Consecuencia: el path de creación de `tareas_recursos` / `reportes_personal` / `reportes_maquinaria` / `reportes_combustible` dependía de RLS del usuario, divergente del resto de los 17 action files.
  - Eliminada la función local; import ahora desde `@/lib/action-context`.
  - Renombrado `supabase` → `adminClient` (8 destructuraciones).
  - `revalidatePath` → `safeRevalidatePath` (2 ocurrencias) — respeta `VERIFICATION_MODE` como el resto del codebase.
  - 0 referencias residuales a la firma vieja. No hay callers externos que dependan del shape antiguo (la función era `async function` privada del módulo).
- **B.1 `types/supabase.ts` regenerado — cerrada.** Archivo estaba vacío (0 líneas) desde que se agregaron columnas en Fase 0 (Planes de Acción) e Inspecciones. Resuelto con Personal Access Token en `SUPABASE_ACCESS_TOKEN` del `.env.local`.
  - Comando: `npx supabase gen types typescript --project-id wioozisskjjgjjybsoqo > types/supabase.ts`.
  - Resultado: **6556 líneas, 215 KB**. Todas las 45+ tablas presentes (cotizaciones, terceros, profiles, inspecciones, planes_accion, plantillas, maquinarias, tareas, reportes_maquinaria, etc.).
  - `tsc --noEmit`: **0 regresiones**. Los únicos 2 errores residuales son TS1128 de sintaxis en [scripts/migrate-cotizaciones-draft.ts:252-253](scripts/migrate-cotizaciones-draft.ts#L252-L253) — pre-existentes desde el commit inicial (4c9e837), no relacionados con types.
  - Desbloquea §3.3 (reemplazo de `any` por tipos reales en cotizaciones/terceros/auth) — tarea de deuda técnica, no bloqueante para cutover.

### v3.1.18 — 2026-04-15 (Cross-reference 153 tipos, 10 migraciones nuevas, 19 fases, dress-rehearsal OK)

- **Cross-reference completo de tipos Bubble (153 → Supabase):**
  - 32 tipos migrados (tablas principales + catálogos + inspecciones).
  - 15 activos no migrados: 6 sub-records de formato (embebidos en `plantillas.estructura`), 2 pagos facturas, 1 valorizaciones, 2 logs/historia, 2 extensiones perfil, 1 deprecated.
  - 47 vacíos + 48 sin vínculo tenant + 11 no clasificados = no-aplica.
  - Resultado neto: 3 tablas nuevas identificadas para migrar (B: pagos, C: valorizaciones).
- **Pagos de facturas (Grupo B)** — tablas ya existían desde `20260121_update_finance_schema.sql` pero contenían solo esqueletos (bubble_id + created_at, resto NULL). Columnas duplicadas por iteraciones previas (`id_editor`/`editor_id`/`updated_by`, `factura_id`/`factura_compra_id`). Ninguna UI las consumía.
  - Migration [20260415200000_pagos_valorizaciones.sql](supabase/migrations/20260415200000_pagos_valorizaciones.sql): truncate + drop cols obsoletas + ALTER tipos TEXT→UUID + ADD cols faltantes + UNIQUE `(tenant_id, bubble_id)` + FK constraints + RLS.
  - Script [scripts/migrate-facturas-pagos.ts](scripts/migrate-facturas-pagos.ts): migra ambas tablas. Maneja typo `facturas_comprar_id` y campos con espacios `monto sol`.
  - **Resultado:** 521 `factura_venta_pagos` + 22 `facturas_compra_pagos`, 0 errores, 6 skipped (huérfanos sin factura padre en Bubble).
- **Valorizaciones (Grupo C)** — tabla nueva `valorizaciones`. Bubble `maquinaria_horas-valorizaciones` = resumen de facturación por reporte de horas.
  - Misma migration SQL crea la tabla con FK a `reportes_maquinaria`.
  - Script [scripts/migrate-valorizaciones.ts](scripts/migrate-valorizaciones.ts).
  - **Resultado:** 752 valorizaciones (CISE only, GRUAS no tiene). `reporte_maquinaria_id` NULL en 100% — descubierto que `id_maquinaria_horas` apunta al tipo Bubble `maquinaria_horas` (distinto de `maquinaria_reporte_horas_new`), tipo sin vínculo tenant directo. FK se resolverá post-cutover si se decide migrar `maquinaria_horas`.
- **Profile Detail (Grupo F)** — Bubble `profile_detail2` (114 CISE + 203 GRUAS). Relación 1:1 con profiles via `id_usuario`.
  - Migration [20260415210000_profile_detail_gastos.sql](supabase/migrations/20260415210000_profile_detail_gastos.sql): agrega 5 columnas a `profiles` (birthday, direccion, contacto_emergencia_nombre/celular/parentesco).
  - Script [scripts/migrate-profile-detail2.ts](scripts/migrate-profile-detail2.ts): UPDATE profiles existentes, no INSERT.
  - **Resultado:** 101 profiles actualizados con datos nuevos, 213 skipped (records sin campos útiles), 3 FK miss (id_usuario sin match). `profiles.gender` y `profiles.phone` ya existían — no se sobreescriben.
- **Gastos usuario (Grupo D)** — Bubble `usuario_gastos` (3,277 CISE, 0 GRUAS). Log de gastos diarios por inspección.
  - Misma migration SQL crea `gastos_usuario` con FK a `profiles` e `inspecciones`.
  - Script [scripts/migrate-usuario-gastos.ts](scripts/migrate-usuario-gastos.ts).
  - **Resultado:** 3,277 registros, 0 errores, 0 FK misses.
- **Batch 2 (5 tipos)** — migration [20260415220000_batch2_tables.sql](supabase/migrations/20260415220000_batch2_tables.sql) + script [scripts/migrate-batch-2.ts](scripts/migrate-batch-2.ts).
  - `user_documents`: 626/809 migrados. 25 `document_types` mapeados con bubble_id (14 CISE globales + 11 GRUAS tenant-specific con codes numéricos). 183 docs pendientes con document_type_id no mapeado + 4 sin user_id.
  - `maquinaria_horas`: 1,917 CISE. FK resueltas: maquinaria, tarea, cotizacion_item, inspeccion, cliente — **0 FK misses**. Post-migrate: **752/752 `valorizaciones` linkeadas** via nueva columna `maquinaria_horas_id`. El campo original `reporte_maquinaria_id` (que apuntaba incorrectamente a `reportes_maquinaria`) permanece NULL — deprecar post-cutover.
  - `informe_objetos`: 13,218 (CISE 10,123 + GRUAS 3,095). FKs a `maquinarias` y `terceros`, 0 misses.
  - `cotizaciones_motivo_rechazo`: 505 (504 CISE + 1 GRUAS). Tenant field era `Id Empresa` (con espacio + mayúsculas). 0 FK miss a cotizaciones.
  - `servicios_tipo_precios`: 46 (CISE 22 + GRUAS 24). Catálogo de precios por tipo de servicio.
- **Respuestas 2026 (informe_respuesta)** — decisión arquitectural: solo migrar 2026+ (25,096 de 350,926 = 93% menos). Pre-2026 cubierto por PDFs del informe. 1,221 inspecciones pre-2026 sin PDF deshabilitadas (`is_active=false`).
  - Migration [20260415230000_inspecciones_detalles_bubble.sql](supabase/migrations/20260415230000_inspecciones_detalles_bubble.sql): agrega `bubble_id`, `pregunta_bubble_id`, `respuesta_texto`, `respuesta_fecha`, `tipo_pregunta`, `puntaje`, `obligatorio`, `created_by`, `updated_at` a `inspecciones_detalles`.
  - Script [scripts/migrate-informe-respuesta.ts](scripts/migrate-informe-respuesta.ts): filtra por `Created Date > 2026-01-01`. Deriva `estado` (OK/FALLA/NO_APLICA) desde `lista_Texto_Para_CSV`.
  - **Resultado:** 25,096 (CISE 5,830 + GRUAS 19,266), 0 errores, 0 FK miss, 0 skipped.
  - Diseño de UI nueva para informes post-cutover documentado en `memory/project_informes_arquitectura.md` y TAREAS §4.0.
- **Orchestrator:** [scripts/migrate-all-prod.ts](scripts/migrate-all-prod.ts) ampliado a **19 fases** (antes 12):
  - Nuevas: `mig4b`, `mig6b`, `inspecciones`, `profileDetail`, `gastos`, `batch2`, `respuestas`.
- **Dress-rehearsal 19 fases** ejecutado 2026-04-16 contra `version-test`: **40m 15s**, 19/19 OK, 0 errores. Tiempos por fase: mig2a 3s · mig2b 6m42s · mig2c 7m56s · mig2d 2m1s · mig3 46s · mig4 4m26s · mig4b 6s · mig5 1m29s · mig6 4m59s · mig6b 14s · mig7 8s · blockA 1m51s · inspecciones 2m44s · profileDetail 20s · gastos 23s · batch2 1m35s · respuestas 2m41s · blockB 38s · audit 1m6s.

### v3.1.17 — 2026-04-14 a 2026-04-15 (Bloque B cerrado, Planes Fase 0, Inspecciones, cutover re-programado)

- **Bloque B cerrado (2026-04-14 noche):** 33,110 archivos drenados a Supabase Storage. El estimado previo de "~10,743 URLs rotas" estaba muy inflado — el número real fueron **911 filas** apuntando al bucket borrado `reporta-files`. Patch `supa_dead` permanente en [scripts/migrate-files-to-storage.ts:176-193](scripts/migrate-files-to-storage.ts#L176-L193): `classifyUrl` ahora distingue URLs al bucket muerto y las fuerza por el flujo re-fetch desde Bubble via `bubble_id`. Drain completo ejecutado con `--concurrency=8` en ~2 min. Estado final por target (ver §12). Residual: 1 row `c25c481b-ad62-460b-bff4-fe20937b27d9` con URL origen Bubble devolviendo HTML en lugar de PDF — pérdida 0.005% aceptada.
- **HEAD-check estratificado** verificó que todos los archivos preexistentes (que `file_migration_log` no tocó) responden HTTP 200 en cualquier franja de `created_at` — no hay rotura latente por fecha.
- **Audit integral mejorado:** [scripts/audit-mig-full.ts](scripts/audit-mig-full.ts) Parte 4 ahora verifica buckets contra la lista viva de `supabase.storage.listBuckets()` (antes era falso-verde). Sample size subido a 500. Reporta columnas Live/Dead/Bubble/Other + enumeración de buckets muertos. Esto cierra el bug que permitió que las 911 URLs rotas pasaran desapercibidas.
- **`.gitignore`** excepción `!supabase/migrations/*.sql` agregada: 88 migrations ahora versionadas (antes las comía el patrón `*.sql`). Son source of truth del schema.
- **Planes de Acción Fase 0 cerrada (2026-04-14 noche):** schema completado y re-migrado con 386 planes + 937 responsables N:N + 44 avances, 0 errores, 0 FK misses.
  - Migration SQL [20260414000000_planes_accion_fase0.sql](supabase/migrations/20260414000000_planes_accion_fase0.sql): 6 columnas nuevas en `planes_accion` (`reporte_maquinaria_id`, `plantilla_id`, `maquinaria_id`, `pregunta_ref JSONB`, `lista_fotos JSONB`, `informe_bubble_id`), tablas `planes_accion_responsables` (N:N) y `planes_accion_avances` (histórico con fotos JSONB), función `get_next_plan_accion_codigo(tenant)`.
  - Hallazgo importante: los campos de `plan_de_accion` en Bubble son **camelCase** (`idInforme`, `idFormato`, `idPregunta`, `idmaquinaria`), no snake_case. El roadmap original asumió el formato incorrecto. Corregido en `memory/project_planes_accion_roadmap.md`.
  - Decisión `codigo`: se usa el crudo de Bubble (`"0013"`, `"0081"` — consecutivo por tenant, zero-padded); fallback `LPAD(consecutivo, 4)` para legacy pre-2025 donde `codigo` es NULL.
- **Inspecciones migration cerrada (2026-04-15):** desbloquea el FK `planes_accion.inspeccion_id` que quedó NULL en Fase 0 (el `plan.idInforme` apunta al tipo Bubble `informes`, = `inspecciones` en Supabase, que estaba vacía).
  - Migration SQL [20260415000000_inspecciones_bubble_mig.sql](supabase/migrations/20260415000000_inspecciones_bubble_mig.sql): agrega a `inspecciones` columnas `bubble_id`, `codigo`, `archivo_pdf_url`, `puntaje`, `fecha_finalizacion`, `tiene_plan_de_accion`, `tiene_respuestas_criticas`, `tiene_respuestas_erroneas`, FKs `tarea_id`, `cliente_id`, `cotizacion_id` + unique index `(tenant_id, bubble_id)`.
  - Fix en [20260415000100_inspecciones_bubble_unique_fix.sql](supabase/migrations/20260415000100_inspecciones_bubble_unique_fix.sql): el índice parcial `WHERE bubble_id IS NOT NULL` no califica para `ON CONFLICT`. Reemplazado por índice full.
  - [scripts/migrate-inspecciones.ts](scripts/migrate-inspecciones.ts) creado: migra Bubble `informes` (15,638 records) → `inspecciones` con cache de plantillas/maquinarias/tareas/terceros/cotizaciones/profiles. Post-migrate ejecuta `UPDATE planes_accion SET inspeccion_id = i.id FROM inspecciones i WHERE informe_bubble_id = i.bubble_id` para resolver retroactivamente el FK.
  - **Resultado:** 13,327 inspecciones migradas (10,027 CISE + 3,300 GRUAS), 0 errores, 0 FK misses. 366 planes_accion linkeados al inspeccion_id, 0 missed. Los ~2,311 informes no migrados tienen `id_empresa` NULL o pertenecen a otros tenants de Bubble no objetivo.
  - `inspecciones_detalles` (respuestas individuales de cada checklist) queda deferido — se llenará desde la UI cuando los usuarios empiecen a hacer nuevos checklists post-cutover.
- **Dress-rehearsal del orchestrator** ejecutado 2026-04-15 contra `version-test`. Primera corrida: mig2a ✅ 3s, mig2b ✅ 5m8s, mig2c ✅ 6m16s, mig2d ❌ fallaba en [scripts/migrate-users.ts](scripts/migrate-users.ts). Bug encontrado y resuelto (ver abajo). **Segunda corrida end-to-end (post-fixes): 30m 8s totales, 12 fases OK, audit con 0 regresiones.**
  - Tiempos por fase: mig2a 3s · mig2b 5m2s · mig2c 2m14s · mig2d 1m18s · mig3 37s · mig4 3m23s · mig5 1m14s · mig6 4m14s · mig7 6s · blockA 1m24s · blockB 9m43s (concurrency=8) · audit 45s.
  - Audit integral: gaps per-tenant ✅ 0 en todas las tablas críticas (tareas, reportes_maquinaria, reportes_usuario, facturas_compra, planes_accion, maquinarias). Los "gaps globales" (total Bubble vs total Supabase) corresponden a data de otros tenants no objetivo y están documentados en §12. `plantillas +161` es intencional (161 × 2 tenants = 322). Pipeline validado para el cutover del 2026-04-26.
- **Bug `migrate-users.ts` MIG-2d resuelto (2026-04-15):** el script hardcodeaba el token Bubble, fetcheaba `/Companies` (que retorna HTTP 404 — tipo no expuesto vía Data API), y concatenaba `data.response.results` sin guard. Fix: usa `process.env.BUBBLE_API_TOKEN`, reemplaza el fetch de Companies por el mapping fijo `TARGET_TENANTS` (mismo patrón que `migrate-planes-accion.ts` / `migrate-inspecciones.ts`), y agrega guard defensivo en `fetchBubbleUsers`. Re-corrida del orchestrator `--phase=mig2d`: OK en 2m21s.
- **Cutover re-programado:** de domingo **2026-04-19 → domingo 2026-04-26**. Motivo: pendientes de UI (Planes de Acción Fase 1 solo-lectura, email templates, timeline planificación) + tiempo adicional para regenerar `types/supabase.ts`.

### v3.1.16 — 2026-04-12 (MIG-VALIDACION Bloque A completo: A.1 a A.5)

- **A.1 — `migrate-plantillas.ts`:** Bubble `formato` + `formato_seccion` + `formato_pregunta` → Supabase `plantillas` con estructura JSONB anidada. Decisión: duplicar por tenant (161 × 2 = 322) en lugar de inspecciones, ya que Bubble solo tiene plantillas vacías. Migración SQL `20260412000000_add_plantillas_bubble_id.sql` agrega `bubble_id` + UNIQUE CONSTRAINT `(tenant_id, bubble_id)` (no índice parcial — ON CONFLICT requiere constraint real).
- **A.2 — `migrate-planes-accion.ts`:** Bubble `plan_de_accion` (484 totales, 98 huérfanos sin `id_empresa`) → Supabase `planes_accion`. Resultado: 20 CISE + 366 GRUAS = 386, 0 FK misses. Migración SQL agrega `bubble_id`, `titulo`, `codigo`. `inspeccion_id` = NULL (no hay inspecciones migradas).
- **A.3 — `fix-matriz-orphans.ts`:** `cotizaciones_matriz_responsabilidad` ya estaba migrada (el audit original buscaba la tabla con nombre equivocado `cot_matriz_responsabilidad`, y creía que `responsable_empresa` era campo tenant cuando es BOOLEAN). Reparados 30 huérfanos sin tenant via backlink (`cotizacion_bubble_id` → `cotizaciones.tenant_id`) y borrados 1,062 sin FK padre viva. Final: **52,108 rows**. CISE conserva 15,900 filas "históricas" con `bubble_id` ya no presente en Bubble pero apuntando a cotizaciones Supabase vivas — historial legítimo, no duplicados.
- **A.4 — `fix-gaps-mig.ts`:** Cerrado `terceros_sitios` al 100% insertando 4 sitios con `tercero_id=NULL` (columna nullable; eran huérfanos en Bubble sin tercero asociado). Aceptados: `maquinaria_documentos` -1 GRUAS (1 doc Bubble sin link a maquinaria) y `cotizaciones_detalle` -58 (detalles Bubble sin `cotizacion_id`) — ambos NOT NULL en destino, no migrables.
- **A.5 — `fix-orphans-mig.ts`:** Eliminadas 1,052 filas fantasma vacías (todos los campos NULL) en `facturas_venta` (2), `facturas_venta_item` (1,043), `facturas_compra_item` (7). Script valida "todos los payloads NULL" antes de borrar. `tipos_precio` (20 NULL tenant) **mantenido** — es catálogo global compartido (`lib/actions/servicios.ts:289` no filtra por tenant).
- **Estado final Bloque A:** todos los gaps per-tenant cerrados al 100%, excepto 3 casos documentados con razón técnica (NOT NULL + garbage origen).
- **Siguiente prioridad:** Bloque B — migrar ~33,110 archivos de Bubble S3 a Supabase Storage.

### v3.1.15 — 2026-04-12 (MIG-AUDIT: Validación integral)

- **`audit-mig-full.ts`** creado: script unificado con `--part=1/2/3/4/5/all`.
- **Parte 1 — Conteos globales:** Bubble total 174,023 registros vs Supabase 117,150 (los gaps globales incluyen datos de otros tenants Bubble no objetivo).
- **Parte 2 — Cobertura bubble_id:** 18/18 tablas principales al 100% (solo 1 profile admin manual sin bubble_id).
- **Parte 3 — Cobertura tenant_id:** 100% en tablas principales. Excepciones: `facturas_venta_item` 1,043 sin tenant (huérfanos sin padre), `facturas_venta` 2 sin tenant, `facturas_compra_item` 7 sin tenant, `tipos_precio` 20 huérfanos.
- **Parte 4 — Archivos:** ~33,110 URLs de archivos (PDFs, fotos, firmas) siguen apuntando a Bubble/S3. **CERO copiados a Supabase Storage.** Riesgo crítico si Bubble se desactiva.
- **Parte 5 — Desglose por tenant:** confirma que la mayoría de tablas están al 100% por tenant (CISE + GRUAS).
- **Siguiente prioridad:** MIG-VALIDACION (bloques A/B/C).

### v3.1.11 — 2026-04-12 (MIG-4: Facturas completas)

- **`migrate-facturas-items.ts`** creado: script unificado con `--step=parents/venta/compra/inspect/all` y `--limit N`.
  - **Parents migrados primero:** GRUAS no tenía facturas padre en Supabase → migrados 1,451 `facturas_venta` + 1,191 `facturas_compra`.
  - **Campos Bubble verificados por inspección API:** `valoracion_id` (no `id_factura_venta_custom_alquiler_factura1`), items compra sin FK directo (se resuelve via `lista_items[]` del padre).
  - **Pre-cached maps** para servicios, maquinarias, reportes, y parents — O(1) lookups vs N+1 del script anterior.
- **`facturas_venta_item`:** 18,393/21,130 (87%). 2,737 huérfanos cuyo `valoracion_id` no tiene padre en Bubble.
- **`facturas_compra_item`:** 20,761/20,761 (100%). 12,608 sin `factura_id` (padre no los lista en `lista_items`).
- **`facturas_venta`:** 2,731 (1,280 CISE + 1,451 GRUAS). **`facturas_compra`:** 1,265 (74 + 1,191).
- **Siguiente prioridad:** MIG-6 — `reportes_maquinaria` (investigar fantasmas) + `reportes_usuario` (24,979 sin migrar).

### v3.1.13 — 2026-04-12 (MIG-6: Reportes completos)

- **`migrate-reportes-mig6.ts`** creado: script unificado con `--step=inspect/clean-maq/migrate-maq/migrate-usr/all`.
- **reportes_maquinaria:** 22,197/22,197 (100%). Ya migrada correctamente por script v2 anterior. Los "44k fantasma" reportados eran duplicados ya limpiados.
- **reportes_usuario:** 24,974/24,974 (100%). CISE: 11,604 + GRUAS: 13,370.
  - FKs resueltos a UUIDs: tarea_id, item_cotizacion_id, maquina_id, created_by (via profiles map).
  - 100% de registros tienen usuario (Created By) y tenant_id.
  - pdf_url: 0% — campo no existe en Bubble para `usuario-reporte-horas-new`.
- **reportes_maquinaria pdf_url:** 93.6% (1,414 de 22,197 sin PDF en Bubble).
- FK misses mínimos: 2 tareas en CISE (reportes_usuario).
- **Siguiente prioridad:** MIG-7 — Catálogos simples.

### v3.1.14 — 2026-04-12 (MIG-7: Catálogos simples)

- **`seed-catalogos-mig7.ts`** creado: script unificado con `--step=inspect/seed/all`.
- **131 registros** sembrados en 7 tablas de catálogo:
  - `document_types`: 12 tipos globales (DNI, SCTR, EMO, licencias, etc.) con categoría y días de alerta.
  - `terceros_tipos`: 5 tipos × 2 tenants (Cliente, Proveedor, Subcontratista, etc.).
  - `sitios_tipo`: 7 tipos × 2 tenants (Planta, Obra, Mina, Puerto, etc.).
  - `sitios_ubicacion`: 9 zonas × 2 tenants (Lima, Norte, Sur, Sierra, Selva, etc.).
  - `tiempo_unidades`: 6 unidades × 2 tenants (Hora, Día, Semana, Mes, Turno, etc.).
  - `servicios_tipo`: 12 tipos × 2 tenants (Alquiler de Grúa, Izaje, Transporte, etc.).
  - `ubigeo`: 41 códigos INEI (26 departamentos + 16 distritos Lima principales).
- Ninguna tabla tiene equivalente en Bubble — catálogos propios del sistema.
- Script idempotente: verifica existencia antes de insertar.
- **Migración Bubble → Supabase: MIG-0 a MIG-7 completos.** Solo queda MIG-8 (verificación entorno producción).

### v3.1.12 — 2026-04-12 (MIG-5: Tareas completas)

- **`migrate-tareas-mig5.ts`** creado: pre-cache de profiles, terceros, sitios, cotizaciones, cotizaciones_detalle → transform + upsert batch.
- **Resultado:** 13,738/13,738 (100%). CISE: 4,798 + GRUAS: 8,940.
- Datos ya existían de migración previa (gap=0). Upsert actualizó todos los FKs (cliente_id, cotizacion_id, cotizacion_item_id, asignado_a, created_by/updated_by).
- FK misses mínimos: 1 cotizacion (CISE), 6 cotizacion_items (GRUAS).
- Columnas `comentarios` y `sitio_id` no existen en schema actual (referenciadas en scripts previos pero nunca creadas en migrations).
- **Siguiente prioridad:** MIG-6 — `reportes_maquinaria` + `reportes_usuario`.

### v3.1.10 — 2026-04-12 (MIG-3: Cotizaciones completas)

- **`migrate-cotizaciones-detalle.ts`** reescrito: IDs de tenant corregidos, esquema de precios remapeado (Bubble `precio1_monto`/`minimo1`/`subtotal` → Supabase `precio_valor`/`precio_seleccionado`/`precio_tipo`), paginación de parents (fix límite 1000 de Supabase), `estado_aprobacion` validado contra check constraint. Resultado: **4,059/4,117** (98.6%).
- **`migrate-cotizaciones-gap.ts`** creado: encuentra cotizaciones en Bubble no presentes en Supabase y las inserta. 3 faltantes de CISE insertados como version=2 (duplicados de `numero` con diferente `bubble_id`).
- **Cotizaciones totales:** CISE 2,297 + GRUAS 258 = **2,555/2,555** (100%).
- **Siguiente prioridad:** MIG-4 — `facturas_venta_item` (0/21,151) y `facturas_compra_item` (0/20,776).

### v3.1.9 — 2026-04-12 (MIG-2: Grupo 2 completado)

- **`migrate-maquinaria-bubble.ts`** reescrito con `--step` (modelos/tipos_docs/maquinarias/documentos/all) y `--limit N`. Fix: `tipo_equipo` NOT NULL usa fallback `'GENERICO'`. Resultado: 230/230 modelos, 30/31 tipos_docs, 260/260 maquinarias, 230/234 documentos + Storage.
- **`migrate-sitios-full.ts`** corregido: IDs de tenant erróneos reemplazados por los verificados; `insert` → `upsert` por `bubble_id`; fix para `tercero_id` como array en Bubble. Resultado: 1,612/1,879 sitios (CISE 1378 + GRUAS 234).
- **`migrate-terceros-contactos.ts`** creado: maneja typo `tenan_id` de Bubble, fallback a tenant del tercero padre, diferimiento de `cargo_id`/`area_id` (no hay `bubble_id` en `job_titles`). Resultado: 805/860 contactos.

---

### v3.1.8 — 2026-04-11 (Migración: herramientas y documentación)
- **Audit script mejorado:** `scripts/audit-grupo1-supabase.ts` ahora muestra columnas TID / BID / SID / S.Tot / B.Tot / Match para 26 tablas del Grupo 1. Compara Supabase vs referencia Bubble.
- **COMO MIGRAR.md:** Guía completa creada — proceso A→F, mapeos de campos por tabla, template TypeScript base, helper de Storage, y grupos 1–7 con orden de ejecución FK-safe.
- **MIGRACION_DIAGNOSTICO.md:** Diagnóstico reescrito con datos verificados: conteos reales, IDs confirmados, estado TID/BID/SID por tabla.
- **IDs confirmados:** CISE UUID `1cb97ec7-326c-4376-93ee-ed317d3da51b`, GRUAS UUID `6f4c923a-c3b7-47c2-9dea-2a187f274f73`. Bubble IDs documentados en `COMO MIGRAR.md`.
- **`servicios_tipos` (plural):** Marcada como obsoleta — ejecutar `DROP TABLE servicios_tipos` en SQL Editor. La tabla activa es `servicios_tipo` (singular).

---

### v3.1.7 — 2026-04-11 (Fase 2: avance parcial)
- **Dashboard:** `lib/actions/dashboard.ts` con `getDashboardMetrics()` — 5 KPIs reales por tenant (inspecciones, tareas activas, cotizaciones pendientes/aprobadas, últimas 5 cotizaciones con cliente).
- **Email:** `lib/email.ts` migrado de mock a Resend real. Fallback a console.log si `RESEND_API_KEY` no está configurado. Pendiente: templates HTML y configuración DNS del dominio.
- **Reset de contraseña:** Flujo completo con `requestPasswordReset()` + página `/auth/reset-password` (PKCE, validación Zod, redirect automático al login).
- **Copyright login:** Footer usa `new Date().getFullYear()` — año siempre actualizado.

---

### v3.1.6 — 2026-04-10 (Fase 1: Seguridad)
- **Middleware:** Rutas protegidas con redirección a `/login` si no hay sesión. Rutas públicas definidas explícitamente (`/login`, `/auth`, `/aprobacion`).
- **Roles:** Detección de `reporta_admin` migrada de comparación por email a `profile.role === 'reporta_admin'`.
- **Cookie de tenant:** `managed_tenant_id` ahora se setea con `httpOnly: true`. Las server actions `getTenants` y `selectTenant` validan el rol antes de operar. El `UserContext` ya no lee `document.cookie` — usa la server action `getActiveTenantId()`.
- **Rate limiting PIN:** `validatePIN` limita a 5 intentos fallidos con bloqueo de 15 minutos. Migración `20260410000000_add_pin_rate_limiting.sql` agrega `pin_attempts` y `pin_locked_until` a `cotizaciones`.
