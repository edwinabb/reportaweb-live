# CLAUDE.md — REPORTA · Contexto de sesión

## Ecosistema

**REPORTA** — SaaS de gestión operativa para empresas de grúas/maquinaria pesada. Multi-tenant.

| Repo | Ruta | Stack | Versión |
|------|------|-------|---------|
| Web admin | `c:\Proyectos\reportaweb3` | Next.js 16, React 19, TypeScript, Tailwind, Radix | **3.12.6** |
| App móvil | `c:\Proyectos\reporta-app` | Expo 54, expo-router, SQLite/Drizzle, React Native | **1.8.14** |
| DB / Backend | Supabase test `oyrokyyaeaeqzlsgxtto` (Brazil) / prod `fqwhagryqkkhbgznxtwf` (Brazil) | PostgreSQL + Auth + Storage | — |

**Tenants:** CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b` · GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`

**Infra:** Cloudflare Workers + OpenNext (**dev.reportar.app** → BD test · **reportar.app** apex → BD prod) · Repos deploy: `reportaweb-demo` / `reportaweb-live` (GitHub integration) · Gotenberg (PDF) · Resend (dominio verificado: `reportar.app`, from: `noreply@reportar.app`) · Sentry (solo client-side) · Cloudflare DNS

**Estándar de dominios (2026-07-22):** un solo dominio de cara al cliente — `reportar.app` (apex) = home con login embebido + `/novedades` + landings de campaña (prefijo por definir: marca/marketing) + `/registro` + app. `dev.reportar.app` = interno (BD test). `www` → 301 apex. `/login` → 301 a `/`. Nunca hardcodear dominio (usar `NEXT_PUBLIC_SITE_URL`). Detalle en [ARCHITECTURE.md § Domain & Routing Standard](./docs/ARCHITECTURE.md) · portable en [PLAYBOOK-DOMAIN-STRATEGY.md](./docs/PLAYBOOK-DOMAIN-STRATEGY.md). Home/landings/novedades = Growth Engine (track ventas).

> Detalle de deployment: [ARCHITECTURE.md § Infrastructure](./docs/ARCHITECTURE.md). Vercel fue reemplazado el 2026-07-13; cron jobs pendientes de migrar.

---

## Estado Actual

**Date:** 2026-10-30  
**Web Version (rama pendiente de release, sobre v3.12.6):**
- **Bridge PDF Bubble→v3 (Opción A — entity_type en callback):** `reporte_maquinaria` eliminado de `TIPOS_VALIDOS` del bridge (lo genera v3 internamente vía HTML→Gotenberg; no tenía plantilla .docx y nunca se encolaba desde Bubble). Quedan 5 tipos: `cotizacion`, `valorizacion_venta`, `valorizacion_compra`, `reporte_horas_maquinaria`, `reporte_personal`. Campo `entity_type` añadido al payload del callback (`lib/bubble-webhook.ts`); el cron `app/api/cron/pdf-jobs` ahora pasa `entity_type: job.template_key` en los 3 paths de notificación (éxito, template-not-found, reintentos agotados). En Bubble (app `reporta`, branch `test`): workflow `pdf-listo` (`coxvT`) recibe `entity_type` como param requerido; 5 acciones `ChangeThing` creadas (`coxvd`–`coxvh`), cada una con condición `entity_type == "<tipo>" AND status == "done"`, guardando `pdf_url` en el campo correcto del tipo de dato correspondiente. Mapeo tipo→data type→campo en `docs/TECHNICAL_DEBTS.md` § DUDA-BRIDGE-001. Migración: `supabase/migrations/20261029100000_remove_reporte_maquinaria_tipo.sql` — ⚠️ **pendiente aplicar en TEST+PROD**.
- **Sistema de módulos por tenant:** columna `modulos_activos TEXT[]` en `companies` (NULL = todos visibles, backward compat; array no-null = solo esos módulos habilitados). Implementado en `lib/config/menu.ts` (`MenuItem.modulo?`), `contexts/user-context.tsx` (`tieneModulo(key)`), `components/dashboard/sidebar.tsx` (filtro doble cargo+módulo) y nuevo `app/(dashboard)/formatos/layout.tsx` (protección server-side). Gestión Formatos (`/formatos`) es el primer módulo independizable. Migración: `supabase/migrations/20261029110000_add_modulos_activos_companies.sql` — ⚠️ **pendiente aplicar en TEST+PROD**.

**Web Version:** v3.12.6 — TK-OI7 implementado: numeración de cotizaciones corregida a **`CT-XXXX-YYYY`** (PR [#6](https://github.com/edwinabb/reportaweb3/pull/6), mergeado). `generateNumeroCotizacion` (`lib/actions/cotizaciones.ts`) generaba `CT 2026-0001` con un parseo roto para los formatos heredados de Bubble (`CT099-2026`, etc.); reescrito para calcular el consecutivo real desde `cotizaciones.numero` en cada generación (no un contador cacheado — Bubble sigue creando cotizaciones de CISE por delta-sync) + retry-on-conflict. `duplicateCotizacion` ya no agrega `" (Copia)"` al número. Detalle: `docs/superpowers/plans/2026-09-13-tk-oi7-numeracion-cotizaciones.md`. **Hallazgo nuevo durante la verificación:** la suite E2E tiene una falla de sesión preexistente y no relacionada (redirige a login incluso en tests sin modificar) — anotada en `docs/TECHNICAL_DEBTS.md` § DUDA-E2E-001, no bloqueó este cambio (verificado por test unitario + contra la BD real de TEST en su lugar).  
**Web Version anterior:** v3.12.5 — cierre de la **auditoría UI 15/15** (`docs/auditoria-ui/14-opciones-internas.md`, 2026-09-13, último módulo Opciones Internas comparado en vivo contra Bubble) + mapeo de roles de Bubble aplicado en PROD (P-006/TK-OI6: AdminEmpresa/AdminSistema → `admin_tenant`, Gestor → `supervisor`) + limpieza de 25 tenants residuales de PROD.  
**Web Version anterior a esa:** v3.12.4 — cierre del **recorrido completo Fases 1-9** (delta-sync + estándar CRUD/UX de todo `docs/guia_migracion_bubble_supabase.md`, 2026-09-08). Detonado al detectar que Cotizaciones nunca tuvo delta-sync desde el cutover de mayo por falta de `UNIQUE(bubble_id)`; se recorrieron las 9 fases en orden de dependencias en vez de parchear solo Cotizaciones. Resumen ejecutivo completo en `docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md`. Hallazgos y fixes de código de esta ejecución:
  - **Bug sistémico "proyecto Supabase equivocado"** (URLs apuntando al proyecto viejo/muerto `wioozisskjjgjjybsoqo.supabase.co` en vez de `fqwhagryqkkhbgznxtwf`): encontrado en 11 columnas/6 tablas (`companies.logo_url`, `cotizaciones_configuracion.imagen_banco`/`imagen_firma`, `cotizaciones.pdf_url`, `facturas_venta.pdf_valorizacion`/`pdf_factura_url`, `facturas_compra.pdf_factura`/`pdf_valorizacion`) — **~5.545 archivos recuperados desde Bubble y re-subidos al proyecto correcto**, ~690 residuales sin fuente real en el origen (no inventados, documentados abajo).
  - **Paginación truncada a 1.000 filas** (cap default de PostgREST sin `.range()`) en `getAllReportesMaquinaria`/`getAllReportesPersonal` (`lib/actions/reportes.ts`) — GRUAS tenía 18.514 reportes de maquinaria reales mostrando solo 1.000. Fix: `{page, limit}` + `count:'exact'` + `.range()`, mismo patrón que `getGlobalMaquinariaDocumentsPaged`.
  - Delta-sync aplicado en las 9 fases (Usuarios +19, Terceros +12, Maquinaria +20, Servicios: `servicios_tipos` 0→19 + `servicios` GRUAS +30, Cotizaciones +97/+185 detalle/+1.962 matriz + 108 PDFs, Reportes Maquinaria +2.651 filas + ~3.647 archivos, Reportes Personal +3.655 filas + 3.514 PDFs, Facturación +196/+112 facturas + 3.013/435 items + 3.854 PDFs recuperados).
  - `UNIQUE(bubble_id)` agregado donde faltaba (`areas`/`plazos_pago`/`bancos`, y confirmado en las tablas de Cotizaciones) — causa raíz del delta-sync roto.
  - TK-C2 (Cotizaciones): `ALTER TABLE cotizaciones DROP COLUMN periodo_cantidad` aplicado a TEST+PROD (columna muerta).
  - **`SUPABASE_SERVICE_ROLE_KEY` de PROD retirada de `.env.local`** (comentada) — ya no hay escrituras pesadas pendientes tras cerrar Fase 9.
**App Version:** v1.8.14  
**Foco activo previo (2026-07-23):** 🔀 **Cutover CISE/GRUAS (Bubble → v3)** — sacar a los 2 únicos clientes reales de Bubble. Plan: [docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md](./docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md) · handoff de esa fecha (histórico, superado por los planes de 2026-09): [HANDOFF-2026-07-23.md](./docs/HANDOFF-2026-07-23.md). **Con el recorrido Fases 1-9 cerrado, el gap de datos a nivel campo/delta-sync queda saneado en las 9 fases del plan maestro** — bloqueante residual = auditoría exhaustiva de estándar UI v1.2 (piloto "Cargos" corrido, ver pendientes abajo). **Growth Engine PAUSADO** (specs+planes A–E ✅; ver [PLAN-GROWTH-ENGINE-JOURNEY.md](./docs/PLAN-GROWTH-ENGINE-JOURNEY.md) + [HANDOFF-2026-07-18.md](./docs/HANDOFF-2026-07-18.md) para retomar).  
**Auditoría UI:** ✅ **15/15 módulos cerrados** — roadmap en [docs/superpowers/plans/2026-09-09-escalar-auditoria-ui-modulos-restantes.md](./docs/superpowers/plans/2026-09-09-escalar-auditoria-ui-modulos-restantes.md). Últimos cerrados: Cotizaciones (datos+PDFs; TK-C1/TK-C4 implementados 2026-09-09), Informes, Gestión EPP (`docs/auditoria-ui/08-epp.md`), Planes de Acción (`docs/auditoria-ui/10-planes-accion.md`), Ventas (`docs/auditoria-ui/11-ventas.md`), Compras (`docs/auditoria-ui/12-compras.md`), Gestión Formatos (DUDA D-02 resuelta, PR #3, `docs/auditoria-ui/09-formatos.md`), Perfil de Usuario (`docs/auditoria-ui/13-perfil-usuario.md`) y **Opciones Internas** (`docs/auditoria-ui/14-opciones-internas.md`, 2026-09-13 — incluye el **Sistema de Superadmin**, ex `reporta-admin`, deploy futuro en `sadm.reportar.app`). La única deuda de *cutover* que dejó Opciones Internas (TK-OI7, numeración de cotizaciones) ya se implementó, ver v3.12.6 arriba.  
**Template listados:** v1.2 aplicado a Usuarios, Maquinaria y Terceros. Piloto "Cargos" corrido para refinar el checklist de auditoría exhaustiva (v1 con 6 ambigüedades detectadas, encontró además una implementación huérfana/duplicada a eliminar) — v2/v3 del checklist no iterado todavía, no re-ejecutar el piloto, iterar sobre lo ya encontrado.  
**E2E Suite:** ⚠️ desactualizada tras template v1.2 + cambio personal externo (DUDA-E2E-001 · TESTING.md § TEST-003). Re-verificada 2026-09-26: la falla de sesión reportada el 2026-09-14 **NO se reproduce hoy** (10/11 tests OK en `12-cotizaciones`); el único que falla es el nuevo test de TK-OI7 por un `Runtime Error: Jest worker …` de Turbopack al renderizar `/cotizaciones/[id]` tras el submit — probable dev server viciado, pendiente confirmar tras restart.

**Deploy demo (pipeline funcionando):**
- Push a `demo/master` → Cloudflare Workers Builds (worker `reportaweb-demo`)
- Build: `npm run build:demo && npx opennextjs-cloudflare build` (usa `.env.demo` → BD TEST)
- Deploy: `npx wrangler deploy --config wrangler.demo.toml`
- Secrets del worker (dashboard): `SUPABASE_SERVICE_ROLE_KEY` (TEST)
- **reportar.app** (prod): 🟡 worker `reportaweb-live` existe y funciona desde 2026-09-08 (`reportaweb-live.ancient-block-882d.workers.dev`, secret `SUPABASE_SERVICE_ROLE_KEY` cargado). **Bind del apex postergado** por decisión del usuario 2026-09-26 hasta que Growth Engine tenga home implementada (para no dejar el apex solo con `/login`); `reportar.app` sigue sirviendo `ReportaLanding`. Rebind `demo.reportar.app`→`dev.reportar.app`: `wrangler.demo.toml` actualizado 2026-09-26 con ambos `routes`, pendiente `npx wrangler deploy --config wrangler.demo.toml`. Rotar secret por `sb_secret_` sigue pendiente (DUDA-SEC-001). Detalle en [TECHNICAL_DEBTS.md](./docs/TECHNICAL_DEBTS.md).

**⚠️ Hallazgo 2026-09-10 (pendiente confirmar en Bubble):** revisión a fondo de tablas de Ventas/Compras encontró 4 gaps: (1) `cobros_venta` vacía en PROD — pagos migrados quedaron en `factura_venta_pagos` (521 filas) que la app nunca lee, 0 de 3.130 facturas de venta muestran cobro; (2) `facturas_compra_pagos` con cobertura sospechosa (20/1.473, 1,4%), nunca verificada contra Bubble; (3) **`bancos` completamente vacía (0 filas, ningún tenant)** — nunca migrada, bloquea registrar cobros nuevos; (4) `valorizaciones` asimétrica entre tenants — CISE tiene 752 filas, **GRUAS tiene 0** pese a ser el tenant con más facturación real, y 0 filas son de tipo Compra en todo el sistema. Detalle en [docs/auditoria-ui/residuales-pagos-facturacion.md](./docs/auditoria-ui/residuales-pagos-facturacion.md) y `docs/pendientes_por_resolver.md` § P-005. No bloquea el cierre UI ya hecho de Ventas/Compras, pero varios datos financieros no son confiables hasta resolverlo.  
**✅ 2026-09-13 — Opciones Internas cerró la auditoría UI (15/15).** Comparación en vivo contra Bubble (`docs/auditoria-ui/14-opciones-internas.md`). Limpieza: 25 tenants residuales borrados de PROD (`companies` queda solo con CISE y GRUAS). **P-006 (perfiles de Bubble nunca mapeados a `profiles.role`, GRUAS con 0 `admin_tenant`) resuelto y aplicado en PROD** el mismo día (CISE 8 `admin_tenant`, GRUAS 11 `admin_tenant` + 1 `supervisor`). **Queda abierto P-007 / TK-OI7:** la numeración de cotizaciones de v3 no continúa la serie de Bubble por tenant — deuda ALTA de *cutover* en `docs/TECHNICAL_DEBTS.md`, requiere confirmar formato con el usuario antes de tocar `generateNumeroCotizacion`.  
**Próximo paso (2026-10-30):** acciones bloqueadas esperando al usuario:
- **(P-008-A)** Aplicar en TEST (`oyrokyyaeaeqzlsgxtto`) y PROD (`fqwhagryqkkhbgznxtwf`) los 2 SQL desde el dashboard Supabase: `20261029100000_remove_reporte_maquinaria_tipo.sql` + `20261029110000_add_modulos_activos_companies.sql`. El MCP no tiene permisos de escritura.
- **(P-008-B)** Inicializar call "Generar PDF" en el API Connector de Bubble (app `reporta` → Plugins → API Connector → "Reporta PDF Bridge" → "Generar PDF" → "Initialize call") — falla con 403 via MCP por bot protection de Cloudflare. Body de prueba: `tenant_id=1cb97ec7…`, `template_key=cotizacion`, `doc_category=comercial`, `entity_id=test-init-001`. Requiere que el secret `BUBBLE_PDF_BRIDGE_API_KEY` ya esté cargado en el worker `reportaweb-demo`.
- **(P-008-C)** 4 plantillas `.docx` para el bridge: `valorizacion_venta`, `valorizacion_compra`, `reporte_horas_maquinaria`, `reporte_personal` — conseguir los archivos Word base (probablemente exportar de docmaker como se hizo con cotización) y subirlos a Storage → `system-templates` bucket → path `docs/{cise|gruas}/{tipo}-1.docx`. Luego insertar filas en `system_document_templates` (`is_active=true`). Detalle en `docs/pendientes_por_resolver.md` § P-008.
- **(P-anteriores vigentes)** (a) `scripts/test-promote-info-reporta-admin.sql` en TEST; (b) `npx wrangler deploy --config wrangler.demo.toml` (activar `dev.reportar.app`); (c) aprobar P-005-A (backfill cobros CISE); (d) confirmar primera cotización nueva CISE en PROD tras deploy. Superadmin: Resend key + prueba PIN en vivo.  
**Deudas técnicas:** [docs/TECHNICAL_DEBTS.md](./docs/TECHNICAL_DEBTS.md) (rotar key PROD = ALTA · DUDA-E2E-001 re-verificada 2026-09-26 — la falla de sesión reportada el 2026-09-14 NO se reproduce hoy; sí se encontró y fixeó un selector Radix mal escrito en el test TK-OI7 nuevo, y quedó pendiente un `Runtime Error: Jest worker encountered 2 child process exceptions` de Turbopack al renderizar `/cotizaciones/[id]` tras crear una cotización — probable dev server viciado, verificar tras restart)

---

## Documentation Index

Quick links to specialized documentation:

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — Technical decisions, schema patterns, conventions, data flows
- **[ROADMAP.md](./docs/ROADMAP.md)** — P1-P5 priorities, deuda técnica, 2026-Q2 timeline, blockers
- **[TESTING.md](./TESTING.md)** — E2E suite architecture, results, new tests, next steps

---

## Quick Commands

```bash
# Web (c:\Proyectos\reportaweb3)
npm run dev                   # http://localhost:3000
npm run build                 # build prod (must pass TS)
npm run test:e2e              # E2E suite (388 tests, ~40 min)
npm run types:supabase        # regen types/supabase.ts

# App (c:\Proyectos\reporta-app)
npm start                     # expo start --dev-client
cd android && gradlew assembleRelease   # APK
cd android && gradlew bundleRelease     # AAB
```

