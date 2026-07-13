# CÓMO MIGRAR — Guía de Migración Bubble → Supabase

> Proyecto: REPORTA WEB v3
> Tenants objetivo: **CISE PERU SAC** y **GRUAS DEL PACIFICO**
> Entorno Bubble: parametrizado por `BUBBLE_API_URL` (default `https://reporta.la/version-test/api/1.1/obj`; prod = `https://reporta.la/api/1.1/obj`)
> Token Bubble: ver `.env.local` → `BUBBLE_API_TOKEN`
> Última actualización: 2026-04-13 (post parametrización + orchestrator + drain Bloque B)
>
> **Estado actual:** MIG-0..MIG-7 + Bloque A completos. 117,150+ registros + 12,327+ archivos en Storage. Drain `reportes_maquinaria.pdf_url` en curso (~15k archivos restantes).
> **Siguiente paso:** Cutover final contra Bubble **prod** el domingo — ver [RUNBOOK-DOMINGO.md](RUNBOOK-DOMINGO.md).
> **Auditoría:** `npx tsx scripts/audit-mig-full.ts` (partes 1-5).
> **Orchestrator:** `scripts/migrate-all-prod.ts` (12 fases en orden, idempotente, resume/retry).

---

## Para el cutover del domingo — TL;DR

```bash
# Un comando. Lee logs/migrate-all-prod-<timestamp>.log para detalles.
BUBBLE_API_URL=https://reporta.la/api/1.1/obj npx tsx scripts/migrate-all-prod.ts
```

El orchestrator corre MIG-2 a MIG-7, Bloque A, Bloque B (con `--concurrency=8`) y audit final. ETA ~3.5–4.5 h. Si algo falla imprime el `--from=<faseId>` para retomar.

Pre-requisitos manuales en [RUNBOOK-DOMINGO.md § Pre-requisitos](RUNBOOK-DOMINGO.md).

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
BUBBLE_API_TOKEN=<token>
BUBBLE_API_URL=https://reporta.la/api/1.1/obj     # solo para cutover prod; default es version-test
```

Los 17 scripts canónicos leen `BUBBLE_API_URL` de env con fallback a `version-test`, por lo que las corridas de desarrollo siguen funcionando sin cambios.

## IDs fijos

| Entidad | Sistema | ID |
|---|---|---|
| CISE PERU SAC | Supabase UUID | `1cb97ec7-326c-4376-93ee-ed317d3da51b` |
| GRUAS DEL PACIFICO | Supabase UUID | `6f4c923a-c3b7-47c2-9dea-2a187f274f73` |
| CISE PERU SAC | Bubble ID | `1596035803087x371442079041323000` |
| GRUAS DEL PACIFICO | Bubble ID | `1691779382086x534175713862630160` |

---

## Proceso de migración por tabla (A → F)

Seguir este proceso para **cada tabla nueva o re-migración incremental**:

### A — Definir el script

Crear o reutilizar `scripts/migrate-<tabla>.ts`. El script debe:
- Conectar a Bubble API con paginación (cursor)
- Filtrar por tenant (CISE + GRUAS) usando el campo correcto del tipo
- Usar `supabase.upsert({ bubble_id: ... }, { onConflict: 'bubble_id' })` para idempotencia
- Aceptar parámetro `--limit N` para controlar el tamaño de lote
- Imprimir al final: registros en Bubble / insertados / actualizados / errores

### B — Migrar primeros 10 registros

```bash
npx tsx scripts/migrate-<tabla>.ts --limit 10
```

### C — Evaluar conteos, campos y archivos

```bash
npx tsx scripts/audit-grupo1-supabase.ts   # ver S.Tot vs B.Tot
```

Verificar:
- Cantidad de registros migrados vs esperados
- Que todos los campos clave estén poblados (no NULL donde no debería)
- Que los archivos en Storage (si aplica) existan y sean accesibles

### D — Evaluar mapeo bubble_id → supabase id

```sql
-- En Supabase SQL Editor: verificar que bubble_id está único y id es UUID válido
SELECT id, bubble_id, tenant_id FROM <tabla> WHERE bubble_id IS NOT NULL LIMIT 10;
```

Con `bubble_id` resuelves la FK desde Bubble (ej: `maquinaria.modelo = "1234x567"` → busca `maquinaria_modelos.bubble_id = "1234x567"` → obtiene `maquinaria_modelos.id`).

### E — Corregir errores y reintentar

Si hay errores:
1. Leer el mensaje de error exacto
2. Corregir el mapeo de campos en el script
3. Repetir B con los mismos 10 registros (el upsert no duplica)

Repetir hasta que los 10 registros estén correctos. Luego hacer otro lote de 10 para llegar a 20, luego otro de 10 para llegar a 30.

### F — Migrar el resto en lotes

```bash
npx tsx scripts/migrate-<tabla>.ts --limit 100   # lote de 100
npx tsx scripts/migrate-<tabla>.ts --limit 200   # lote de 200
npx tsx scripts/migrate-<tabla>.ts               # todos los restantes (500+)
```

El upsert por `bubble_id` garantiza que los registros ya migrados se actualizan en lugar de duplicarse.

### Re-migración incremental (nuevos registros del cliente)

Ejecutar el mismo script sin `--limit`. El upsert actualizará existentes e insertará nuevos. Para saber qué cambió:

```bash
# Ver qué se insertó/actualizó en las últimas 24h
npx tsx scripts/audit-grupo1-supabase.ts
```

---

## Estado de migración por tabla

### Leyenda

| Columna | Significado |
|---|---|
| TID | Tiene columna `tenant_id` |
| BID | Tiene columna `bubble_id` (para trazabilidad) |
| SID | Tiene columna `id` UUID (PK de Supabase) |
| S.Tot | Total de registros en Supabase |
| B.Tot | Total en Bubble (ref. audit 2026-04-11) |
| Match | ✅ completo \| ⚠️ parcial \| ❌ vacío \| — sin ref |

---

## GRUPO 1 — Catálogos y Tablas Base

### companies (tenants)

| Campo | Valor |
|---|---|
| Tabla Supabase | `companies` |
| Tipo Bubble | `Empresas` |
| Campo tenant Bubble | `Empresa_Email` |
| Estado | ✅ Migrado |
| S.Total / B.Total | 2 / 2 |

Script original: `scripts/migrate-phase1.ts` (Sección STEP 1)

```bash
# Re-migración: no aplica — las empresas no cambian
```

---

### terceros

| Campo | Valor |
|---|---|
| Tabla Supabase | `terceros` |
| Tipo Bubble | `tercero` (singular) |
| Campo tenant Bubble | `tenant_id` |
| Estado | ✅ Migrado |
| S.Total / B.Total | 614 / 614 |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script: `scripts/migrate-terceros-bubble.ts`

Mapeo clave:
```
Bubble._id           → terceros.bubble_id
Bubble.nombre        → terceros.nombre
Bubble.ruc           → terceros.ruc
Bubble.email         → terceros.email
Bubble.tipo_tercero  → terceros.tipo (cliente/proveedor/ambos)
Bubble.rubro         → terceros.rubro_id (via rubros.nombre)
Bubble.tenant_id     → terceros.tenant_id (via tenantMap)
```

```bash
# Re-migración incremental
npx tsx scripts/migrate-terceros-bubble.ts
```

---

### terceros_contactos

| Campo | Valor |
|---|---|
| Tabla Supabase | `terceros_contactos` |
| Tipo Bubble | `terceros_contactos` |
| Campo tenant Bubble | `tenan_id` (typo — falta la 't') |
| Estado | ✅ Migrado (2026-04-12) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script: `scripts/migrate-terceros-contactos.ts`

> ⚠️ **Gotcha 1**: El campo tenant en Bubble se llama `tenan_id` (typo, falta la 't').
> Fallback: si no hay `tenan_id`, heredar del tercero padre (`tercero_id` → `terceros.tenant_id`).
>
> ⚠️ **Gotcha 2**: ~16% de los contactos en Bubble no tienen `tercero_id` → son huérfanos, se saltan.
>
> ⚠️ **Campos diferidos**: `cargo_id` y `area_id` no migrados. `job_titles` y `areas` no tienen
> `bubble_id` en Supabase, por lo que no es posible resolver FKs. Requiere pasada adicional por nombre.

Mapeo clave:
```
Bubble._id           → terceros_contactos.bubble_id
Bubble.nombre_completo → terceros_contactos.nombre_completo
Bubble.email         → terceros_contactos.email
Bubble.telefono      → terceros_contactos.telefono
Bubble.tercero_id    → terceros_contactos.tercero_id (via terceros.bubble_id)
Bubble.tenan_id      → terceros_contactos.tenant_id (via tenantMap, con fallback del padre)
```

```bash
# Re-migración incremental (upsert por bubble_id)
npx tsx scripts/migrate-terceros-contactos.ts
```

---

### terceros_sitios

| Campo | Valor |
|---|---|
| Tabla Supabase | `terceros_sitios` |
| Tipo Bubble | `terceros_sitios` |
| Campo tenant Bubble | `tenant_id` |
| Estado | ✅ Migrado (2026-04-12) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script: `scripts/migrate-sitios-full.ts`

> ⚠️ **Gotcha**: `tercero_id` en Bubble viene como **array** `["bubble_id"]`, no string.
> Usar `Array.isArray(r.tercero_id) ? r.tercero_id[0] : r.tercero_id` para extraerlo.
>
> Campos de Bubble disponibles: `nombre`, `codigo`, `tipo_id`, `tenant_id`, `tercero_id`, `is_active`.
> Bubble **NO tiene** `direccion`, `latitud`, `longitud` en este tipo.

Mapeo clave:
```
Bubble._id                      → terceros_sitios.bubble_id
Bubble.nombre                   → terceros_sitios.nombre
Bubble.tercero_id[0] (array)    → terceros_sitios.tercero_id (via terceros.bubble_id)
Bubble.tenant_id                → terceros_sitios.tenant_id (via tenantMap)
Bubble.is_active                → terceros_sitios.is_active
```

```bash
# Re-migración incremental (upsert por bubble_id)
npx tsx scripts/migrate-sitios-full.ts
```

---

### maquinaria_modelos

| Campo | Valor |
|---|---|
| Tabla Supabase | `maquinaria_modelos` |
| Tipo Bubble | `maquinaria_modelos` |
| Campo tenant Bubble | `tenant_id` |
| Estado | ✅ Migrado 230/230 (2026-04-12) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script: `scripts/migrate-maquinaria-bubble.ts` (--step modelos)

> ⚠️ **Fix aplicado**: `tipo_equipo` tiene NOT NULL constraint. Bubble tiene registros con NULL.
> Fallback obligatorio: `m.tipo_equipo || m.Equipo || 'GENERICO'`

Mapeo clave:
```
Bubble._id           → maquinaria_modelos.bubble_id
Bubble.marca         → maquinaria_modelos.marca
Bubble.modelo        → maquinaria_modelos.modelo
Bubble.tipo_equipo   → maquinaria_modelos.tipo_equipo
Bubble.capacidad     → maquinaria_modelos.capacidad
Bubble.tenant_id     → maquinaria_modelos.tenant_id (via tenantMap)
```

```bash
# Primeros 10 (paso B)
npx tsx scripts/migrate-maquinaria-bubble.ts --step modelos --limit 10
```

---

### maquinarias

| Campo | Valor |
|---|---|
| Tabla Supabase | `maquinarias` |
| Tipo Bubble | `maquinaria` (singular) |
| Campo tenant Bubble | `tenant_id` |
| Estado | ✅ Migrado (260 en Supabase, 274 en Bubble — 14 posiblemente de otro tenant) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script: `scripts/migrate-maquinaria-bubble.ts` (Sección STEP 2)

Mapeo clave:
```
Bubble._id           → maquinarias.bubble_id
Bubble.nombre/Codigo → maquinarias.nombre
Bubble.Codigo        → maquinarias.codigo_interno
Bubble.modelo        → maquinarias.modelo_id (via maquinaria_modelos.bubble_id) ← requiere modelos migrados
Bubble.Proveedor_id  → maquinarias.proveedor_id (via terceros.bubble_id)
Bubble.Fotografia    → maquinarias.foto_url (Storage bucket: maquinarias)
Bubble.tenant_id     → maquinarias.tenant_id (via tenantMap)
```

```bash
# Re-migración incremental (actualiza + inserta nuevas)
npx tsx scripts/migrate-maquinaria-bubble.ts
```

---

### maquinaria_tipos_docs

| Campo | Valor |
|---|---|
| Tabla Supabase | `maquinaria_tipos_docs` |
| Tipo Bubble | `maquinaria_tipos_docs` |
| Campo tenant Bubble | `tenant_id` |
| Estado | ✅ Migrado 30/31 (CISE 14 + GRUAS 16) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script en: `scripts/migrate-maquinaria-bubble.ts` (Sección STEP 3)

Mapeo clave:
```
Bubble._id                  → maquinaria_tipos_docs.bubble_id
Bubble.nombre               → maquinaria_tipos_docs.nombre
Bubble.requiere_vencimiento → maquinaria_tipos_docs.categoria ('con_vencimiento'/'sin_vencimiento')
Bubble.seguro               → maquinaria_tipos_docs.categoria ('seguro')
Bubble.tenant_id            → maquinaria_tipos_docs.tenant_id (via tenantMap)
```

---

### maquinaria_documentos

| Campo | Valor |
|---|---|
| Tabla Supabase | `maquinaria_documentos` |
| Tipo Bubble | `maquinaria_documento` (singular) |
| Campo tenant Bubble | `tenant_id` |
| Estado | ⚠️ Migrado 230/234 (-1 GRUAS, 3 sin maquinaria_id) |
| TID | ✅ | BID | ✅ | SID | ✅ |
| Archivos | **Aún apuntan a Bubble S3** — pendiente migrar a Supabase Storage (Bloque B) |

Script en: `scripts/migrate-maquinaria-bubble.ts` (Sección STEP 4)

Mapeo clave:
```
Bubble._id             → maquinaria_documentos.bubble_id
Bubble.maquinaria_id   → maquinaria_documentos.maquinaria_id (via maquinarias.bubble_id)
Bubble.tipo_doc_id     → maquinaria_documentos.tipo_doc_id (via maquinaria_tipos_docs.bubble_id)
Bubble.fecha_emision   → maquinaria_documentos.fecha_emision
Bubble.fecha_vence     → maquinaria_documentos.fecha_vencimiento
Bubble.archivo_url     → maquinaria_documentos.archivo_url (descarga + sube a Storage)
Bubble.tenant_id       → maquinaria_documentos.tenant_id (via tenantMap)
```

```bash
# Con archivos (descarga de S3 Bubble → sube a Supabase Storage)
npx tsx scripts/migrate-maquinaria-bubble.ts --step documentos --limit 10
```

---

### servicios

| Campo | Valor |
|---|---|
| Tabla Supabase | `servicios` |
| Tipo Bubble | `servicio` (singular — OJO, no `servicios`) |
| Campo tenant Bubble | `tenant_id` |
| Estado | ⚠️ Parcial (430 en Supabase, 459 en Bubble — 29 faltantes) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script: `scripts/migrate-services.ts`

```bash
# Re-migración incremental (insertará los 29 faltantes)
npx tsx scripts/migrate-services.ts
```

---

### profiles

| Campo | Valor |
|---|---|
| Tabla Supabase | `profiles` |
| Tipo Bubble | `user` |
| Campo tenant Bubble | `Id_tenant` |
| Estado | ⚠️ Parcial (318 en Supabase, ~400 objetivo CISE+GRUAS) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script: `scripts/migrate-users.ts`

---

### paises

| Campo | Valor |
|---|---|
| Tabla Supabase | `paises` |
| Tipo Bubble | `paises` |
| Campo tenant Bubble | ninguno (global) |
| Estado | ✅ Migrado (249 en ambos) |
| TID | — | BID | — | SID | ✅ |

No requiere re-migración.

---

### rubros

| Campo | Valor |
|---|---|
| Tabla Supabase | `rubros` |
| Tipo Bubble | ninguno (catálogo propio) |
| Estado | ✅ Con datos (37 registros: CISE 20 + GRUAS 17) |
| TID | ✅ | BID | ❌ | SID | ✅ |

---

### actividades_matriz

| Campo | Valor |
|---|---|
| Tabla Supabase | `actividades_matriz` |
| Tipo Bubble | `actividades_matriz` |
| Campo tenant Bubble | `tenant_id` |
| Estado | ⚠️ Parcial (86 en Supabase = 20 seed + 66 migrados, 106 en Bubble) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script: `scripts/migrate-activities.ts`

---

### cotizaciones_matriz_responsabilidad

| Campo | Valor |
|---|---|
| Tabla Supabase | `cotizaciones_matriz_responsabilidad` |
| Tipo Bubble | `cotizaciones_matriz_responsabilidad` |
| Campo tenant Bubble | `tenant_id` (⚠️ NO `responsable_empresa`: ese es un BOOLEAN) |
| Estado | ✅ 52,108 en Supabase (2026-04-12 — A.3 cerrado) |
| TID | ✅ | BID | ✅ | SID | ✅ |

Script de validación: `scripts/fix-matriz-orphans.ts` (`--step=inspect/repair-tenants/delete-orphans/all`).

**Estado post A.3 (2026-04-12):**
- 30 huérfanos sin `tenant_id` reparados vía backlink `cotizacion_bubble_id` → `cotizaciones.tenant_id`.
- 1,062 filas truly orphan (sin FK padre viva) **eliminadas**.
- **CISE conserva 15,900 filas "históricas"** con `bubble_id` que ya no existe en Bubble pero apuntando a cotizaciones Supabase vivas. Son historial legítimo, NO duplicados.
- Distribución final: 50,463 CISE + 1,645 GRUAS.

---

## Resumen de migraciones completadas (MIG-2 a MIG-7)

### MIG-2 — Maquinaria y terceros ✅ 2026-04-12

| Tabla | Script | Resultado |
|---|---|---|
| `maquinaria_modelos` | `migrate-maquinaria-bubble.ts --step modelos` | ✅ 230/230 |
| `maquinaria_tipos_docs` | `migrate-maquinaria-bubble.ts --step tipos_docs` | ✅ 30/31 |
| `maquinarias` | `migrate-maquinaria-bubble.ts --step maquinarias` | ✅ 260/260 |
| `maquinaria_documentos` | `migrate-maquinaria-bubble.ts --step documentos` | ⚠️ 230/234 |
| `terceros_sitios` | `migrate-sitios-full.ts` + `fix-gaps-mig.ts` | ✅ 1,616/1,616 per-tenant (A.4 cerrado 2026-04-12, 4 sitios con tercero_id=NULL) |
| `terceros_contactos` | `migrate-terceros-contactos.ts` | ⚠️ 810/860 (-50 sin tercero_id) |

### MIG-3 — Cotizaciones ✅ 2026-04-12

| Tabla | Bubble | Supabase | Estado |
|---|---|---|---|
| `cotizaciones` | 2,555 | 2,555 | ✅ 100% per-tenant (CISE 2,297 + GRUAS 258) |
| `cotizaciones_detalle` | 4,117 | 4,059 | ⚠️ -58 (huérfanos FK) |

Scripts: `migrate-cotizaciones-detalle.ts`, `migrate-cotizaciones-gap.ts`.

### MIG-4 — Facturas ✅ 2026-04-12

| Tabla | Bubble | Supabase | Estado |
|---|---|---|---|
| `facturas_venta` | 2,725 | 2,731 | ✅ 2026-04-12 A.5: eliminadas 2 filas vacías sin tenant |
| `facturas_venta_item` | 21,151 | 18,393 | ⚠️ 2026-04-12 A.5: eliminadas 1,043 filas fantasma (todos los campos NULL). Gap real: 2,737 huérfanos documentados (valoracion_id sin padre). |
| `facturas_compra` | 1,265 | 1,265 | ✅ 100% |
| `facturas_compra_item` | 20,776 | 20,761 | ✅ 2026-04-12 A.5: eliminadas 7 filas fantasma |

Script: `migrate-facturas-items.ts` (`--step=parents/venta/compra/inspect/all`).

### MIG-5 — Tareas ✅ 2026-04-12

| Tabla | Bubble | Supabase | Estado |
|---|---|---|---|
| `tareas` | 13,738 | 13,738 | ✅ 100% per-tenant (CISE 4,798 + GRUAS 8,940) |

Script: `migrate-tareas-mig5.ts`. Campo tenant Bubble: `id_empresa`.

### MIG-6 — Reportes ✅ 2026-04-12

| Tabla | Bubble | Supabase | Estado |
|---|---|---|---|
| `reportes_maquinaria` | 22,197 | 22,197 | ✅ 100% per-tenant (CISE 5,541 + GRUAS 16,656) |
| `reportes_usuario` | 24,974 | 24,974 | ✅ 100% per-tenant (CISE 11,604 + GRUAS 13,370) |

Script: `migrate-reportes-mig6.ts` (`--step=inspect/clean-maq/migrate-maq/migrate-usr/all`).
> Los "44k fantasma" iniciales eran duplicados de una migración v1 que ya fueron limpiados.
> `reportes_usuario` FKs resueltos a UUIDs (tarea_id, item_cotizacion_id, maquina_id, created_by).

### MIG-7 — Catálogos locales ✅ 2026-04-12

131 registros sembrados en 7 tablas (document_types, terceros_tipos, sitios_tipo, sitios_ubicacion, tiempo_unidades, servicios_tipo, ubigeo).

Script: `seed-catalogos-mig7.ts`. Ninguno tiene equivalente Bubble.

---

## 🎯 SIGUIENTE: MIG-VALIDACION (Bloques A/B/C)

> Auditoría post-MIG-7 ejecutada 2026-04-12 con `audit-mig-full.ts`. Ver `TAREAS_PRIORIZADAS.md` para el plan completo.

### Bloque A — Tablas sin migrar

| Tabla | Bubble type | Bubble | Supa | Campo tenant | Nota |
|---|---|---|---|---|---|
| `plantillas` ✅ | `formato` + `formato_seccion` + `formato_pregunta` | 161 | 322 (161×2) | sin tenant | **Migrado 2026-04-12**: `formato` son plantillas de checklist (no inspecciones). Duplicadas CISE+GRUAS. Estructura JSONB con secciones y preguntas. `inspecciones` queda vacía (Bubble nunca tuvo instancias rellenadas — se poblarán desde la app). |
| `planes_accion` ✅ | `plan_de_accion` (= `accion_correctiva`) | 386 (20+366) | 386 | `id_empresa` | **Migrado 2026-04-12**. Total en Bubble: 484 (98 huérfanos sin `id_empresa` descartados). Columnas nuevas: `bubble_id`, `titulo`, `codigo`. FK `responsable_id` mapeado desde `id_editor`; `created_by` desde `Created By`. `inspeccion_id` = NULL (no hay inspecciones migradas). |
| `cotizaciones_matriz_responsabilidad` ✅ | `cotizaciones_matriz_responsabilidad` | 36,277 (34,563+1,714) | 52,108 | `tenant_id` (no `responsable_empresa`: ese es un BOOLEAN) | **Revisado 2026-04-12**. La tabla ya estaba migrada de antes — el audit reportaba 0 porque buscaba la tabla con un nombre equivocado (`cot_matriz_responsabilidad`). Se repararon 30 huérfanos sin tenant (inferidos vía `cotizacion_bubble_id` → `cotizaciones.tenant_id`) y se borraron 1,062 filas sin FK padre viva. CISE conserva 15,900 filas "históricas" con bubble_ids que ya no existen en Bubble pero apuntan a cotizaciones Supabase vivas — no son duplicados ni huérfanos, son historial. Ver `scripts/fix-matriz-orphans.ts`. |

**Gaps pequeños (A.4):** ✅ RESUELTO 2026-04-12 — `scripts/fix-gaps-mig.ts`
- `terceros_sitios` ✅ — 4 sitios insertados con `tercero_id=NULL` (columna nullable). En Bubble eran sitios huérfanos sin tercero asociado.
- `maquinaria_documentos` ⚠️ — 1 documento Bubble sin `maquinaria_id` (ningún link). No migrable — `maquinaria_id` es NOT NULL en Supabase. Aceptado.
- `cotizaciones_detalle` ⚠️ — 58 detalles Bubble sin `cotizacion_id` (garbage huérfano en origen). No migrable — `cotizacion_id` es NOT NULL. Aceptado.

**Huérfanos sin tenant_id (A.5):** ✅ RESUELTO 2026-04-12 — `scripts/fix-orphans-mig.ts`
- `facturas_venta` ✅ — 2 filas vacías (todos los campos NULL) **eliminadas**.
- `facturas_venta_item` ✅ — 1,043 filas fantasma (todos los campos NULL, ni siquiera `factura_venta_id`) **eliminadas**. Script valida "todos los payloads NULL" antes de borrar.
- `facturas_compra_item` ✅ — 7 filas con mismo patrón **eliminadas**.
- `tipos_precio` ⚠️ — 20 registros con `tenant_id=NULL` **mantenidos**. `tipos_precio` es catálogo global compartido: `lib/actions/servicios.ts:289` no filtra por tenant. Los nulls son seeds intencionales.

### Bloque B — Migrar archivos a Supabase Storage ⏳

**Total ~33,110 URLs auditadas.** De ellas: ~30,915 están en Bubble CDN (`*.cdn.bubble.io`), ~1,284 son paths relativos placeholder (re-buscados en Bubble por `bubble_id`) y ~911 apuntaban al bucket deprecated `reporta-files` que ya se borró (se ignoran).

| Tabla | Campo | Total | Estado 2026-04-13 |
| :--- | :--- | ---: | :--- |
| `maquinarias` | `foto_url` | 15 | ✅ 100% |
| `maquinaria_documentos` | `archivo_url` | 224 | ✅ 100% |
| `cotizaciones` | `pdf_url` | 2,224 | ✅ 100% (2,060 migrados + 164 pre-existentes) |
| `reportes_maquinaria` | `firma_cliente_url` | 9,864 | ✅ 100% |
| `reportes_maquinaria` | `pdf_url` | 20,783 | ⏳ ~3,500/18,945 drain en curso, 0 errores |

**Script:** [scripts/migrate-files-to-storage.ts](scripts/migrate-files-to-storage.ts)

Convenciones del path (§8.1 DOCUMENTACION_PROYECTO.md):
`{tenant_slug}/{tercero_slug?}/{yyyy}/{codigo?-}{tercero_slug?-}{yyyy-mm-dd}[-{rowId_short}].{ext}`

**Flags del script:**

- `--table=<key>` — uno de: `maquinarias`, `maquinaria_documentos`, `cotizaciones`, `reportes_maquinaria_firma`, `reportes_maquinaria_pdf`, o `all`
- `--step=inspect|migrate`
- `--limit=N` (debug/escalado)
- `--concurrency=N` (worker pool — **usar `8` en cutover prod**, 1 archivo/min sin flag vs ~8 con)
- `--dry-run`

**Idempotencia:** estado en `public.file_migration_log` con PK `(table_name, row_id, field)`. Re-correr saltea los `done`, re-intenta los `error`, y la clasificación interna (`bubble_cdn` vs `relative` vs `supa_public`) decide si usa la URL directa o re-busca en Bubble por `bubble_id`.

**Buckets Storage (creados manualmente 2026-04-12):**
`maquinarias`, `doc_maquinarias`, `cotizaciones`, `reporte-maquinaria`, `reporta-maquinaria-fotos`.

### Bloque C — MIG-8 ~~Verificación entorno producción~~ ❌ descartado

~~Confirmar con cliente si `/api/1.1/obj` (prod) tiene los mismos datos que `/version-test/` (dev).~~

**Descartado 2026-04-13:** `version-test` está desactualizado respecto a prod. El cutover del domingo se hace directo contra prod con `BUBBLE_API_URL=https://reporta.la/api/1.1/obj`. Todos los scripts canónicos están parametrizados — ver [RUNBOOK-DOMINGO.md](RUNBOOK-DOMINGO.md).

---

## Convenciones del script de migración

### Estructura base (template)

```typescript
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BUBBLE_BASE = 'https://reporta.bubbleapps.io/version-test/api/1.1/obj'
const BUBBLE_TOKEN = process.env.BUBBLE_API_TOKEN!

// IDs objetivo
const CISE_BUBBLE  = '1596035803087x371442079041323000'
const GRUAS_BUBBLE = '1691779382086x534175713862630160'
const CISE_SUPA    = '1cb97ec7-326c-4376-93ee-ed317d3da51b'
const GRUAS_SUPA   = '6f4c923a-c3b7-47c2-9dea-2a187f274f73'

const tenantMap: Record<string, string> = {
  [CISE_BUBBLE]:  CISE_SUPA,
  [GRUAS_BUBBLE]: GRUAS_SUPA,
}

// Parámetro --limit N (default: sin límite)
const limitArg = process.argv.indexOf('--limit')
const LIMIT = limitArg >= 0 ? parseInt(process.argv[limitArg + 1]) : undefined

async function fetchBubble(type: string, tenantBubbleId: string, cursor = 0, limit = 100) {
  const constraints = JSON.stringify([{
    key: 'CAMPO_TENANT_BUBBLE',   // ← cambiar por el campo real del tipo
    constraint_type: 'equals',
    value: tenantBubbleId
  }])
  const url = `${BUBBLE_BASE}/${type}?cursor=${cursor}&limit=${limit}&constraints=${encodeURIComponent(constraints)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${BUBBLE_TOKEN}` } })
  if (!res.ok) throw new Error(`Bubble ${res.status}: ${await res.text()}`)
  return (await res.json()).response
}

async function migrate() {
  let inserted = 0, updated = 0, errors = 0
  
  for (const [bubbleTenantId, supaTenantId] of Object.entries(tenantMap)) {
    let cursor = 0
    let fetched = 0
    
    while (true) {
      const { results, remaining } = await fetchBubble('TIPO_BUBBLE', bubbleTenantId, cursor)
      
      for (const record of results) {
        const row = {
          bubble_id: record._id as string,
          tenant_id: supaTenantId,
          // ... mapear campos
        }
        
        const { data, error } = await supabase
          .from('TABLA_SUPABASE')
          .upsert(row, { onConflict: 'bubble_id' })
          .select('id')
          .single()
        
        if (error) { console.error('❌', error.message); errors++ }
        else { /* inserted o updated según si existía */ inserted++ }
        
        fetched++
        if (LIMIT && fetched >= LIMIT) break
      }
      
      if (remaining === 0 || (LIMIT && fetched >= LIMIT)) break
      cursor += results.length
    }
  }
  
  console.log(`\n✅ Completado: ${inserted} insertados, ${updated} actualizados, ${errors} errores`)
  
  // Comparar con Supabase
  const { count } = await supabase.from('TABLA_SUPABASE').select('*', { count: 'exact', head: true })
  console.log(`📊 Total en Supabase: ${count}`)
}

migrate().catch(console.error)
```

### Manejo de archivos (Storage)

Para tablas con archivos (maquinaria_documentos, user_documents, etc.):

```typescript
async function uploadFile(bubbleUrl: string, bucket: string, storagePath: string): Promise<string | null> {
  if (!bubbleUrl) return null
  const url = bubbleUrl.startsWith('//') ? `https:${bubbleUrl}` : bubbleUrl

  // Verificar si ya existe
  const { data: existing } = await supabase.storage.from(bucket)
    .list(storagePath.split('/').slice(0,-1).join('/'), {
      search: storagePath.split('/').pop()
    })
  if (existing?.length) return storagePath

  const res = await fetch(url)
  if (!res.ok) return null
  const blob = await res.blob()

  const { error } = await supabase.storage.from(bucket)
    .upload(storagePath, blob, { contentType: blob.type, upsert: true })
  
  return error ? null : storagePath
}
```

---

## Verificación después de cada migración

```bash
# Ver estado actualizado de todas las tablas
npx tsx scripts/audit-grupo1-supabase.ts

# Ver conteos específicos
npx tsx scripts/count-maquinaria-progress.ts
npx tsx scripts/count-terceros-progress.ts
```

---

## Notas importantes

1. **Upsert por bubble_id**: SIEMPRE usar `onConflict: 'bubble_id'` para que re-ejecuciones sean idempotentes.

2. **Orden FK**: Respetar el orden de migración — nunca migrar una tabla antes de que sus dependencias FK estén migradas.

3. **Campo tenant en Bubble varía por tipo**:
   - La mayoría: `tenant_id`
   - `tareas`, `tasas_cambio`, `accion_correctiva`, `plan_de_accion`: `id_empresa`
   - `cotizaciones_matriz_responsabilidad`: `tenant_id` (¡NO `responsable_empresa`, que es un boolean!)
   - `user`: `Id_tenant`
   - `formato` (plantillas): sin tenant en Bubble — se duplican por tenant al migrar a `plantillas` (161 × 2 = 322)

4. **Tipos Bubble duplicados** (mismos datos, dos nombres):
   - `maquinaria` = `maquinarias` → usar `maquinaria` (singular)
   - `tercero` = `terceros` → usar `tercero` (singular)
   - `maquinaria_documento` = `maquinaria_documentos` → usar `maquinaria_documento`
   - `accion_correctiva` = `plan_de_accion` → son el mismo tipo

5. **Entorno Bubble**: Siempre usar `/version-test/` (dev). Confirmar con el cliente si producción tiene los mismos datos antes de ejecutar migraciones finales.
