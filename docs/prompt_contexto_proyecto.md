# Prompt de contexto — Proyectos Reporta
**Uso:** Pegar al inicio de una nueva conversación para trabajar en cualquiera de las tareas pendientes.

---

## Contexto del ecosistema

Trabajamos en dos proyectos que comparten la misma base de datos Supabase:

| Proyecto | Ruta local | Stack | Deploy | Versión |
|----------|-----------|-------|--------|---------|
| **reportaweb3** (Web) | `C:\Proyectos\reportaweb3` | Next.js 16 + React 19 + TypeScript + Tailwind 4 + shadcn/ui | Vercel Pro → `reporta.app` | 3.7.45 |
| **reporta-app** (Mobile) | `C:\Proyectos\reporta-app` | Expo 54 + React Native 0.81 + TypeScript + Expo Router | APK / TestFlight | 1.8.14 |

**Supabase:** proyecto `wioozisskjjgjjybsoqo`
- CISE tenant_id: `1cb97ec7-326c-4376-93ee-ed317d3da51b`
- GRUAS tenant_id: `6f4c923a-c3b7-47c2-9dea-2a187f274f73`

**Objetivo del producto:** Permitir que propietarios de maquinaria pesada registren horas trabajadas en campo, preparen valoraciones y facturen en minutos.

**Cutover:** 30 o 31 de Mayo 2026 (migración completa de Bubble → Supabase para tenants CISE y GRUAS).

---

## Arquitectura clave

### Web (reportaweb3)
- **Routing:** Next.js App Router — dashboard en `app/(dashboard)/`
- **Server actions:** `lib/actions/*.ts` (42+ archivos)
- **PDF:** Gotenberg (`GOTENBERG_URL` env var)
- **Email:** Resend
- **Auth:** Supabase Auth + cookie `managed_tenant_id` + RLS con `get_auth_tenant_id()`
- **Roles:** `reporta_admin`, `admin_tenant`, `supervisor`, `member`
- **Desktop-only:** No hay objetivo de mobile responsiveness en la web

### App móvil (reporta-app)
- **Offline-first:** Expo SQLite + Drizzle ORM + outbox pattern
- **Local tables:** `tareasCache`, `formatosCache`, `outbox`, `asistenciasLocal`, `eventosLocales`, `tareasPorDiaCache`, `allowancesLocales`
- **Sync:** outbox pattern para operaciones offline

### Base de datos compartida
- Multi-tenant con `tenant_id` en cada tabla + RLS
- Tablas principales: `tareas`, `cotizaciones`, `cotizaciones_detalle`, `terceros`, `maquinarias`, `reportes_maquinaria`, `reportes_usuario`, `facturas_venta`, `facturas_compra`, `valorizaciones`, `inspecciones`, `servicios`, `profiles`

---

## Tareas pendientes

### TAREA 1 — Web: Flujo cotización completo
**Estado:** 90% implementado. Falta UI de consulta al planner.

Lo que ya existe:
- Generar PDF de cotización (Gotenberg) ✅
- Guardar PDF en Supabase Storage ✅
- Enviar email al cliente con link de aprobación + PIN (Resend) ✅
- Página de aprobación `/aprobacion/[token]` con aprobación por ítem ✅
- Registro de aprobación + cambio de estado ✅
- Creación automática de tarea desde cotización aprobada ✅

**Lo que falta:**
- UI de consulta al planner: después de crear la tarea en estado BORRADOR, notificar/consultar al planner para que asigne fechas y recursos antes de confirmar.
- Archivos relevantes: `lib/actions/cotizaciones.ts`, `components/cotizaciones/`, `app/(dashboard)/cotizaciones/`

---

### TAREA 2 — App: Mejorar informes maquinaria y personal
**Estado:** Parcialmente implementado.

**Informes maquinaria** (`app/(tabs)/informe-maquinaria.tsx` — 1,126 líneas):
- Captura datos/horas ✅ · Fotos → Supabase ✅ · Modo edición ✅
- **Falta:** Generar PDF desde la app (llamar API web), listar en página de informes

**Informes personal** (`app/(tabs)/informe-personal.tsx` — 608 líneas):
- Captura horas con cálculos laborales ✅
- **Falta:** Modo edición (solo crea, no edita), fotos, generar PDF, listar en informes

**Tabla DB:** `reportes_personal` (tabla nueva, no migrada de Bubble — Bubble usaba `reportes_usuario`)

Columnas clave de `reportes_maquinaria`: `tarea_id`, `maquinaria_id`, `operador_id`, `jornada1_inicio/fin`, `jornada2_inicio/fin`, `horas_trabajadas`, `horas_facturar`, `foto_actividad_url`, `fotos_adicionales`, `firma_cliente_url`, `pdf_url`, `estado_venta`, `estado_compra`, `cotizacion_venta_item_id`

---

### TAREA 3 — Web: Valorización ventas desde informes de app
**Estado:** ✅ Implementado. Verificar integridad end-to-end.

Lo que existe:
- `getValorizacionPreview(reporteIds)` — preview desde reportes maquinaria
- `valorizarReportesVenta()` — crea valorización + marca reportes como 'V'
- PDF via `app/api/valorizaciones/[codigo]/pdf/`
- `FacturaVentaDialog` — facturar, cobros, detracción, deshacer
- Vistas: `view_ventas_pendiente_valorizar`, `view_ventas_pendientes_facturar`

**Archivos:** `lib/actions/ventas.ts` (1,191 líneas), `components/ventas/valoraciones/`

---

### TAREA 4 — Web: Valorización compras con precio negociado
**Estado:** ✅ Implementado. Verificar integridad end-to-end.

Lo que existe:
- `getValorizacionCompraPreview(reporteIds)` — preview con precio negociado
- `valorizarReportesCompra()` — crea valorización compra
- `setPrecioPorDiaReporteCompra()` — override precio/cantidad por ítem
- `FacturaCompraDialog` — facturar, pagos, detracción, deshacer
- Vistas: `view_compras_pendiente_valorizar`, `view_compras_pendientes_facturar`

**Archivos:** `lib/actions/compras.ts` (1,076 líneas), `components/compras/valoraciones/`

---

### TAREA 5 — Migración Bubble → Supabase (URGENTE: cutover 30/31 Mayo)
**Estado:** En progreso. Script corriendo hoy 2026-05-23.

**Plan de ejecución** (ver `docs/guia_migracion_bubble_supabase.md`):

| Fase | Acción | Comando | Estado |
|------|--------|---------|--------|
| 0 | Verificar log actual | `tail -f logs/migrate-all-prod-*.log` | 🔄 Corriendo |
| 1a | PDFs reportes usuario | `npx tsx scripts/migrate-user-reports-files.ts` | 🔄 En curso |
| 1b | Fotos/firmas maquinaria | `npx tsx scripts/migrate-maquinaria-files.ts` | ⏳ Pendiente |
| 1c | PDFs facturas (nunca ejecutado) | `npx tsx scripts/migrate-finance-files.ts` | ⏳ Pendiente |
| 2 | PDFs cotizaciones GRUAS | `npx tsx scripts/migrate-cotizaciones-bubble.ts` | ⏳ Pendiente |
| 3a | Fix FKs reportes maquinaria | `npx tsx scripts/fix-reports-v2.ts` | ⏳ Pendiente |
| 3b | Patch tarea_id links | `npx tsx scripts/patch-tarea-id-links.ts --dry-run` | ⏳ Pendiente |
| 4 | SQL patch cotizaciones_detalle.tarea_id | SQL directo (no existe script) | ⏳ Pendiente |
| 5 | Auditoría final | `npx tsx scripts/analyze-migration-gap.ts` | ⏳ Pendiente |

**Inconsistencias documentadas:** `docs/inconsistencias_migracion.md` (24 items, INC-001 a INC-024)

Las más críticas antes del cutover:
- **INC-001:** PDFs facturas en columna incorrecta (`pdf_factura` vs `pdf_factura_url`)
- **INC-002:** `valorizacion_compra/venta` en reportes_maquinaria son Bubble IDs
- **INC-003:** `cotizaciones_detalle.tarea_id` 100% NULL — patch SQL pendiente
- **INC-019:** `reportes_usuario.tenant_id` es TEXT no UUID
- **INC-020:** `formatos_informes` CISE sin bubble_id

---

## Convenciones del proyecto

- **Scripts de migración:** `scripts/` — todos idempotentes por bubble_id (upsert)
- **Logs:** `logs/migrate-all-prod-*.log`
- **Migraciones DB:** `supabase/migrations/` (50+ archivos, formato `YYYYMMDDHHMMSS_descripcion.sql`)
- **Tipos auto-generados:** `types/supabase.ts` — regenerar con `npx supabase gen types typescript --project-id wioozisskjjgjjybsoqo > types/supabase.ts`
- **Server actions** usan `adminClient` (service role) con filtro manual por `tenantId`
- **No hay FK reales** en muchas tablas históricas — el bubble_id es el identificador de reconciliación

---

## Qué NO hacer

- No ejecutar scripts de migración sin verificar el log del último run
- No hacer DROP o ALTER en producción sin dry-run previo
- No modificar `reporta.la` — es el sistema VIEJO (Bubble), no tocar
