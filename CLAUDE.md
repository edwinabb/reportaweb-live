# CLAUDE.md — REPORTA · Contexto de sesión

## Ecosistema

**REPORTA** — SaaS de gestión operativa para empresas de grúas/maquinaria pesada. Multi-tenant.

| Repo | Ruta | Stack | Versión |
|------|------|-------|---------|
| Web admin | `c:\Proyectos\reportaweb3` | Next.js 16, React 19, TypeScript, Tailwind, Radix | **3.12.4** |
| App móvil | `c:\Proyectos\reporta-app` | Expo 54, expo-router, SQLite/Drizzle, React Native | **1.8.14** |
| DB / Backend | Supabase test `oyrokyyaeaeqzlsgxtto` (Brazil) / prod `fqwhagryqkkhbgznxtwf` (Brazil) | PostgreSQL + Auth + Storage | — |

**Tenants:** CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b` · GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`

**Infra:** Cloudflare Workers + OpenNext (**dev.reportar.app** → BD test · **reportar.app** apex → BD prod) · Repos deploy: `reportaweb-demo` / `reportaweb-live` (GitHub integration) · Gotenberg (PDF) · Resend (dominio verificado: `reportar.app`, from: `noreply@reportar.app`) · Sentry (solo client-side) · Cloudflare DNS

**Estándar de dominios (2026-07-22):** un solo dominio de cara al cliente — `reportar.app` (apex) = home con login embebido + `/novedades` + landings de campaña (prefijo por definir: marca/marketing) + `/registro` + app. `dev.reportar.app` = interno (BD test). `www` → 301 apex. `/login` → 301 a `/`. Nunca hardcodear dominio (usar `NEXT_PUBLIC_SITE_URL`). Detalle en [ARCHITECTURE.md § Domain & Routing Standard](./docs/ARCHITECTURE.md) · portable en [PLAYBOOK-DOMAIN-STRATEGY.md](./docs/PLAYBOOK-DOMAIN-STRATEGY.md). Home/landings/novedades = Growth Engine (track ventas).

> Detalle de deployment: [ARCHITECTURE.md § Infrastructure](./docs/ARCHITECTURE.md). Vercel fue reemplazado el 2026-07-13; cron jobs pendientes de migrar.

---

## Estado Actual

**Date:** 2026-09-10  
**Web Version:** v3.12.4 — cierre del **recorrido completo Fases 1-9** (delta-sync + estándar CRUD/UX de todo `docs/guia_migracion_bubble_supabase.md`, 2026-09-08). Detonado al detectar que Cotizaciones nunca tuvo delta-sync desde el cutover de mayo por falta de `UNIQUE(bubble_id)`; se recorrieron las 9 fases en orden de dependencias en vez de parchear solo Cotizaciones. Resumen ejecutivo completo en `docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md`. Hallazgos y fixes de código de esta ejecución:
  - **Bug sistémico "proyecto Supabase equivocado"** (URLs apuntando al proyecto viejo/muerto `wioozisskjjgjjybsoqo.supabase.co` en vez de `fqwhagryqkkhbgznxtwf`): encontrado en 11 columnas/6 tablas (`companies.logo_url`, `cotizaciones_configuracion.imagen_banco`/`imagen_firma`, `cotizaciones.pdf_url`, `facturas_venta.pdf_valorizacion`/`pdf_factura_url`, `facturas_compra.pdf_factura`/`pdf_valorizacion`) — **~5.545 archivos recuperados desde Bubble y re-subidos al proyecto correcto**, ~690 residuales sin fuente real en el origen (no inventados, documentados abajo).
  - **Paginación truncada a 1.000 filas** (cap default de PostgREST sin `.range()`) en `getAllReportesMaquinaria`/`getAllReportesPersonal` (`lib/actions/reportes.ts`) — GRUAS tenía 18.514 reportes de maquinaria reales mostrando solo 1.000. Fix: `{page, limit}` + `count:'exact'` + `.range()`, mismo patrón que `getGlobalMaquinariaDocumentsPaged`.
  - Delta-sync aplicado en las 9 fases (Usuarios +19, Terceros +12, Maquinaria +20, Servicios: `servicios_tipos` 0→19 + `servicios` GRUAS +30, Cotizaciones +97/+185 detalle/+1.962 matriz + 108 PDFs, Reportes Maquinaria +2.651 filas + ~3.647 archivos, Reportes Personal +3.655 filas + 3.514 PDFs, Facturación +196/+112 facturas + 3.013/435 items + 3.854 PDFs recuperados).
  - `UNIQUE(bubble_id)` agregado donde faltaba (`areas`/`plazos_pago`/`bancos`, y confirmado en las tablas de Cotizaciones) — causa raíz del delta-sync roto.
  - TK-C2 (Cotizaciones): `ALTER TABLE cotizaciones DROP COLUMN periodo_cantidad` aplicado a TEST+PROD (columna muerta).
  - **`SUPABASE_SERVICE_ROLE_KEY` de PROD retirada de `.env.local`** (comentada) — ya no hay escrituras pesadas pendientes tras cerrar Fase 9.
**Web Version anterior:** v3.12.3 — fix(cotizaciones/servicios): `servicios.precio_N_tipo` nunca tuvo FK real hacia `servicios_tipo_precios` (columna `text` sin constraint, con cientos de referencias huérfanas en PROD) — el join embebido de PostgREST fallaba en silencio y devolvía listas vacías. Corregido con mapeo manual en `lib/actions/servicios.ts` + `lib/actions/cotizaciones.ts`.
**Web Version anterior a esa:** v3.12.2 — fix(auth): reintentar `getUser()` en `utils/supabase/middleware.ts` ante race de refresh de sesión (DUDA-COT-000). Verificado en demo y PROD.
**App Version:** v1.8.14  
**Foco activo previo (2026-07-23):** 🔀 **Cutover CISE/GRUAS (Bubble → v3)** — sacar a los 2 únicos clientes reales de Bubble. Plan: [docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md](./docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md) · handoff del día: [HANDOFF-2026-07-23.md](./docs/HANDOFF-2026-07-23.md). **Con el recorrido Fases 1-9 cerrado, el gap de datos a nivel campo/delta-sync queda saneado en las 9 fases del plan maestro** — bloqueante residual = auditoría exhaustiva de estándar UI v1.2 (piloto "Cargos" corrido, ver pendientes abajo). **Growth Engine PAUSADO** (specs+planes A–E ✅; ver [PLAN-GROWTH-ENGINE-JOURNEY.md](./docs/PLAN-GROWTH-ENGINE-JOURNEY.md) + [HANDOFF-2026-07-18.md](./docs/HANDOFF-2026-07-18.md) para retomar).  
**Auditoría UI:** roadmap corregido y escalado en [docs/superpowers/plans/2026-09-09-escalar-auditoria-ui-modulos-restantes.md](./docs/superpowers/plans/2026-09-09-escalar-auditoria-ui-modulos-restantes.md) — **11/15 módulos cerrados**: Usuarios, Maquinaria, Terceros (incl. Sitios), Planificación, Configuración, Cotizaciones (datos+PDFs; TK-C1/TK-C4 diferidos por diseño), Informes, Gestión EPP (gap crítico de datos encontrado y migrado desde Bubble, `docs/auditoria-ui/08-epp.md`), Planes de Acción (delta-sync + TK-PA1-7, `docs/auditoria-ui/10-planes-accion.md`), Ventas (datos ya OK + 3 fixes UI, PR #1 mergeado, `docs/auditoria-ui/11-ventas.md`), Compras (datos ya OK + mismos 3 fixes UI + feature nueva "PDF de Valorización de Compra" que nunca existió, PR #2 mergeado, `docs/auditoria-ui/12-compras.md`). **Quedan 3:** Gestión Formatos, Perfil de Usuario, Opciones Internas (este último incluye auditar también `reporta-admin`, no solo `/sistema`).  
**Template listados:** v1.2 aplicado a Usuarios, Maquinaria y Terceros. Piloto "Cargos" corrido para refinar el checklist de auditoría exhaustiva (v1 con 6 ambigüedades detectadas, encontró además una implementación huérfana/duplicada a eliminar) — v2/v3 del checklist no iterado todavía, no re-ejecutar el piloto, iterar sobre lo ya encontrado.  
**E2E Suite:** ⚠️ desactualizada tras template v1.2 + cambio personal externo (DUDA-E2E-001 · TESTING.md § TEST-003)

**Deploy demo (pipeline funcionando):**
- Push a `demo/master` → Cloudflare Workers Builds (worker `reportaweb-demo`)
- Build: `npm run build:demo && npx opennextjs-cloudflare build` (usa `.env.demo` → BD TEST)
- Deploy: `npx wrangler deploy --config wrangler.demo.toml`
- Secrets del worker (dashboard): `SUPABASE_SERVICE_ROLE_KEY` (TEST)
- **reportar.app** (prod): ⚠️ entorno Cloudflare AÚN NO creado (falta importar repo `reportaweb-live` a Workers Builds + secret `sb_secret_` + bindear apex). Rebinding pendiente: `demo.reportar.app`→`dev.reportar.app`.

**⚠️ Hallazgo 2026-09-10 (pendiente confirmar en Bubble):** revisión a fondo de tablas de Ventas/Compras encontró 4 gaps: (1) `cobros_venta` vacía en PROD — pagos migrados quedaron en `factura_venta_pagos` (521 filas) que la app nunca lee, 0 de 3.130 facturas de venta muestran cobro; (2) `facturas_compra_pagos` con cobertura sospechosa (20/1.473, 1,4%), nunca verificada contra Bubble; (3) **`bancos` completamente vacía (0 filas, ningún tenant)** — nunca migrada, bloquea registrar cobros nuevos; (4) `valorizaciones` asimétrica entre tenants — CISE tiene 752 filas, **GRUAS tiene 0** pese a ser el tenant con más facturación real, y 0 filas son de tipo Compra en todo el sistema. Detalle en [docs/auditoria-ui/residuales-pagos-facturacion.md](./docs/auditoria-ui/residuales-pagos-facturacion.md) y `docs/pendientes_por_resolver.md` § P-005. No bloquea el cierre UI ya hecho de Ventas/Compras, pero varios datos financieros no son confiables hasta resolverlo.  
**Próximo paso:** continuar el roadmap de auditoría UI con **Gestión Formatos** (`docs/auditoria-ui/09-formatos.md`, siguiente en la lista — incluye resolver DUDA D-02 de `00-sidebar.md`) → Perfil de Usuario → Opciones Internas (incluye `reporta-admin`) · decidir si construir mockups/CRUD para los residuales del recorrido (pedir a GRUAS `imagen_banco`/`imagen_firma`; TK-C1/TK-C4 Cotizaciones) · regenerar `types/supabase.ts` (`npm run types:supabase`, hoy hand-edit) + build local antes de deploy. Detalle del recorrido en `docs/superpowers/plans/2026-09-08-recorrido-completo-fases-1-9.md` (resumen ejecutivo final) y en [HANDOFF-2026-07-23.md](./docs/HANDOFF-2026-07-23.md).  
**Deudas técnicas:** [docs/TECHNICAL_DEBTS.md](./docs/TECHNICAL_DEBTS.md) (rotar key PROD = ALTA)

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

