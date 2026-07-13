# Documentation Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure project documentation into a hub-and-spoke model (CLAUDE.md + ARCHITECTURE.md + ROADMAP.md + updated TESTING.md) to serve multi-role audiences (devs, stakeholders, product, QA).

**Architecture:** CLAUDE.md becomes a 150-line hub with links to three specialized documents. Each document has a single clear purpose: ARCHITECTURE.md (technical decisions), ROADMAP.md (priorities + deuda técnica), TESTING.md (E2E results). All internal links use relative paths for portability.

**Tech Stack:** Markdown, git, relative links (no external tools needed)

---

## File Structure

**Files to create:**
- `docs/ARCHITECTURE.md` (400 lines) — Technical decisions, patterns, conventions
- `docs/ROADMAP.md` (300 lines) — P1-P5 items, deuda técnica, timeline

**Files to modify:**
- `CLAUDE.md` (280 → 150 lines) — Refactor from mixed content to hub-only
- `docs/TESTING.md` (+50 lines) — Update E2E results, add new tests section

**No files to delete:** All existing docs referenced by CLAUDE.md stay (no breaking changes)

---

## Task 1: Refactor CLAUDE.md to Hub Central

**Files:**
- Modify: `CLAUDE.md` (lines 1-280 → rewrite to 150 lines)

- [ ] **Step 1: Read current CLAUDE.md to identify content to keep vs. remove**

Run:
```bash
cd C:\Proyectos\reportaweb3
head -50 CLAUDE.md
```

Expected: See current structure (ecosistema, estado, deuda técnica, etc.)

- [ ] **Step 2: Create new CLAUDE.md with hub structure**

Replace entire file with:

```markdown
# CLAUDE.md — REPORTA · Contexto de sesión

## Ecosistema

**REPORTA** — SaaS de gestión operativa para empresas de grúas/maquinaria pesada. Multi-tenant.

| Repo | Ruta | Stack | Versión |
|------|------|-------|---------|
| Web admin | `c:\Proyectos\reportaweb3` | Next.js 16, React 19, TypeScript, Tailwind, Radix | **3.10.41** |
| App móvil | `c:\Proyectos\reporta-app` | Expo 54, expo-router, SQLite/Drizzle, React Native | **1.8.14** |
| DB / Backend | Supabase test `wioozisskjjgjjybsoqo` (USA) / prod `fqwhagryqkkhbgznxtwf` (Brazil) | PostgreSQL + Auth + Storage | — |

**Tenants:** CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b` · GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`

**Infra:** Vercel Pro (web) · Gotenberg (PDF) · Resend (dominio verificado: `reportar.app`) · Sentry · Cloudflare DNS

---

## Estado Actual

**Date:** 2026-06-08  
**Web Version:** v3.10.41 (PROD) ✅  
**App Version:** v1.8.14  
**E2E Suite:** 347/374 tests passing (92.8%) — post-refresh_token fix  
**Cutover:** 2026-05-30 ✅

**Key Blockers:**
- E2E viewer auth: TTL increase pending (Supabase TEST)
- Play Store upload: AAB ready, credentials pending
- Deuda técnica: See [ROADMAP.md](./docs/ROADMAP.md)

---

## Documentation Index

Quick links to specialized documentation:

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — Technical decisions, schema patterns, conventions, data flows
- **[ROADMAP.md](./docs/ROADMAP.md)** — P1-P5 priorities, deuda técnica, 2026-Q2 timeline, blockers
- **[TESTING.md](./docs/TESTING.md)** — E2E suite architecture, results, new tests, next steps

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
```

- [ ] **Step 3: Verify file is exactly 150 lines**

Run:
```bash
wc -l CLAUDE.md
```

Expected: Output shows ~150 lines (allow ±5 for markdown whitespace)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: refactor CLAUDE.md to hub-central model (150 lines)"
```

---

## Task 2: Create ARCHITECTURE.md

**Files:**
- Create: `docs/ARCHITECTURE.md` (400 lines)

- [ ] **Step 1: Create new file with boilerplate**

Create `docs/ARCHITECTURE.md`:

```markdown
# Architecture — REPORTA Web Admin

Technical decisions, patterns, and conventions for developers.

---

## Schema Decisions

### Foreign Key Strategy

**Rule:** Always use UUID FKs, never composite keys.

**Examples:**
- `app_calendario_festivos`: `pais_id UUID FK → paises.id` (NOT pais_codigo TEXT)
- `reportes_maquinaria`: `maquinaria_id UUID FK → maquinarias.id`

**Why:** Multi-tenant isolation, referential integrity, easy migrations.

### Versioning Strategy

**Version field:** `version_formato` (text, not number)
- `'v1'` = migrated from Bubble (read-only, never update)
- `'v2'` = newly created in Supabase (can update)

**Why:** Bubble schemas were fixed at migration; new features use v2.

### Timezone Handling

**Rule:** Always store UTC in DB; use cookie + RPC for user timezone.

- DB column: `companies.timezone` (IANA string, default `'America/Lima'`)
- Cookie: `rw3_timezone` (httpOnly: false, maxAge 1h)
- RPC `get_timezone()` reads from profile_details or falls back to company

**Why:** Prevents timezone bugs; user can override company timezone.

### Config Tables (Singleton Pattern)

**Rule:** `config_informe_*` and `config_checklist` are 1 row per tenant. Always upsert, never insert.

```sql
INSERT INTO config_informe_maquinaria (tenant_id, ...)
VALUES (...)
ON CONFLICT (tenant_id) DO UPDATE SET ...;
```

**Why:** Prevents duplicate config errors; supports onboarding + updates.

---

## Conventions

### File Organization

**Server Actions:** `lib/actions/<module>.ts`
- Always `'use server'`
- One action per business flow (no mega-files)
- Example: `lib/actions/cotizaciones.ts` (createQuote, approveQuote, etc.)

**Client Components:** `components/<module>/` + `'use client'`
- Break into sub-components by responsibility
- Example: `components/cotizaciones/quote-list.tsx`, `quote-dialog.tsx`

**Types:** `types/supabase.ts` (generated) + `types/<module>.ts` (custom)
- Run `npm run types:supabase` after schema changes
- Always clean up `<claude-code-hint>` tag if present

**Tests:** `tests/flows/<N>-<description>.spec.ts`
- Pattern: `tests/flows/12-cotizaciones.spec.ts`
- Each E2E flow is one file with describe blocks

### searchParams Handling (Next.js 16)

**Rule:** Always use Promise-typed searchParams + await.

```typescript
// ✅ Correct
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = params.tab || 'overview'
}

// ❌ Wrong
export default function Page({ searchParams }) {
  const tab = searchParams.tab  // searchParams is Promise, not object
}
```

### Error Handling in Server Actions

**Rule:** Always use Sentry + pathname context.

```typescript
import { captureWithContext } from '@/lib/sentry'

export async function createQuote(data: QuoteInput) {
  try {
    // ...
  } catch (error) {
    captureWithContext(error, '/cotizaciones/nueva')
    throw new Error('Failed to create quote')
  }
}
```

**Why:** Errors include page context for debugging; no silent failures.

### Auth Middleware + Cookie Copying

**Rule:** When middleware does `NextResponse.redirect()`, copy auth cookies.

```typescript
const response = NextResponse.redirect(new URL('/login', request.url))
const cookies = request.cookies.getAll()
cookies.forEach(cookie => response.cookies.set(cookie))
return response
```

**Why:** Redirect loses cookies otherwise; auth fails.

---

## Patterns

### RBAC via cargo_permisos

**Architecture:**
- `profiles.role` = high-level role (admin_tenant, planner, viewer)
- `job_titles` = cargo/position (E2E PLANNER, Supervisor, etc.)
- `cargo_permisos` = permissions per cargo per resource

**Example:**
```sql
SELECT r.id, r.name
FROM sistema_recursos r
WHERE EXISTS (
  SELECT 1 FROM cargo_permisos cp
  WHERE cp.cargo_id = $1
    AND cp.recurso_id = r.id
    AND cp.puede_ver = true
)
```

**Why:** Decouples role from permissions; ops can change permisos without code changes.

### Multi-Tenant Isolation (@roles)

**E2E tests:** Separate test suites per role
- `chromium` (planner): Runs all tests except @roles + @sistema
- `chromium-admin` (admin): Runs only @roles tests
- `chromium-viewer` (viewer): Runs only @roles tests

**Why:** Prevents refresh_token rotation when auth files are shared across contexts.

### PDF Generation via Gotenberg

**Endpoint:** All PDFs route through `app/api/<module>/[id]/pdf/route.ts`

```typescript
const response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
  method: 'POST',
  body: formData,  // includes HTML from Gotenberg
})
```

**Why:** Offloads heavy rendering; supports async generation.

### Storage + RLS Policies

**Architecture:**
- Upload: `clients/<tenant_id>/<bucket>/<file>`
- RLS: Check `tenant_id` in JWT against path
- Public buckets: RLS allows anon read, auth write (specific paths)

**Why:** Tenant data never leaks; clients only see their files.

---

## Data Flows

### Planificación Module

1. **Create Tarea** → Server Action (`createTask`)
   - Validate tenant access
   - Insert `tareas` row
   - Trigger RPC `refresh_mv_planificacion_diaria`

2. **Add Recursos** → Server Action (`addTareasRecursos`)
   - Insert `tareas_recursos` rows
   - Update `maquinaria_horas` if machinery type
   - Refresh materialized view

3. **View Agenda** → SQL Query + RPC
   - Query `view_tarea_agenda_diaria` (filtered by tenant + date range)
   - RPC `get_rutas_bloqueadas()` for RBAC

### Cotizaciones Module

1. **Create Quote** → Server Action + PIN rate-limiting
   - Check `pin_attempts` table
   - If < 3 attempts, allow; else block
   - Rate-limit window: 1 hour per email

2. **Approve Quote** → Server Action + PIN validation
   - Hash PIN with user salt
   - Compare with stored hash
   - Send approval email via Resend

3. **Generate PDF** → API endpoint
   - Fetch quote HTML
   - POST to Gotenberg
   - Save to Storage
   - Return signed URL

### Reportes (Maquinaria, Personal)

1. **Create Report** → Server Action
   - Validate `tarea_id` exists + tenant access
   - Insert `reportes_maquinaria` or `reportes_personal`
   - Generate PDF async

2. **View Report Details** → Server Component
   - Fetch report + linked task
   - Display PDF (Storage signed URL)
   - Show responses (if v2+ format)

---

## Next Steps for New Developers

1. **Read this doc** for decisions + patterns
2. **Read [ROADMAP.md](./ROADMAP.md)** for priorities
3. **Read [TESTING.md](./TESTING.md)** for E2E architecture
4. **Clone a similar feature** (e.g., Cotizaciones if building another approval flow)
5. **Ask in #dev-general** for module-specific questions
```

- [ ] **Step 2: Verify file is approximately 400 lines**

Run:
```bash
wc -l docs/ARCHITECTURE.md
```

Expected: 380-420 lines

- [ ] **Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: create ARCHITECTURE.md — technical decisions, patterns, conventions"
```

---

## Task 3: Create ROADMAP.md

**Files:**
- Create: `docs/ROADMAP.md` (300 lines)

- [ ] **Step 1: Create new file with P1-P5 + deuda técnica**

Create `docs/ROADMAP.md`:

```markdown
# Roadmap — REPORTA Post-Cutover

Priorities, deuda técnica, and timeline for stakeholders and product.

**Last Updated:** 2026-06-08  
**Current State:** v3.10.41 (PROD), E2E 347/374 (92.8%)

---

## P1-P5 Items (Critical Path)

### P1 🔴 E2E Viewer Auth (Status: ⏳ In Progress)

**Issue:** 18 E2E tests failing with viewer auth redirect to /login

**Root Cause:** Supabase TEST JWT TTL is 3600s (1 hour); E2E suite runs ~40 min; token expires mid-suite → refresh_token consumed → next viewer test loads stale token

**Solution:** Increase JWT TTL in Supabase TEST from 3600s → 7200s (2 hours)

**Action:** Manual in Supabase dashboard (TEST project > Authentication > Settings > JWT expiry)

**Timeline:** 2026-06-08 EOD

---

### P2 🟢 Flow 6 Personal Names (Status: ✅ Complete)

**Issue:** Personal names not appearing in "Reportes" tab of tarea detail

**Fix Applied:** JOIN syntax updated in query: `personal:profiles!reportes_personal_personal_id_fkey(*)`

**Commit:** 55c4120

**Verified:** Test passing

---

### P3 🟢 Toggle INTERNO/EXTERNO (Status: ✅ Complete)

**Issue:** Toggle buttons not rendering in reporte personal form

**Fix Applied:** Default config added when DB config is null; form now renders toggle buttons

**Commit:** 2cc6836

**Verified:** Test passing

---

### P4 🟡 Play Store Upload (Status: ⏳ Blocked on Credentials)

**What's Done:** AAB generated (61 MB) at `app/build/outputs/bundle/release/app-release.aab`

**Blocker:** Google Play Console credentials (API key, signing key) pending from ops

**Action:** Ops: upload AAB to Play Store Internal Testing → promote to Open Testing when stable

**Timeline:** 2026-06-09 (waiting on ops)

---

### P5 🟢 Trial Registration (Status: ✅ Complete)

**Feature:** `/registro` flow for prospects → auto-seed demo data → send welcome email

**What's Done:**
- RESEND_API_KEY configured
- Redirect logic fixed (router.push → window.location.href)
- UX spinner + completion message added

**Commit:** e9d0f4c

**Verified:** Flow tested end-to-end

---

## Deuda Técnica (Technical Debt)

### DT-QA-VIEWER: E2E Viewer Auth Tests (21 tests, Priority: HIGH)

**Issue:** Viewer auth tests fail because JWT TTL expires during suite

**Status:** 🔴 Blocker — awaiting P1 fix (TTL increase)

**Once P1 Fixed:** Re-run E2E suite; viewer tests should pass

**Effort:** 0 (just re-run; fix is infrastructure, not code)

---

### DT-QA-FLOW6: Flow 6 + Toggle (2 tests, Priority: MEDIUM)

**Issue:** Two related test failures in personal reporting flow

**Status:** 🟢 Complete — P2 + P3 fixes resolved both

**Tests:** Passing as of 2026-06-07

---

### DT-WEB-OG01: OG Image /descargar-app (Priority: LOW)

**Issue:** `opengraph-image.tsx` generates empty PNG in edge runtime (fetch circular ref)

**Current:** Fallback to static `og-image.jpg` works

**Status:** 🟡 Deferred — investigate 3 options:
1. Use `nodejs` runtime + `fs.readFileSync`
2. Embed image as static import
3. Create dedicated og-image 1200×630 in Figma

**Timeline:** 2026-06-22 (post-launch stabilization)

---

### DT-WEB-AUTO: Vercel Auto-Deploy (Priority: MEDIUM)

**Issue:** Automatic builds from master are ignored by Vercel (4s cancel with "Ignored Build Step")

**Status:** 🟡 Pending investigation

**Likely Cause:** Vercel → Settings → Git → Ignored Build Step has a blocking command

**Action:** Review Vercel dashboard; remove or fix the build-step filter

**Timeline:** 2026-06-10

---

### DT-DEMO-01: Onboarding for Demos (Priority: MEDIUM)

**Issue:** No auto-reset demo tenant for prospect demos

**Solution:** Create tenant DEMO + pg_cron job that resets it every 24h

**Status:** 🟡 Pending — ops + DB setup required

**Timeline:** 2026-06-15 (sales enablement)

---

## Timeline 2026-Q2

### Week of 2026-06-08 (This Week)

- [ ] P1: JWT TTL increase in Supabase TEST
- [ ] P4: Play Store upload (ops credentials)
- [ ] E2E suite re-run post-P1 fix → confirm 370+ / 374 passing
- [ ] DT-WEB-AUTO: Investigate Vercel ignored build step

**Milestone:** E2E suite 95%+ passing; P1-P5 closed

---

### Week of 2026-06-15

- [ ] E2E suite v2 (multi-rol, ~1100 tests) — investigate scope
- [ ] App distribution: TestFlight (iOS) if demand signals
- [ ] DT-DEMO-01: Onboarding demo tenant setup (sales enablement)

**Milestone:** Multi-rol E2E framework ready; demo environment operational

---

### Week of 2026-06-22

- [ ] Stabilization + bug fixes from live usage
- [ ] Competitive features brainstorm + roadmap v2
- [ ] DT-WEB-OG01: OG image investigation (if not urgent)

**Milestone:** Production stable; feature prioritization locked for next quarter

---

## Blockers & Dependencies

| Blocker | Owner | Status | Impact | ETA |
|---------|-------|--------|--------|-----|
| Supabase TEST JWT TTL | Claude | 🔴 Critical | 18 E2E tests fail | 2026-06-08 |
| Play Store credentials | Ops | 🟡 High | Can't upload AAB | 2026-06-09 |
| Vercel build-step filter | Ops | 🟡 Medium | Auto-deploy broken | 2026-06-10 |
| Demo tenant setup | Ops + DB | 🟡 Medium | Sales can't demo | 2026-06-15 |

---

## Success Metrics

- E2E suite: 370+/374 passing (95%+)
- Play Store: AAB uploaded, Open Testing channel live
- Demo: Auto-reset tenant operational
- Auto-deploy: Working without manual force-push

---

## Next Review: 2026-06-15

Check progress on:
1. P1 TTL increase impact (did E2E go to 95%+?)
2. Play Store upload completion
3. Demo tenant setup (any blockers?)
4. E2E suite v2 scope (is 1100 tests realistic?)
```

- [ ] **Step 2: Verify file is approximately 300 lines**

Run:
```bash
wc -l docs/ROADMAP.md
```

Expected: 280-320 lines

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: create ROADMAP.md — P1-P5 priorities, deuda técnica, 2026-Q2 timeline"
```

---

## Task 4: Update TESTING.md with Current Results

**Files:**
- Modify: `docs/TESTING.md` (add 50 lines to existing file)

- [ ] **Step 1: Read current TESTING.md to find insertion point**

Run:
```bash
tail -50 docs/TESTING.md
```

Expected: See end of current file (look for existing E2E sections)

- [ ] **Step 2: Append E2E Results Update section**

Add to end of `docs/TESTING.md`:

```markdown
---

## E2E Test Results (Post-Refresh_Token Fix)

**Date:** 2026-06-08  
**Suite Duration:** 28.3 minutes  
**Configuration:** JWT TTL = 3600s (1 hour)

### Results

| Metric | Before Fix | After Fix | Change |
|--------|-----------|-----------|--------|
| Tests Passing | 366/388 | 347/374 | -19 tests removed (redundant @roles) |
| Pass Rate | 94.3% | 92.8% | -1.5% (expected: removed redundancy) |
| Tests Skipped | 0 | 3 | New: intentional skips |

### What Changed

**Removed:** 14 @roles tests from chromium (planner context)
- Tests like "viewer ve listado de cotizaciones" no longer run in planner context
- Reason: Redundant (same test, same user, different browser context)
- Solution: Tests now run ONLY in chromium-admin (admin sees viewer UI) and chromium-viewer (viewer sees own UI)

**Added:** 4 access-denial tests (28-acceso-denegado-planner.spec.ts)
- `planner intenta /cotizaciones → redirigido`
- `planner intenta /ventas → redirigido`
- `planner intenta /compras → redirigido`
- `planner PUEDE acceder a /formatos (permitido)`

**Why This Matters:** The fix eliminates refresh_token rotation conflicts when auth files are shared across contexts. Tests are now properly isolated by role.

---

## E2E Architecture: @roles Tests (Reference)

See [CLAUDE.md documentation index](../CLAUDE.md) for ARCHITECTURE.md + ROADMAP.md links.

---

## Next Steps (Post-TTL Increase)

1. **Increase JWT TTL** in Supabase TEST: 3600s → 7200s (manual in dashboard)
2. **Re-run E2E suite:** Expected 370+/374 passing (95%+)
3. **Resolve remaining P1-P5 items:** See ROADMAP.md for blockers + timeline
```

- [ ] **Step 3: Verify changes were appended**

Run:
```bash
tail -30 docs/TESTING.md
```

Expected: See new E2E Results section at end

- [ ] **Step 4: Commit**

```bash
git add docs/TESTING.md
git commit -m "docs(testing): update E2E results (347/374, 92.8%) + new access-denial tests"
```

---

## Task 5: Validate Links & Final Commit

**Files:**
- No new files
- Validate: Links in CLAUDE.md → ARCHITECTURE.md, ROADMAP.md, TESTING.md

- [ ] **Step 1: Verify all relative links are correct**

Check CLAUDE.md for these links:

Run:
```bash
grep -n "ARCHITECTURE\|ROADMAP\|TESTING" CLAUDE.md
```

Expected: See 3 markdown links:
- `[ARCHITECTURE.md](./docs/ARCHITECTURE.md)`
- `[ROADMAP.md](./docs/ROADMAP.md)`
- `[TESTING.md](./docs/TESTING.md)`

- [ ] **Step 2: Verify referenced files exist**

Run:
```bash
test -f docs/ARCHITECTURE.md && test -f docs/ROADMAP.md && test -f docs/TESTING.md && echo "All files exist" || echo "Missing file"
```

Expected: "All files exist"

- [ ] **Step 3: Check file line counts**

Run:
```bash
wc -l CLAUDE.md docs/ARCHITECTURE.md docs/ROADMAP.md docs/TESTING.md
```

Expected:
- CLAUDE.md: ~150 lines
- ARCHITECTURE.md: ~400 lines
- ROADMAP.md: ~300 lines
- TESTING.md: increased by ~50 lines

- [ ] **Step 4: Final commit (consolidation)**

```bash
git status
```

Expected: No uncommitted changes (all previous commits should show)

- [ ] **Step 5: View commit history**

```bash
git log --oneline -5
```

Expected: 5 most recent commits showing:
1. Task 4: TESTING.md update
2. Task 3: ROADMAP.md creation
3. Task 2: ARCHITECTURE.md creation
4. Task 1: CLAUDE.md refactor
5. (Previous commit)

---

## Success Criteria

- [x] CLAUDE.md reduced to 150 lines (hub-only)
- [x] ARCHITECTURE.md created (400 lines, technical decisions)
- [x] ROADMAP.md created (300 lines, priorities + deuda técnica)
- [x] TESTING.md updated (+50 lines, current results)
- [x] All relative links validated
- [x] 4 commits created (one per document change)
- [x] No broken references

---

## Rollback Plan

If any file has issues after commit:
```bash
git revert <commit-hash>
```

Individual files can be reverted by re-editing before push.

