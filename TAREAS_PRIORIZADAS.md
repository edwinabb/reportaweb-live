# Plan de Tareas Priorizadas — REPORTA WEB v3

> Fecha: 2026-04-23 jueves — v3.5.2. **UAT: sáb 2026-04-26 → vie 2026-05-01. Cutover: sáb 2026-05-02** (9 días).
> Audits: [docs/auditoria/](docs/auditoria/) · Plan de pruebas: [docs/PLAN-PRUEBAS-PRE-CUTOVER.md](docs/PLAN-PRUEBAS-PRE-CUTOVER.md) · Historia: [DOCUMENTACION_PROYECTO.md §16](DOCUMENTACION_PROYECTO.md) · Memoria: [memory/MEMORY.md](C:/Users/Usuario/.claude/projects/c--Proyectos-reportaweb3/memory/MEMORY.md).

---

## Estado consolidado

### ✅ Hecho (al 2026-04-23 v3.5.2)

**Dev-env verde — última verificación 2026-04-23:**

- `tsc --noEmit` → 0 errores.
- `next build` prod → OK (57 rutas server-rendered-on-demand).
- Playwright suite completa → 32/32 passed (2.9 min).
- Sin TODOs/FIXMEs reales en el código TS.

**Ronda v3.5.2 (hoy, pre-UAT hardening):**

- `efc60c5` fix locators strict-mode en spec 08 (getByRole preciso).
- `566b98e` limpia cadena de errores de `next build` prod: dead code (`terceros/create/`, `cotizacion-pdf-config-form.tsx`), `dynamic = 'force-dynamic'` en dashboard layout, Suspense wrap en `/planificacion`, tsconfig excluye `scripts/`, null-coerce en 7 inputs de servicio-form, Buffer→Uint8Array, zod `.issues`, null-guards en users/tests/helpers. Embeds PostgREST: PGRST201 ambiguo `formatos↔formatos_versiones` disambiguado con `!formatos_version_actual_fkey` + `!formatos_versiones_formato_id_fkey`, PGRST200 `formatos↔formatos_informes` reescrito como join anidado por versiones, normalize array→object de `version_actual` en 4 funciones, cast via `unknown` en route.ts y informe-read-view. Detalle en `DOCUMENTACION_PROYECTO.md` §16 v3.5.2.

### ✅ Hecho (al 2026-04-21 noche v3.5.1)

- Migración v3.1.22, smoke + Flows 2/3/4/5/6, EPP 1-5, catálogos pre-cutover, audits 01-10.
- **Fase A** — SQL base aplicada en cloud: `config_informe_*`, `config_valorizacion_*`, `bancos`, `cobros_venta`, detracción en `facturas_venta`, `tonelaje_solicitado`, `jornada3_*`, firmas URL, `salida_autorizada_por`, `foto_reporte_escrito_url`, 10 tablas `formatos_*` con triggers + correlativo atómico. Seed CISE+GRUAS.
- **Fase B** — PDF templates config-aware: reporte-personal, reporte-maquinaria, valorización-venta.
- **Brief APP 2do dev** + `checklist-spec-v3.md` reconstruido (1653 líneas).
- **Fase C** — `/settings/informes` + `/settings/valorizaciones` + menú.
- **Fase F — Ventas 🔴 completa (10 sub-fases, 5 commits):**
  - F.1 Dialog "Valorizar Venta" bulk con código `YYYY-NNNNN` consecutivo, preview con subtotal/IGV/detracción desde `config_valorizacion_venta`, validaciones (mismo cliente + moneda). Server actions `getValorizacionPreview`, `valorizarReportes`, `deshacerValorizacion`.
  - F.2 PDF Valorización — endpoint `GET /api/valorizaciones/[codigo]/pdf` que rinde `lib/valorizacion-venta-pdf-template.ts` vía Gotenberg. Link activo en columna "Valoración".
  - F.3 Menú masivo completo en listado valorizaciones: Valorizar, PDF Valorización, Deshacer Valorización (con AlertDialog rojo + guardas de código único y estado), Facturar (F.4 stub).
  - F.4 Listado `/ventas/facturas` funcional con 3 KPIs (facturado/cobrado/pendiente), toolbar con búsqueda + filtros de estado, 13 columnas, acciones por fila (Ver, Editar, PDF cliente, PDF Valorización).
  - F.5 Dialog Ver/Editar Factura con secciones Datos / Montos / Detracción, modo edición togglable, campos editables (N° Factura, fechas, días, URL del PDF del cliente, campos de detracción).
  - F.6 Cobros parciales: NuevoCobroDialog (tipo + monto + moneda + fecha + banco + comentarios) con tabla de cobros registrados, anulación soft, recálculo automático de `monto_pagado_factura` + `pendiente_por_cobrar_*` + `estado_pago` en cascada.
  - F.7 Registro de Detracción — dialog con porcentaje, monto S/, a cargo de (CLIENTE/EMPRESA), N° constancia, fecha pago. Valida constancia obligatoria.
  - F.8 Deshacer Factura: AlertDialog rojo → soft-delete + cobros anulados + reportes a VALORADO + `factura_venta_item=null` (valorización disponible para refacturar).
  - F.9 Menú ⋮ individual por reporte en valoraciones: Copiar ID, Ver PDF reporte, Precio por Día (stub), Deshabilitar informe (con guardas — no permite si valorizado o facturado).
  - F.10 Cross-module consistency verificado en todas las server actions: guardas preventivas (deshacerValorizacion aborta si facturado; deshabilitarReporteMaquinaria aborta si valorizado/facturado), recálculo automático en cascada post-cobro/anulación, rollback best-effort en inserts multi-tabla. Matriz de 11 escenarios de consistencia documentada en 5.6.2.
  - **Alcance diferido** (F.8+ pending): upload real de PDF al bucket Storage (hoy solo URL manual), crear factura nueva desde el dropdown de valoraciones (requiere workaround de `facturas_venta.bubble_id NOT NULL` legacy), Informe de Movilización virtual.
- **Fase E — Cotizaciones 🔴 completa:**
  - E.1 Paso 3: Histórico Clientes filtrable por **cliente actual** (toggle) + server action `getHistoricalClientQuotes` acepta `cliente_id` opcional
  - E.2 Post-aprobación: `finalizarAprobacion` arreglado (código T-YYYY-XXXX consecutivo, estado válido BORRADOR, persiste `cotizaciones.tarea_id`) + card "Tarea generada" en Paso 5 con CTA "Ver tarea" que deep-linkea a `/planificacion?tarea=<id>` y auto-abre el detail dialog
- **Fase D completa** — 6 de 6 subtareas:
  - Reporte Personal form config-aware
  - Reporte Maquinaria form config-aware
  - Wizard Interno/Externo + Proveedor RH (personal y maquinaria)
  - Listado planificación con nombres reales + agrupación por fecha + fix `is_active NULL` en `getAvailability`
  - D.4 Detalle dialog enriquecido: título real + cliente/RUC/contacto/sitio/cotización/prioridad/confirmada/comentarios + recursos con nombres legibles y badge Interno/Externo
  - D.6 Buscador de tarea: input por código/título/cliente/cotización + toggle "Solo cotización aprobada"
- **Fixes 2026-04-21 (commit `d232eeb`):**
  - Matriz de responsabilidad: **3162 rows corregidas** desde Bubble (script [scripts/fix-matriz-from-bubble.ts](scripts/fix-matriz-from-bubble.ts)). Nombres reales desde catálogo, descripciones, responsable recalculado con `responsable_empresa` + `responsable_cliente` (39 casos AMBOS que se habían perdido en la migración original).
  - Storage RLS: `lib/actions/storage.ts` ahora usa `adminClient` para subir (imágenes de banco/firma ya no chocan con RLS).
  - Click en código de cotización del listado abre `pdf_url` en nueva pestaña si existe.
  - Re-migrados 3 PDFs CISE desde Bubble (CT 226-2025, CT067-2026, CT068-2026). Los otros 327/331 sin `pdf_url` nunca tuvieron PDF en Bubble tampoco (campo `Archivo_web` vacío) — no es bug de migración.
- **Fase G — Compras 🔴 completa (11/11 sub-fases, 4 commits):**
  - G.2: [lib/actions/compras.ts](lib/actions/compras.ts) — 15+ server actions (panel, valoraciones, preview valorizar, valorizar/deshacer, facturas CRUD, pagos al proveedor, detracción retenida, acciones individuales). Código `C-YYYY-NNNNN` para no colisionar con ventas. `bubble_id NOT NULL` legacy resuelto con `randomUUID()`.
  - G.3: `/compras/panel` con KPIs + 2 listas agrupadas por proveedor (pendientes valorizar / pendientes facturar) + navegación con filtros.
  - G.4-G.7: `/compras/valoraciones` con 20 columnas + filtros + selección múltiple + dropdown masivo (Valorizar Compra / Deshacer / Registrar Factura del Proveedor). `RegistrarFacturaCompraDialog` con upload PDF obligatorio al bucket `cotizaciones/facturas-compra/`.
  - G.8-G.10: `/compras/facturas` con 13 col + 3 KPIs + filtros. `FacturaCompraDialog` con 4 secciones (Datos editables/Montos/Pagos/Detracción). Nuevo Pago parcial recalcula cascade. Detracción retenida con constancia obligatoria. Deshacer factura cascade. Anular pago individual con hard-delete.
  - G.11: redirect `/compras` → `/compras/panel`.
  - **Estado:** código + typecheck limpio. Smoke test en navegador pendiente (Fase I).

### 🔄 Ejecución pendiente (objetivo pre-cutover)

**Directiva del usuario 2026-04-21:** Seguir con G → H → I → J → K → O → L. **M, N, P, Q quedaron fuera de scope pre-cutover.**

Backlog actualizado al 2026-04-21 (post ejecución H/J/K/L/O-parcial):

| Fase | Subtarea | Estado |
|------|----------|--------|
| H | Formatos WEB (seed 2 + admin + editor + llenado + PDF) | ✅ completa 8/8 |
| J | Resend setup + EPP Fase 6 (emails alertas) | ✅ completa |
| K | EPP Fase 7 (reporte semanal + cron Vercel) | ✅ completa |
| L | EPP Fase 8 (tests E2E smoke) | ✅ completa |
| O | Agenda admin `/admin/agenda` | ✅ completa |
| O | Portal cliente `/portal/[token]` | 🟡 diferido post-cutover |
| I | Testing + smoke-test **manual** + Cutover | 🔴 pendiente (bloquea 2026-05-02) |

**Decisiones confirmadas 2026-04-21 (desbloqueo H):**
1. Plantillas seed: CISE `INF-10676 V.03` + GRUAS `INF-3458 V.03` (PDFs del cliente).
2. Editor UX: Google Forms-like (lista + ↑↓).
3. PDF output del informe llenado: obligatorio pre-cutover → implementado en `/api/informes/[id]/pdf`.

**Plan semana objetivo dev-done viernes 2026-04-25 / cutover sábado 2026-05-02:**

> Decisión de infra 2026-04-21: app server a **Vercel Pro**, DNS en Cloudflare, Resend para emails. Runbook en [DEPLOYMENT.md](DEPLOYMENT.md).

| Día | Tarea | Responsable |
|---|---|---|
| Mar 04-22 | Crear cuenta Resend + verificar dominio `reporta.la` (SPF/DKIM/DMARC). Generar API key. | Edwin |
| Mar 04-22 | Cloudflare DNS: CNAME `app → cname.vercel-dns.com` + registros Resend. | Edwin |
| Mar 04-22 | Vercel: import repo, pegar env vars, plan Pro, habilitar Cron Jobs. Primer deploy. | Edwin |
| Mié 04-23 | Smoke test en prod: H Formatos/Informes (crítico — módulo nuevo más grande). | Edwin |
| Mié 04-23 | Smoke G Compras + J/K emails + O Agenda. | Edwin |
| Jue 04-24 | GRUAS sube imagen_banco + imagen_firma en `/settings/cotizaciones`. | GRUAS admin |
| Jue 04-24 | Pulir regresiones descubiertas. Reservar buffer. | Edwin |
| Vie 04-25 | Cierre de dev + handoff a UAT fin de semana. Tag `v3.6.0` si hay sentido de release. | Edwin |
| Sáb-Vie 04-26 → 05-01 | UAT con usuarios reales (CISE + GRUAS). | Edwin + cliente |
| Sáb 05-02 | 🔒 **Cutover** definitivo. | Edwin |

**Estado de imágenes cotizaciones:**

- CISE ✅ (subidas 2026-04-21, HTTP 200 image/jpeg).
- GRUAS ❌ pendiente. Check: `npx tsx scripts/check-imagenes-cotizaciones.ts`.
| P | Deuda técnica (bubble_*.json, logger, `any`, eslint, README) | 16h | — | 🟢 |
| Q | Mejoras (dashboard gráficos, auditoría, paginación, filtros) | 20h | — | 🟢 |

**Total objetivo pre-cutover:** ~322h / 13 días laborables (~24h/día — se sobrepasa la capacidad; de ahí el compromiso de "revisamos qué no se alcanza").

**Track paralelo (no compite por tiempo del dev principal):** APP móvil Formatos Expo (~96h) en repo `reporta-app` por 2do dev — ver [docs/APP-FORMATOS-BRIEF-2DO-DEV.md](docs/APP-FORMATOS-BRIEF-2DO-DEV.md).

---

## Fase D (completar) — Planificación

### D.4 Detalle de tarea dialog

Ver [docs/auditoria/07-planificacion.md](docs/auditoria/07-planificacion.md) §7.3.

- Enriquecer [components/tareas/tarea-detail-dialog.tsx](components/tareas/tarea-detail-dialog.tsx):
  - Mostrar **título de tarea real** (hoy dice "Detalle de Tarea" hardcoded).
  - Cliente + RUC + Sitio + Cotización (trazabilidad) + Prioridad + Confirmada + Comentarios.
  - Lista de personal con **nombres** (no IDs) y maquinaria idem.
  - Indicar internos vs externos (badge).
- Hydratar datos extra con `getTareaById(tareaId)` que ya existe en `lib/actions/planificacion.ts`.

### D.6 Búsqueda de tarea

- Input de búsqueda en `/planificacion` (filtra por código, título, cliente).
- Filtro por "cotización aprobada" (join con cotizaciones estado=aprobada).

---

## Fase E — Cotizaciones

Ver [docs/auditoria/06-cotizaciones.md](docs/auditoria/06-cotizaciones.md).

- **E.1** Paso 3 wizard cotización: mostrar **históricos** de cotizaciones emitidas al cliente + **ofertas recibidas** del servicio (query de `cotizaciones` por cliente y por servicio).
- **E.2** Paso 5: mostrar `T-XXXX` tras aprobación (columna en listado + cta "Ver tarea").

---

## Fase F — Ventas

Ver [docs/auditoria/09-ventas.md](docs/auditoria/09-ventas.md). Paneles + listados + dialogs + workflow.

- F.1 Dialog **Valorizar Venta** (agrupar reportes, calcular subtotal/IGV/detracción, marcar VALORADO).
- F.2 PDF Valorización G.PAC-04 V.05 (template Fase B ya listo, falta el botón).
- F.3 Menú masivo en listado valorizaciones: PDF / Deshacer / Editar / Facturar.
- F.4 **Facturación**: listado completo (18 columnas + totales arriba).
- F.5 Ver/Editar Factura dialog (upload PDF real del cliente).
- F.6 Nuevo Cobro dialog + múltiples cobros parciales → tabla `cobros_venta` (ya creada).
- F.7 Dialog Detracción (marcar retenida + número constancia + fecha pago).
- F.8 Deshacer Factura (rollback en cascada de estados).
- F.9 Menú individual por informe: PDF Reporte, Cambiar estado, Precio por Día, Informe Movilización virtual, Deshabilitar.
- F.10 **Cross-module consistency**: marcado/desmarcado reporte ↔ valorización ↔ factura ↔ cobro.

---

## Fase G — Compras (espejo de F)

Ver [docs/auditoria/10-compras.md](docs/auditoria/10-compras.md). Reutilizar componentes de Ventas agresivamente.

- G.1 Panel Compras (KPIs + listas por proveedor).
- G.2 Listado valorizaciones compra (filtro `maquinaria.propietario='tercero'` — view BD existe).
- G.3 Dialog Valorizar Compra.
- G.4 Listado Facturas de compra.
- G.5 Registrar Factura Proveedor (upload PDF + N° factura proveedor + tasa cambio).
- G.6 Nuevo Pago al proveedor (tabla `facturas_compra_pagos` existe).
- G.7 Detracción retenida al proveedor (columnas en `facturas_compra` existen).
- G.8 Deshacer Factura Compra.
- G.9 Acciones individuales espejo F.9.

---

## Fase H — Formatos WEB (paralelo)

Ver [docs/auditoria/08-formatos.md](docs/auditoria/08-formatos.md).

- H.1 **Seed 2 plantillas** (CISE + GRUAS). **Cuáles: por definir al arrancar Fase H.** Script idempotente usando schema relacional `formatos_*`.
- H.2 Admin CRUD plantillas `/formatos`.
- H.3 Editor de versiones drag&drop preguntas + preview `/formatos/[id]/versiones/[v]`.
- H.4 Flujo publicar versión (estado PUBLICADA inmutable — trigger DB).
- H.5 Formulario llenado web `/informes/nuevo` (reemplaza `DynamicInspectionForm`).
- H.6 Lista `/informes` + aprobación/rechazo/comentarios.
- H.7 Integración con tab "Inspecciones" del detalle de tarea.

**Diferible post-cutover:**
- Portal cliente `/portal` (~12h).
- Agenda de tareas admin `/admin/agenda` (~12h).

### APP móvil — track paralelo 2do dev

Brief autocontenido: [docs/APP-FORMATOS-BRIEF-2DO-DEV.md](docs/APP-FORMATOS-BRIEF-2DO-DEV.md). No bloquea 2026-05-02; entrega estimada 6-8 semanas post-cutover.

---

## Fase I — Testing + Deploy

- **I.1** Ejecutar [docs/PLAN-PRUEBAS-PRE-CUTOVER.md](docs/PLAN-PRUEBAS-PRE-CUTOVER.md) secciones 1-8 completas.
- **I.2** Fix regresiones detectadas.
- **I.3** Regen types final.
- **I.4** Chequeo DB sección 9 del plan.
- **I.5** Checklist go/no-go sección 10.
- **I.6** **Cutover sábado 2026-05-02 prod**.

---

## Fase J — Resend + EPP Fase 6 (emails)

- J.1 Setup Resend (domain verify, templates base).
- J.2 Template de alerta EPP por email.
- J.3 Cron/scheduler que dispara alertas según `alertas_config` EPP.
- J.4 Template de confirmación de cotización (para Flow 1 de fase M).

---

## Fase K — EPP Fase 7 (reporte semanal)

- K.1 Job que arma reporte semanal de entregas/alertas por tenant.
- K.2 Template de email + envío a responsable EPP.
- K.3 Historial de reportes emitidos `/epp/reportes/semanales`.

---

## Fase L — EPP Fase 8 (tests E2E)

- L.1 Playwright: entregar EPP → alerta → vencimiento.
- L.2 Playwright: exportar reporte + email.

---

## Fase M — Flow 1 E2E (cotización + aprobación)

- M.1 Playwright: crear cotización → enviar email → cliente aprueba → se crea tarea T-XXXX.
- Requiere Fase J (Resend) operativa para los emails.

---

## Fase N — Flows 7/8/9 E2E (Ventas/Compras)

- N.1 Flow 7: valorizar → PDF → deshacer.
- N.2 Flow 8: facturar → cobros parciales → detracción.
- N.3 Flow 9: compras espejo (valorizar compra → factura proveedor → pago).

---

## Fase O — Portal Cliente + Agenda admin

- O.1 Portal cliente `/portal`: login sin tenant (rol `cliente_externo`), lectura de sus informes + firma en canvas para validación horas.
- O.2 Agenda tareas admin `/admin/agenda`: calendario consolidado.

---

## Fase P — Deuda técnica

- P.1 Eliminar `bubble_*.json` y scripts migratorios ya ejecutados.
- P.2 Logger estructurado (pino/winston) con niveles por tenant.
- P.3 Eliminar `any` en componentes (ya hay lista parcial en warnings de TS).
- P.4 Config ESLint y fix de `react-hooks/set-state-in-effect` pre-existentes.
- P.5 README operativo.

---

## Fase Q — Mejoras

- Q.1 Dashboard gráficos de tendencia (ventas, EPP, inspecciones).
- Q.2 Auditoría/logs de cambios (trigger `updated_by` + tabla `audit_log`).
- Q.3 Paginación server-side en listados grandes (> 500 rows).
- Q.4 Filtros avanzados combinables en los listados.

---

## Track paralelo (no compite por tiempo del dev principal)

### APP móvil Formatos (~96h, 6-8 semanas)

Expo + React Native + expo-sqlite + Drizzle + worker de sync + background fetch + firma PIN + biometría. Ver [docs/APP-FORMATOS-BRIEF-2DO-DEV.md](docs/APP-FORMATOS-BRIEF-2DO-DEV.md) + `checklist-spec-v3.md` secciones 5-6. **Dev separado en repo `reporta-app`.**

---

## Revisión de avance previa al cutover

**Propósito:** ver qué de J-Q se alcanza. Lo que no, se documenta como cola post-cutover (con la lección aprendida por qué se movió) y se notifica al usuario antes del 2026-05-02.

**Momento:** cuando se termine la Fase I smoke tests o el 2026-04-29 (lo que ocurra primero).

---

### Pendientes de discusión

- Proceso de cálculo de comisiones (6 preguntas sin responder).
- Decisión `tipo_tarea`/`cotizacion_ref`/`servicio_ref` en `tareas` (UI expone, DB no tiene).
- Unificación futura de reportes bajo modelo Formatos (arquitectura post-cutover).
- Rol `cliente_externo` para Portal Cliente (enum vs tabla separada).
- Qué 2 plantillas Formatos migrar.

---

## Próximo comando

Retomar Fase D.4 — enriquecer `tarea-detail-dialog.tsx` con título real + datos de cliente/cotización/sitio/recursos con nombres.
