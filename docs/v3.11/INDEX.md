# v3.11 — Task Index & Execution Order

**Status:** 6/6 Tasks Defined & Ready  
**Total Effort:** 15.5 hours  
**Target Sprint:** Week of 2026-07-15  
**Scope:** CISE + GRUAS tenants (2 migrated tenants)

---

## Task Overview

| ID | Title | Effort | Priority | Status | Owner |
|----|----|--------|----------|--------|-------|
| 001 | Migrate PDFs to Supabase Storage | 8h | 🔴 CRITICAL | Pending | DevOps |
| 002 | Audit tareas_recursos completeness | 6h | 🔴 CRITICAL | Pending | QA/Analyst |
| 003 | Add progreso_porcentaje + tarea_padre_id | 4h | 🔴 CRITICAL | ✅ DONE | Dev-B |
| 004 | Add notas_internas to cotizaciones | 1.5h | 🟡 MEDIA | ✅ DONE | Dev-B |
| 005 | FK Integrity Audit | 2h | 🟡 MEDIA | Pending | QA |
| 006 | Sync catalogs (rubros, países, servicios) | 1h | 🟡 MEDIA | 🔄 IN PROGRESS | Dev-C |

---

## Recommended Execution Order

### Day 1 (Monday 2026-07-15): CRITICAL Tasks

```
Morning:
  9:00 - 9:30  Setup & kickoff (read this doc, review plans)
  9:30 - 11:00 START REP-3.11-001 (PDFs migration) — 1.5h
  11:00 - 13:00 CONTINUE REP-3.11-001 (download & upload) — 2h
  
Afternoon:
  13:00 - 13:45 START REP-3.11-002 (audit queries) — 0.75h
  13:45 - 17:00 CONTINUE REP-3.11-002 (analysis & report) — 3.25h

By EOD: REP-3.11-001 & 002 should be 50% done (4.5h elapsed)
```

### Day 2 (Tuesday 2026-07-16): CRITICAL Tasks (Continued)

```
Morning:
  9:00 - 12:00 FINISH REP-3.11-001 (validation & docs) — 3h
  12:00 - 12:30 Lunch / handoff review
  
Afternoon:
  13:00 - 16:30 FINISH REP-3.11-002 (complete audit, validation) — 3.5h

By EOD: REP-3.11-001 (8h) ✅ & REP-3.11-002 (6h) ✅ COMPLETE
```

### Day 3 (Wednesday 2026-07-17): MEDIA Tasks

```
Morning:
  9:00 - 10:00 REP-3.11-006 (catalogs audit & seed) — 1h ✅ QUICK
  10:00 - 12:00 REP-3.11-005 (FK integrity) — 2h ✅
  12:00 - 13:00 Lunch
  
Afternoon:
  13:00 - 13:15 Code review preparation
  13:15 - 14:00 Quick fixes from review
  14:00 - 15:00 Test suite (smoke tests for all changes)
  15:00 - 16:00 Documentation updates

By EOD: REP-3.11-006 (1h) ✅ & REP-3.11-005 (2h) ✅ COMPLETE
```

### Day 4 (Thursday 2026-07-18): QA & Merge

```
Morning:
  9:00 - 11:00 E2E smoke tests (post-migration)
  11:00 - 12:00 Cross-tenant validation (CISE vs GRUAS)
  
Afternoon:
  13:00 - 14:00 Final review & approval
  14:00 - 15:00 Merge to develop
  15:00 - 16:00 Deploy to TEST environment

By EOD: All 6 tasks ✅ COMPLETE, merged to develop, deployed to TEST
```

---

## Task Details

### REP-3.11-001: Migrate PDFs to Supabase Storage

**Docs:** 
- Plan: [v3-11-tickets.md](../v3.11-TICKETS.md) (lines 40-165)
- Details: [GAPS_AND_ACTIONS.md](../GAPS_AND_ACTIONS.md) (lines 49-85)

**What to Do:**
1. Audit Bubble S3 PDFs (40-50 files)
2. Download all PDFs from S3
3. Upload to Supabase Storage: `clients/{tenant_id}/cotizaciones-pdf/`
4. Update `cotizaciones.pdf_url` to new Storage URLs
5. Validate: All PDFs accessible, links work
6. Deprecation plan for old S3

**Acceptance Criteria:**
- [ ] 100% of PDFs in Storage
- [ ] Links publicly accessible
- [ ] 10% random sampling verified
- [ ] Document created with count/sizes

**Effort:** 8 hours (5.5h actual work + 2.5h research/setup)

---

### REP-3.11-002: Audit tareas_recursos Completeness

**Docs:**
- Plan: [v3-11-tickets.md](../v3.11-TICKETS.md) (lines 167-288)
- Details: [GAPS_AND_ACTIONS.md](../GAPS_AND_ACTIONS.md) (lines 94-130)

**What to Do:**
1. Count tareas with resources (should be 80%+)
2. Identify tareas WITHOUT resources
3. If gap found, export from Bubble & insert
4. Validate FK integrity (maquinaria_id, personal_id exist)
5. Test UI: `/planificacion` shows timeline with resources

**Acceptance Criteria:**
- [ ] 95%+ of tareas have resources
- [ ] 0 orphaned records
- [ ] `/planificacion` renders correctly
- [ ] Audit report created

**Effort:** 6 hours (3h audit + 2h remediation + 1h testing)

---

### REP-3.11-003: Add progreso_porcentaje + tarea_padre_id ✅

**Status:** Already completed in previous session

**Delivered:**
- ✅ Migration SQL executed
- ✅ 400+ progreso records migrated
- ✅ 50 subtask relations migrated
- ✅ Dashboard + Planificación updated

---

### REP-3.11-004: Add notas_internas to cotizaciones ✅

**Status:** Already completed in previous session

**Delivered:**
- ✅ Column added to DB
- ✅ 1200+ notes migrated from Bubble
- ✅ UI security verified (not shown to clients)

---

### REP-3.11-005: FK Integrity Audit

**Docs:**
- Plan: [v3-11-tickets.md](../v3.11-TICKETS.md) (lines 493-599)
- Details: [GAPS_AND_ACTIONS.md](../GAPS_AND_ACTIONS.md) (lines 237-251)

**What to Do:**
1. Run FK audit queries (10+ queries for each critical FK)
2. Identify orphaned records (if any)
3. Decide: delete or repair each orphan
4. Create report with findings
5. Implement fixes if needed

**Acceptance Criteria:**
- [ ] All FK audit queries run
- [ ] 0 orphaned records (or documented)
- [ ] Repair/delete decisions made
- [ ] Report created & approved

**Effort:** 2 hours (1.5h audit + 0.5h remediation/docs)

---

### REP-3.11-006: Sync Catalogs ✅ NOW

**Docs:**
- Summary: [REP-3.11-006-SUMMARY.md](./REP-3.11-006-SUMMARY.md) ← COMPREHENSIVE
- Audit Plan: [CATALOGS_AUDIT_PLAN.md](./CATALOGS_AUDIT_PLAN.md)
- Execution Guide: [CATALOGS_EXECUTION_GUIDE.md](./CATALOGS_EXECUTION_GUIDE.md)
- Quick Reference: [CATALOGS_QUICK_REFERENCE.md](./CATALOGS_QUICK_REFERENCE.md)

**What to Do:**
1. Run 7 audit queries (counts, by tenant, inactive records)
2. Seed missing catalogs (if gaps found)
3. Validate UI dropdowns (6 forms)
4. Create findings report

**Deliverables (Already Done):**
- ✅ Comprehensive audit plan with SQL queries
- ✅ TypeScript validation module (catalogs-validation.ts)
- ✅ Idempotent seed migration (20260712120000_seed_catalogs_v3_11.sql)
- ✅ Step-by-step execution guide
- ✅ Quick reference card for execution

**Acceptance Criteria:**
- [ ] All 7 catalogs audited
- [ ] Count discrepancies documented
- [ ] UI dropdowns load & work
- [ ] Multi-tenant isolation verified
- [ ] Report created

**Effort:** 1 hour (15m audit + 10m seed + 20m UI test + 10m docs)

---

## Dependency Graph

```
REP-3.11-003 ✅  REP-3.11-004 ✅  (COMPLETED PRIOR)
        |              |
        └──────┬───────┘
               |
        (No dependencies)
               |
    ┌──────────┼──────────┬──────────┐
    |          |          |          |
REP-3.11-001  REP-3.11-002  REP-3.11-005  REP-3.11-006 (IN PROGRESS)
  (8h)          (6h)          (2h)          (1h)
    |          |          |          |
    └──────────┴──────────┴──────────┘
               |
         (All can run in parallel)
               |
         CODE REVIEW
               |
         MERGE to develop
               |
    DEPLOY to TEST environment
```

**Key:** All 6 tasks can run in parallel with proper team coordination.

---

## Files & References

### v3.11 Documentation
- [v3.11-TICKETS.md](../v3.11-TICKETS.md) — Full ticket specs (6 tickets × 2.5-3 KB each)
- [GAPS_AND_ACTIONS.md](../GAPS_AND_ACTIONS.md) — Root cause analysis (12 gaps identified)

### REP-3.11-006 Files (CURRENT TASK)
- [REP-3.11-006-SUMMARY.md](./REP-3.11-006-SUMMARY.md) — 📄 **START HERE** (overview)
- [CATALOGS_AUDIT_PLAN.md](./CATALOGS_AUDIT_PLAN.md) — 📋 Detailed audit plan
- [CATALOGS_EXECUTION_GUIDE.md](./CATALOGS_EXECUTION_GUIDE.md) — 🔧 Step-by-step guide
- [CATALOGS_QUICK_REFERENCE.md](./CATALOGS_QUICK_REFERENCE.md) — ⚡ Quick reference
- [lib/actions/catalogs-validation.ts](../../lib/actions/catalogs-validation.ts) — 💻 TypeScript code
- [supabase/migrations/20260712120000_seed_catalogs_v3_11.sql](../../supabase/migrations/20260712120000_seed_catalogs_v3_11.sql) — 🗄️ SQL migration

### Database & Code References
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — Schema, RLS, patterns
- [lib/actions/catalogos.ts](../../lib/actions/catalogos.ts) — Backend queries
- [components/terceros/tercero-form.tsx](../../components/terceros/tercero-form.tsx) — UI usage example

### Memory & Context
- [MEMORY.md](../../memory/MEMORY.md) — Session memory (project state)
- [BUBBLE_COMPARISON.md](../../BUBBLE_COMPARISON.md) — 71% migration status

---

## Key Metrics

### Scope
- **Tenants:** CISE + GRUAS only (2 of ~12 total)
- **Catalogs:** 7 (rubros, paises, servicios, cargos, areas, tipos, ubigeo)
- **Expected Records:** 100+ total (varies by catalog)

### Quality Gates
- ✅ No data deletion (only activation/insertion)
- ✅ Idempotent migrations (safe to run multiple times)
- ✅ Full RLS validation (tenant isolation checked)
- ✅ Multi-tenant testing (both tenants validated)

### Timeline
- **Design:** 2.5 hours (completed)
- **Execution:** 1 hour (pending)
- **Total:** 3.5 hours v3.11 work

---

## Success Criteria

### REP-3.11-001 ✅ Success = PDFs Migrated
- All ~45 PDFs in Storage
- Links accessible & tested
- Docment created

### REP-3.11-002 ✅ Success = tareas_recursos Audit Done
- 95%+ completeness achieved
- 0 orphaned records
- Report created

### REP-3.11-005 ✅ Success = FK Integrity Verified
- All FKs checked
- Orphans identified/fixed
- Report created

### REP-3.11-006 ✅ Success = Catalogs Synchronized ← YOU ARE HERE
- All 7 catalogs audited
- Expected counts met
- UI dropdowns working
- Report created

### v3.11 Final ✅ Success = All Done & Merged
- All 6 tasks complete
- Code review approved
- Merged to develop
- Deployed to TEST
- E2E smoke tests pass

---

## Next After v3.11

**v3.12 Deferred Tasks (8 hours):**
- [ ] tarea_padre_id complete validation (subtask expansion)
- [ ] estado_seniat compliance field
- [ ] condicion_maquinaria status field

**Post-Migration (Ongoing):**
- [ ] S3 Bubble deprecation (keep 12 months for legacy)
- [ ] Performance optimization (if needed)
- [ ] Additional E2E tests (multi-rol suite)

---

## Quick Navigation

**New to v3.11?** → Read: [REP-3.11-006-SUMMARY.md](./REP-3.11-006-SUMMARY.md)

**Executing REP-3.11-006?** → Follow: [CATALOGS_EXECUTION_GUIDE.md](./CATALOGS_EXECUTION_GUIDE.md)

**Need quick reference?** → Use: [CATALOGS_QUICK_REFERENCE.md](./CATALOGS_QUICK_REFERENCE.md)

**Want detailed plan?** → See: [CATALOGS_AUDIT_PLAN.md](./CATALOGS_AUDIT_PLAN.md)

**All 6 tasks info?** → Reference: [v3.11-TICKETS.md](../v3.11-TICKETS.md)

---

**Last Updated:** 2026-07-12  
**Status:** ✅ Organized & Ready  
**Next Step:** Execute REP-3.11-006 following CATALOGS_EXECUTION_GUIDE.md
