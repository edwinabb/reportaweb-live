# REP-3.11-002: Remediation Plan — Incomplete Tareas_Recursos Migration

**Status:** 🔴 CRITICAL — Audit Complete, Awaiting Remediation  
**Date:** 2026-07-12  
**Impact:** Planificación feature blocked; GRUAS tenant has 0 recursos migration

---

## SITUATION

### The Problem
- **CISE:** 135/4,974 tareas have recursos (2.7%)
- **GRUAS:** 0/9,537 tareas have recursos (0.0%)
- **Total:** 135/14,511 tareas (0.93%)
- **Required:** 95%+ coverage for production

### Why This Happened
Bubble → Supabase migration (2026-05-30) did NOT successfully migrate the junction tables that link:
- Tareas ↔ Maquinarias (lista_maquinaria ARRAY)
- Tareas ↔ Personal (lista_personal ARRAY)

### Impact
- Users cannot see resource assignments in /planificacion
- Operations planning is blocked
- GRUAS tenant completely non-functional for planning

---

## IMMEDIATE ACTIONS (TODAY)

### 1. Audit (✅ COMPLETED)
- [x] Run SQL audit queries
- [x] Identify gap: 13,376 tareas missing recursos
- [x] Confirm FK integrity (100% valid)
- [x] Document findings in AUDIT_TAREAS_RECURSOS_REP3.11.002.md

### 2. Remediation Preparation (✅ READY)
- [x] Create migration script: `scripts/migrate-tareas-recursos-complete.ts`
- [x] Create validation script: `scripts/validate-tareas-recursos-post-migration.ts`
- [x] Document remediation process
- [x] Create this execution plan

### 3. Approval Gate
**WAITING FOR:** Technical Lead approval to access Bubble API and proceed with migration

---

## REMEDIATION STEPS (ESTIMATED: 4-6 HOURS)

### PHASE 1: Data Recovery (1-2 hours)

**Goal:** Access Bubble data containing tareas + lista_maquinaria + lista_personal

**Option A: Bubble API (PREFERRED)**
```bash
# Test if API is accessible
curl -H "Authorization: Bearer 5532c3bb4891ccf5c49e69a6cf30b8e7" \
  https://reporta.la/api/1.1/obj/tareas?limit=100

# If successful: Proceed to Option B below
```

**Option B: Manual export**
1. Go to https://reporta.la (old Bubble system)
2. Export tareas table as JSON
3. Save to: `/tmp/bubble-tareas-export.json`

**Option C: Data recovery** (if both fail)
- Escalate to infrastructure team
- Estimated delay: 1-2 business days

### PHASE 2: Execute Migration (2-3 hours)

```bash
# Prerequisites
cd C:\Proyectos\reportaweb3
npm install  # Ensure @supabase/supabase-js is installed

# Step 1: Dry run (test without modifying DB)
npx tsx scripts/migrate-tareas-recursos-complete.ts \
  --mode dry-run \
  --tenant CISE

# Check output - should show how many recursos would be inserted

# Step 2: If satisfied, migrate CISE
npx tsx scripts/migrate-tareas-recursos-complete.ts \
  --mode production \
  --tenant CISE

# Step 3: Migrate GRUAS
npx tsx scripts/migrate-tareas-recursos-complete.ts \
  --mode production \
  --tenant GRUAS

# Step 4: Validate
npx tsx scripts/validate-tareas-recursos-post-migration.ts
```

### PHASE 3: Validation (1 hour)

```bash
# 1. Automatic validation
npx tsx scripts/validate-tareas-recursos-post-migration.ts

# Expected output:
#   CISE Coverage: >=95%
#   GRUAS Coverage: >=95%
#   Status: ✅ PASS

# 2. Manual UI testing
- Navigate to http://localhost:3000/planificacion
- Verify tareas show recursos in timeline
- Test for CISE tenant
- Test for GRUAS tenant
```

### PHASE 4: Deployment (30 min)

```bash
# Create commit
git add docs/ scripts/
git commit -m "feat(v3.11): REP-3.11-002 remediate — migrate 13K+ tareas recursos"

# Create PR to merge develop → master
# Wait for code review + E2E tests
# Merge to production
```

---

## DECISION TREE

```
Is Bubble API accessible?
├─ YES → Proceed with Phase 1 Option A
│   └─ Continue to Phase 2 (2-3 hours)
│
├─ NO → Try manual export
│   └─ If successful: Proceed to Phase 2
│   └─ If failed: Escalate to infrastructure
│
└─ ESCALATION → Infrastructure recovery
    └─ Wait 1-2 business days
    └─ Retry when data is available
```

---

## FILES CREATED

### Audit & Analysis
- **`docs/AUDIT_TAREAS_RECURSOS_REP3.11.002.md`**
  - Comprehensive audit findings
  - Coverage breakdown by tenant
  - FK integrity validation
  - Remediation strategy

### Scripts
- **`scripts/migrate-tareas-recursos-complete.ts`**
  - Reads from Bubble API or JSON file
  - Maps Bubble IDs to Supabase UUIDs
  - Inserts recursos for both CISE and GRUAS
  - Dry-run support for testing

- **`scripts/validate-tareas-recursos-post-migration.ts`**
  - Checks coverage by tenant
  - Validates FK integrity
  - Confirms 95%+ requirement met
  - Generates pass/fail report

### This Document
- **`REP-3.11-002-REMEDIATION-PLAN.md`** (this file)
  - Executive summary
  - Step-by-step execution guide
  - Decision tree for contingencies

---

## SUCCESS CRITERIA

- [ ] Bubble API accessibility confirmed
- [ ] Migration script executed without errors
- [ ] CISE coverage reaches 95%+
- [ ] GRUAS coverage reaches 95%+
- [ ] FK integrity: 0 orphaned records
- [ ] /planificacion UI shows recursos correctly
- [ ] E2E tests pass
- [ ] Code review approved
- [ ] Deployed to production

---

## RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Bubble API unavailable | Escalate to infrastructure; use manual recovery |
| ID mapping incomplete | Use bubble_id field in tareas/maquinarias/profiles |
| Performance on large inserts | Run in batches; monitor DB load |
| Data quality issues | Validate before & after; compare counts |
| Rollback needed | Keep backup; transaction rollback available |

---

## ROLLBACK PROCEDURE

If migration fails or has issues:

```sql
-- Backup current recursos
SELECT * INTO tareas_recursos_backup_20260712
FROM tareas_recursos
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Rollback (delete new inserts)
DELETE FROM tareas_recursos
WHERE created_at >= '2026-07-12 21:00:00'
  AND tenant_id IN (
    '1cb97ec7-326c-4376-93ee-ed317d3da51b',
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73'
  );

-- Restore if needed
INSERT INTO tareas_recursos SELECT * FROM tareas_recursos_backup_20260712;
```

---

## ESTIMATED TIMELINE

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Audit | 2h | ✅ DONE |
| 2. Approval | 0.5h | ⏳ WAITING |
| 3. Data Recovery | 1-2h | ⏳ NOT STARTED |
| 4. Migration | 2-3h | ⏳ NOT STARTED |
| 5. Validation | 1h | ⏳ NOT STARTED |
| 6. Testing/Deploy | 1-2h | ⏳ NOT STARTED |
| **TOTAL** | **7-10h** | ⏳ AWAITING GO |

---

## NEXT STEPS

1. **Technical Lead:** Confirm Bubble API access
2. **Dev:** Begin Phase 1-2 upon approval
3. **QA:** Prepare test plan for /planificacion
4. **DevOps:** Prepare production deployment

---

**Owner:** Claude Agent (automated)  
**Approval:** [Technical Lead Signature]  
**Last Updated:** 2026-07-12 22:40 UTC
