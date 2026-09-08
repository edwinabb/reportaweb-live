# CLAUDE.md — REPORTA · Contexto de sesión

## Ecosistema

**REPORTA** — SaaS de gestión operativa para empresas de grúas/maquinaria pesada. Multi-tenant.

| Repo | Ruta | Stack | Versión |
|------|------|-------|---------|
| Web admin | `c:\Proyectos\reportaweb3` | Next.js 16, React 19, TypeScript, Tailwind, Radix | **3.12.3** |
| App móvil | `c:\Proyectos\reporta-app` | Expo 54, expo-router, SQLite/Drizzle, React Native | **1.8.14** |
| DB / Backend | Supabase test `oyrokyyaeaeqzlsgxtto` (Brazil) / prod `fqwhagryqkkhbgznxtwf` (Brazil) | PostgreSQL + Auth + Storage | — |

**Tenants:** CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b` · GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`

**Infra:** Cloudflare Workers + OpenNext (**dev.reportar.app** → BD test · **reportar.app** apex → BD prod) · Repos deploy: `reportaweb-demo` / `reportaweb-live` (GitHub integration) · Gotenberg (PDF) · Resend (dominio verificado: `reportar.app`, from: `noreply@reportar.app`) · Sentry (solo client-side) · Cloudflare DNS

**Estándar de dominios (2026-07-22):** un solo dominio de cara al cliente — `reportar.app` (apex) = home con login embebido + `/novedades` + landings de campaña (prefijo por definir: marca/marketing) + `/registro` + app. `dev.reportar.app` = interno (BD test). `www` → 301 apex. `/login` → 301 a `/`. Nunca hardcodear dominio (usar `NEXT_PUBLIC_SITE_URL`). Detalle en [ARCHITECTURE.md § Domain & Routing Standard](./docs/ARCHITECTURE.md) · portable en [PLAYBOOK-DOMAIN-STRATEGY.md](./docs/PLAYBOOK-DOMAIN-STRATEGY.md). Home/landings/novedades = Growth Engine (track ventas).

> Detalle de deployment: [ARCHITECTURE.md § Infrastructure](./docs/ARCHITECTURE.md). Vercel fue reemplazado el 2026-07-13; cron jobs pendientes de migrar.

---

## Estado Actual

**Date:** 2026-09-06  
**Web Version:** v3.12.3 — fix(cotizaciones/servicios): `servicios.precio_N_tipo` nunca tuvo FK real hacia `servicios_tipo_precios` (columna `text` sin constraint, con cientos de referencias huérfanas en PROD) — el join embebido de PostgREST fallaba en silencio y devolvía listas vacías. Detectado recién ahora porque TEST no tiene datos reales de Cotizaciones/Servicios para ejercitar el bug. Corregido con mapeo manual en `lib/actions/servicios.ts` + `lib/actions/cotizaciones.ts` (sin tocar datos ni agregar el FK, que tiene ~670 registros huérfanos que requieren limpieza aparte).
**Web Version anterior:** v3.12.2 — fix(auth): reintentar `getUser()` en `utils/supabase/middleware.ts` ante race de refresh de sesión (evita el 307 intermitente `/login`→`/planificacion`, DUDA-COT-000 de `docs/auditoria-ui/06-cotizaciones.md`). Ya desplegado y verificado en demo y en PROD (`reportaweb-live.ancient-block-882d.workers.dev`).
**Web Version anterior a esa:** v3.12.1 — Fase 0 del plan ampliado de cutover: endpoint bridge de PDF para Bubble (`/api/bubble/pdf/generate`, reemplazo de docmaker.co) + cola de reintentos por `doc_category` + webhook a Bubble. Deploy a demo en curso; **pendiente:** smoke test desplegado (lectura de plantillas `.docx` vía `fs` bajo Cloudflare Workers, sin verificar) antes de habilitar Bubble real. Ver `docs/superpowers/plans/2026-09-06-fase0-pdf-bridge-bubble.md`.  
**App Version:** v1.8.14  
**Plan ampliado (2026-09-06):** `docs/superpowers/specs/2026-09-06-plan-migracion-cutover-fase2-design.md` — Fase 0 (PDF bridge, en curso) → Fase 0b (dominios reporta.la/Postmark) → Fase 1 (fix UX Planificación) → Fase 2 (auditoría exhaustiva módulos 5-15) → Fase 3 (costos infra) → Fase 4 (email) → Fase 5 (E2E + gate final).  
**Foco activo previo (2026-07-23):** 🔀 **Cutover CISE/GRUAS (Bubble → v3)** — sacar a los 2 únicos clientes reales de Bubble. Plan: [docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md](./docs/superpowers/plans/2026-07-22-cutover-cise-gruas.md) · handoff del día: [HANDOFF-2026-07-23.md](./docs/HANDOFF-2026-07-23.md). Migración ~95% a nivel tabla; bloqueante = **gaps de migración a nivel campo** que revela la auditoría UI. Acceso a Bubble LIVE confirmado (token de `.env.local` funciona). **Growth Engine PAUSADO** (specs+planes A–E ✅; ver [PLAN-GROWTH-ENGINE-JOURNEY.md](./docs/PLAN-GROWTH-ENGINE-JOURNEY.md) + [HANDOFF-2026-07-18.md](./docs/HANDOFF-2026-07-18.md) para retomar).  
**Auditoría UI:** Módulo **4/15** (Planificación) ✅ matriz en [docs/auditoria-ui/04-planificacion.md](./docs/auditoria-ui/04-planificacion.md) (DUDAs resueltas; DUDA-PLAN-001 espera aprobación para TK-P1). **Terceros (3/15): CERRADO en PROD** — esquema (`estadosunat`/`condicionsunat`) + re-migración de campos aplicada (rubro/ubicación/SUNAT/cargo-área/sitios·código/tipo/geodata) vía Management API (03-terceros.md).  
**Template listados:** v1.2 aplicado a Usuarios, Maquinaria y Terceros  
**E2E Suite:** ⚠️ desactualizada tras template v1.2 + cambio personal externo (DUDA-E2E-001 · TESTING.md § TEST-003)

**Deploy demo (pipeline funcionando):**
- Push a `demo/master` → Cloudflare Workers Builds (worker `reportaweb-demo`)
- Build: `npm run build:demo && npx opennextjs-cloudflare build` (usa `.env.demo` → BD TEST)
- Deploy: `npx wrangler deploy --config wrangler.demo.toml`
- Secrets del worker (dashboard): `SUPABASE_SERVICE_ROLE_KEY` (TEST)
- **reportar.app** (prod): ⚠️ entorno Cloudflare AÚN NO creado (falta importar repo `reportaweb-live` a Workers Builds + secret `sb_secret_` + bindear apex). Rebinding pendiente: `demo.reportar.app`→`dev.reportar.app`.

**Próximo paso:** regenerar `types/supabase.ts` (`npm run types:supabase`, hoy hand-edit) + build local antes de deploy · aprobar DUDA-PLAN-001 → TK-P1 Planificación · seguir auditoría módulos 5–15 (faltan screenshots) · delta-sync final desde Bubble LIVE. Detalle en [HANDOFF-2026-07-23.md](./docs/HANDOFF-2026-07-23.md).  
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

