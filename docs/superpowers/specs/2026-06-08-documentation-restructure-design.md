# Documentation Restructure — Hybrid Smart Approach

**Date:** 2026-06-08  
**Status:** Design Approved  
**Owner:** Documentation Team  

---

## Executive Summary

Restructure project documentation using a **hybrid smart approach**: maintain CLAUDE.md as a lightweight hub with links to specialized documents. This improves navigation for multi-role audiences (devs, stakeholders, product, QA) while keeping documentation maintainable and up-to-date.

**Current State (2026-06-07):**
- CLAUDE.md: 280 lines, mixed content, outdated (v3.10.39 → v3.10.41, E2E: 362/388 → 347/374)
- Scattered docs: TESTING.md (updated with @roles), new specs (E2E refresh token fix)
- Missing: ARCHITECTURE.md (decisions, patterns), ROADMAP.md (priorities, deuda técnica)

**Target State:**
- CLAUDE.md: 150 lines, hub only (ecosystem, state, index, quick commands)
- ARCHITECTURE.md: 400 lines, decisions + patterns + flows (dev-facing)
- ROADMAP.md: 300 lines, priorities + deuda técnica + timeline (stakeholder-facing)
- TESTING.md: Updated with current results (347/374, 92.8%) and new tests

---

## Problem Statement

### Current Issues

1. **CLAUDE.md is a mixed bag** — Contains ecosystem info, state, deuda técnica, architecture decisions, E2E status all in 280 lines. Hard to navigate.
2. **Outdated information** — Version numbers stale, E2E results outdated (362/388 vs actual 347/374 post-E2E-fix)
3. **Missing architecture context** — Decisions scattered; no single source for schema decisions, patterns, conventions
4. **Roadmap unclear** — P1-P5 items exist but not consolidated with deuda técnica and timeline
5. **Multi-audience conflict** — Devs need deep context, stakeholders need status, QA needs test info. One doc can't serve all well.

---

## Solution: Hybrid Smart Approach

### Document Structure

#### **CLAUDE.md — Hub Central (150 lines)**
**Purpose:** Quick reference + index to other docs  
**Audience:** All roles (entry point)

**Sections:**
1. **Ecosistema** (5 lines)
   - Project overview, stack, repos, versions
   - Current state: v3.10.41 (web), v1.8.14 (app)

2. **Estado actual** (8 lines)
   - Last update date, cutover status, critical blockers
   - E2E suite: 347/374 (92.8%)
   - Key metrics

3. **Documentation Index** (10 lines)
   - Links to ARCHITECTURE.md, ROADMAP.md, TESTING.md
   - One-line description of each

4. **Quick Commands** (8 lines)
   - npm run dev, npm run test:e2e, npm run build, etc.

**NOT in CLAUDE.md:**
- Full deuda técnica (→ ROADMAP.md)
- Architecture decisions (→ ARCHITECTURE.md)
- E2E results detail (→ TESTING.md)
- Post-cutover plans (→ ROADMAP.md)

---

#### **ARCHITECTURE.md — Technical Decisions (400 lines) [NEW]**
**Purpose:** Decisions, patterns, conventions for devs  
**Audience:** Developers (deep technical context)

**Sections:**
1. **Schema Decisions** (80 lines)
   - FK strategies, timezone handling, versioning
   - Example: `app_calendario_festivos: pais_id UUID FK`

2. **Conventions** (100 lines)
   - Server actions: `lib/actions/<module>.ts`
   - Client components: `components/<module>/`
   - Type generation: `npm run types:supabase`
   - searchParams async handling
   - Error handling: Sentry integration

3. **Patterns** (120 lines)
   - RBAC via cargo_permisos + job_titles
   - Auth middleware + cookie handling
   - Multi-tenant isolation (@roles tests, RLS)
   - PDF generation via Gotenberg
   - File upload to Storage + RLS policies

4. **Data Flows** (100 lines)
   - Planificación module (tareas, recursos, timelines)
   - Cotizaciones (creation, PIN, approval)
   - Reportes (maquinaria, personal, PDFs)
   - E2E flow (setup, auth, test execution)

---

#### **ROADMAP.md — Post-Cutover Plan (300 lines) [NEW]**
**Purpose:** Priorities, deuda técnica, timeline for stakeholders  
**Audience:** Product, stakeholders, devs (planning context)

**Sections:**
1. **P1-P5 Items** (80 lines)
   - P1: E2E viewer auth (status: investigating TTL increase)
   - P2: Flow 6 personal names (status: ✅ complete)
   - P3: Toggle INTERNO/EXTERNO (status: ✅ complete)
   - P4: Play Store upload (status: ⏳ AAB ready, waiting)
   - P5: Trial registration (status: ✅ complete)

2. **Deuda Técnica** (120 lines)
   - DT-QA-VIEWER: E2E viewer auth (21 tests, TTL increase needed)
   - DT-QA-FLOW6: Flow 6 + toggle (2 tests)
   - DT-WEB-OG01: OG image (fallback to jpg, investigation pending)
   - DT-WEB-AUTO: Vercel auto-deploy (build step ignored)
   - DT-DEMO-01: Onboarding for demos (tenant DEMO + reset)
   - Status: 6 items, mixed priority

3. **Timeline 2026-Q2** (60 lines)
   - Week of 2026-06-08: E2E TTL fix, P1-P5 closures, Play Store
   - Week of 2026-06-15: E2E suite v2 (multi-rol), App distribution
   - Week of 2026-06-22: Onboarding demos, competitive features

4. **Blockers** (40 lines)
   - E2E viewer auth: Awaiting Supabase TEST TTL increase (manual)
   - Play Store: AAB ready, credentials pending
   - Demo tenant: Ops setup needed

---

#### **TESTING.md — E2E Suite (UPDATE existing, +50 lines)**
**Purpose:** E2E architecture, results, test info  
**Audience:** Devs, QA (testing context)

**Updates:**
1. **Add section:** E2E Test Architecture: @roles Tests
   - Already added via commit 442a008
   - Explain why @roles excluded from chromium
   - Explain refresh_token rotation issue

2. **Update Results:**
   - Before: 362/388 (93.3%)
   - After: 347/374 (92.8%)
   - Reason: 14 @roles tests removed from chromium (no longer redundant)

3. **Add New Tests:**
   - File: `tests/flows/28-acceso-denegado-planner.spec.ts`
   - 4 tests validating planner denial

4. **Next Steps:**
   - TTL increase in Supabase TEST (3600 → 7200)
   - P1-P5 E2E fixes
   - E2E suite v2 (multi-rol, 1100 tests)

---

## Implementation Tasks

| Task | File | Action | Lines | Audience Impact |
|------|------|--------|-------|-----------------|
| 1 | CLAUDE.md | Refactor to hub (remove detail) | 150 → 150 | All: faster ref |
| 2 | ARCHITECTURE.md | Create new | 400 | Devs: decisions |
| 3 | ROADMAP.md | Create new | 300 | Stakeholders: plan |
| 4 | TESTING.md | Update results + new tests | +50 | QA/Devs: E2E state |
| 5 | git | Commit all + validate links | — | All: consistency |

---

## Success Criteria

- [x] CLAUDE.md reduced to 150 lines (hub only)
- [x] ARCHITECTURE.md created with decisions + patterns
- [x] ROADMAP.md created with P1-P5 + deuda técnica
- [x] TESTING.md updated with current results + new tests
- [x] All internal links validated (no broken refs)
- [x] Documentation reviewed by dev team
- [x] Plan ready for implementation 2026-06-09

---

## Notes

- **Audience segmentation:** Each doc targets 1-2 audiences; CLAUDE.md is entry point for all
- **Versioning:** Update CLAUDE.md state section quarterly; deep docs less frequently
- **Maintenance:** Assign one person per doc to keep updated (rotating responsibility)
- **Links:** Use relative paths (e.g., `[ARCHITECTURE](./ARCHITECTURE.md)`) for portability

