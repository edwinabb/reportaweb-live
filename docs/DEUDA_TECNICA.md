# Deuda Técnica

---

## ✅ RESUELTO — URLs de email corregidas (cotizaciones, EPP, documentos vencidos)

**Versión:** v3.10.31 — 2026-05-29  
**Archivos:**
- `lib/actions/cotizaciones.ts` — `notificarPlanner` usaba `NEXT_PUBLIC_APP_URL` (inexistente) con fallback `reporta.app`; corregido a `NEXT_PUBLIC_SITE_URL` + `web.reportar.app`
- `lib/actions/epp.ts` — fallback `app.reporta.la` → `web.reportar.app`
- `app/api/cron/documentos-vencidos/route.ts` — fallback `app.reporta.la` → `web.reportar.app`

---

## ✅ RESUELTO — Seed contactos_cargo y contactos_area (OPCIONAL-A / DT-MIG01)

**Versión:** v3.10.30 — 2026-05-29  
**Migration:** `supabase/migrations/20260529000003_seed_contactos_cargo_area.sql`  
**Qué se resolvió:**
- `contactos_cargo`: ADMINISTRADOR, ASISTENTE COMPRAS, GERENTE, OPERADOR, SUPERVISOR para CISE y GRUAS
- `contactos_area`: ADMINISTRACIÓN, COMPRAS, LOGÍSTICA, OPERACIONES, SEGURIDAD para CISE y GRUAS
- Nota: Bubble no tiene campos cargo/area en `terceros_contactos` — catálogo base manual

---

## ✅ RESUELTO — view_tareas_agenda_diaria + fuente_foto en formatos_preguntas

**Versión:** v3.10.29 — 2026-05-29  
**Migrations:**
- `supabase/migrations/20260529000001_add_fuente_foto_formatos_preguntas.sql`
- `supabase/migrations/20260529000002_create_view_tareas_agenda_diaria.sql`  
**Qué se resolvió:**
- `formatos_preguntas.fuente_foto TEXT CHECK ('solo_camara'|'camara_o_galeria') DEFAULT 'solo_camara'` — bloqueaba el renderer FOTO en la app
- Vista `view_tareas_agenda_diaria` creada en test y prod — bloqueaba pantalla "Mis Tareas" en la app

---

## ✅ RESUELTO — RLS tenant isolation tablas EPP, reportes_usuario y maquinaria_documentos

**Versión:** v3.10.28 — 2026-05-29  
**Migration:** `supabase/migrations/20260529100000_fix_rls_epp_reportes.sql`  
**Qué se resolvió:**
- `sst_epp_entrega/item/movimiento/alerta/reporte`: habilitado RLS + policy `tenant_isolation` con `get_auth_tenant_id()`
- `reportes_usuario`: reemplazada policy `SELECT USING (true)` por filtro por tenant
- `maquinaria_documentos` / `maquinaria_tipos_docs`: agregadas policies (RLS estaba habilitado sin ninguna policy)

---

## PDF — Cotizaciones (lista "Gestión")

**Prioridad:** Alta  
**Contexto:** El botón PDF en la lista de cotizaciones (`/cotizaciones`) sólo muestra el PDF si `pdf_url` ya está guardado. Para cotizaciones migradas desde Bubble sin PDF almacenado en Supabase, el link lleva a la página de detalle en lugar de abrir el PDF.  
**Lo que se necesita:**
- Ruta `/api/cotizaciones/[id]/pdf` que genere el PDF de la cotización on-demand (similar a `/api/reportes-maquinaria/[id]/pdf`)
- Script de backfill que descargue los PDFs de cotizaciones desde Bubble CDN y los suba a Supabase Storage (`cotizaciones-pdf` bucket)
- Actualizar `cotizaciones-columns.tsx` para usar el nuevo endpoint si `pdf_url` es null

---

## ✅ RESUELTO — Variables de entorno Vercel (NEXT_PUBLIC_ENV + NEXT_PUBLIC_SITE_URL)

**Versión:** v3.10.28 — 2026-05-29  
**Qué se resolvió:** Variables configuradas en Vercel para test y producción. Banner "SERVIDOR DE PRUEBAS" visible solo en test ✅

---

## Migración sábado 2026-05-30 — Pendientes de ejecución

**Prioridad:** Crítica  
**Contexto:** Cutover Bubble → Supabase, se ejecutan el sábado con token de producción.  
**Secuencia:**
1. `migrate-all-prod.ts` (orquestador completo)
2. `migrate-informe-respuesta.ts --step=inspect-preguntas` (verificar campos Bubble antes de migrar)
3. `migrate-informe-respuesta.ts --step=migrate --target=prod --run` (detalles 2026+)
4. `backfill-pdfs-inspecciones.ts --target=prod --run`
5. `backfill-pdfs-maquinaria.ts --target=prod --run` (93 registros)
6. `backfill-pdfs-personal.ts --target=prod --run` (228 registros)
7. Aplicar 2 migraciones SQL pendientes
8. Actualizar DNS

---

## PDF — Listado de Planificación

**Prioridad:** Media  
**Contexto:** La vista Listado en `/planificacion` muestra las tareas de la semana con recursos, estados y fechas. Falta un botón para exportar ese listado como PDF imprimible.  
**Lo que se necesita:**
- Botón "Exportar PDF" en el sub-toolbar del Listado
- Endpoint `/api/planificacion/pdf` o ruta de preview `/planificacion/preview` que renderice la tabla de tareas de la semana seleccionada
- Usar Gotenberg (GOTENBERG_URL) para generar el PDF

---

## PDF — Panel de Valoraciones y Facturación

**Prioridad:** Media  
**Contexto:** Las páginas de valoraciones (`/ventas/valoraciones`, `/compras/valoraciones`) y facturación (`/ventas/facturas`, `/compras/facturas`) muestran listados de registros. Falta un PDF del panel completo (no del detalle individual).  
**Lo que se necesita:**
- Botón "Exportar PDF" en el toolbar de cada panel
- Ruta de preview o endpoint que renderice el resumen del período seleccionado
- Incluir totales, filtros aplicados y rango de fechas en el encabezado del PDF
- Usar Gotenberg (GOTENBERG_URL)
