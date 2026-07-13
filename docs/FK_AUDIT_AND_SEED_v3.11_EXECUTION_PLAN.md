# REP-3.11-005 & REP-3.11-006: FK Audit + Catalog Seeding
## Execution Plan for PROD (Saturday 2026-07-12)

**Timeframe:** 2-3 hours total  
**Status:** READY FOR EXECUTION  
**Executor:** Dev-C (Manual execution required - no direct psql access)

---

## EXECUTIVE SUMMARY

This document provides **step-by-step instructions** to execute two critical v3.11 remediation tasks in PROD:

1. **REP-3.11-005:** Foreign Key Integrity Audit (10 queries, ~15 min)
2. **REP-3.11-006:** Catalog Seeding (Apply migration, ~10 min)

**Expected Outcome:**
- ✅ All 10 FK queries return orphans = 0
- ✅ All 6 catalogs seeded with minimum required values
- ✅ UI dropdowns functional across all forms
- ✅ Documentation committed

---

## PREREQUISITE CHECKLIST

Before starting, verify:

```
□ Access to Supabase Console: https://fqwhagryqkkhbgznxtwf.supabase.co
□ Project: fqwhagryqkkhbgznxtwf (PROD, Brazil)
□ Terminal: cd C:\Proyectos\reportaweb3
□ Git branch: develop
□ .env.local configured (SUPABASE_SERVICE_ROLE_KEY present)
```

---

## PHASE 1: FK AUDIT (15 min)

### Objective
Validate that 10 critical foreign keys have ZERO orphaned records (data integrity check).

### Instructions

**Step 1: Open Supabase Console**
```
1. Go to: https://fqwhagryqkkhbgznxtwf.supabase.co
2. Login with your credentials
3. Click "SQL Editor" (left sidebar)
4. You should see the SQL editor interface
```

**Step 2: Execute 10 FK Queries**

Copy each query below, paste into Supabase SQL Editor, click "Run", and record the result.

#### Query 1: cotizaciones → terceros
```sql
SELECT COUNT(*) as orphans
FROM cotizaciones c
WHERE NOT EXISTS (SELECT 1 FROM terceros t WHERE t.id = c.cliente_id);
```
**Expected:** `orphans = 0` ✅

#### Query 2: cotizaciones_detalle → cotizaciones
```sql
SELECT COUNT(*) as orphans
FROM cotizaciones_detalle cd
WHERE NOT EXISTS (SELECT 1 FROM cotizaciones c WHERE c.id = cd.cotizacion_id);
```
**Expected:** `orphans = 0` ✅

#### Query 3: tareas → cotizaciones (NULL OK)
```sql
SELECT COUNT(*) as orphans
FROM tareas t
WHERE t.cotizacion_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM cotizaciones c WHERE c.id = t.cotizacion_id);
```
**Expected:** `orphans = 0` ✅

#### Query 4: tareas → terceros
```sql
SELECT COUNT(*) as orphans
FROM tareas t
WHERE NOT EXISTS (SELECT 1 FROM terceros t2 WHERE t2.id = t.cliente_id);
```
**Expected:** `orphans = 0` ✅

#### Query 5: tareas_fechas → tareas
```sql
SELECT COUNT(*) as orphans
FROM tareas_fechas tf
WHERE NOT EXISTS (SELECT 1 FROM tareas t WHERE t.id = tf.tarea_id);
```
**Expected:** `orphans = 0` ✅

#### Query 6: tareas_recursos → tareas
```sql
SELECT COUNT(*) as orphans
FROM tareas_recursos tr
WHERE NOT EXISTS (SELECT 1 FROM tareas t WHERE t.id = tr.tarea_id);
```
**Expected:** `orphans = 0` ✅

#### Query 7: tareas_recursos → maquinarias (NULL OK)
```sql
SELECT COUNT(*) as orphans
FROM tareas_recursos tr
WHERE tr.maquinaria_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM maquinarias m WHERE m.id = tr.maquinaria_id);
```
**Expected:** `orphans = 0` ✅

#### Query 8: tareas_recursos → profiles (NULL OK)
```sql
SELECT COUNT(*) as orphans
FROM tareas_recursos tr
WHERE tr.personal_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = tr.personal_id);
```
**Expected:** `orphans = 0` ✅

#### Query 9: reportes_maquinaria → maquinarias
```sql
SELECT COUNT(*) as orphans
FROM reportes_maquinaria rm
WHERE NOT EXISTS (SELECT 1 FROM maquinarias m WHERE m.id = rm.maquinaria_id);
```
**Expected:** `orphans = 0` ✅

#### Query 10: inspecciones → maquinarias
```sql
SELECT COUNT(*) as orphans
FROM inspecciones i
WHERE NOT EXISTS (SELECT 1 FROM maquinarias m WHERE m.id = i.maquinaria_id);
```
**Expected:** `orphans = 0` ✅

### Step 3: Validation

After running all 10 queries:

**PASS Criteria:**
- All 10 queries return `orphans = 0`
- No errors in Supabase console
- Execution time < 10 seconds per query

**FAIL Criteria:**
- ANY query returns `orphans > 0` → Document the affected records and skip seeding until resolved
- Query error → Check table names match your schema

### Step 4: Document Results

Create file: `docs/FK_AUDIT_RESULTS_v3.11_2026-07-12.md`

```markdown
# FK Audit Results — PROD (2026-07-12)

## Execution Date: 2026-07-12
## Executor: [Your Name]

| # | Foreign Key | Orphans | Status |
|---|-------------|---------|--------|
| 1 | cotizaciones → terceros | 0 | ✅ |
| 2 | cotizaciones_detalle → cotizaciones | 0 | ✅ |
| 3 | tareas → cotizaciones | 0 | ✅ |
| 4 | tareas → terceros | 0 | ✅ |
| 5 | tareas_fechas → tareas | 0 | ✅ |
| 6 | tareas_recursos → tareas | 0 | ✅ |
| 7 | tareas_recursos → maquinarias | 0 | ✅ |
| 8 | tareas_recursos → profiles | 0 | ✅ |
| 9 | reportes_maquinaria → maquinarias | 0 | ✅ |
| 10 | inspecciones → maquinarias | 0 | ✅ |

## Conclusion
All 10 foreign key relationships validated. ZERO orphaned records found.

**Status: ✅ PASS**

---
*Execution Time: ~15 minutes*
```

---

## PHASE 2: CATALOG SEEDING (10 min)

### Objective
Seed 6 catalog tables with minimum required values so UI dropdowns are populated.

### Instructions

**Step 1: Navigate to Supabase Dashboard**
```
URL: https://fqwhagryqkkhbgznxtwf.supabase.co
→ SQL Editor
```

**Step 2: Apply Seeding Migration**

Copy the SQL migration below and run it in Supabase SQL Editor.

**File Location:** `supabase/migrations/20260712120000_seed_catalogs_v3_11.sql`

[Migration SQL: See file above for complete content]

Alternatively, if you have local Supabase CLI setup:
```bash
cd C:\Proyectos\reportaweb3
supabase migration up --project-id fqwhagryqkkhbgznxtwf
```

**Step 3: Verify Seeding**

Run the following verification queries in Supabase SQL Editor:

```sql
-- Summary of seeded catalogs for CISE + GRUAS tenants
SELECT 
  'rubros' as catalog,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active
FROM rubros
WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 
  'servicios_tipo_precios',
  COUNT(*),
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM servicios_tipo_precios
WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 
  'contactos_cargo',
  COUNT(*),
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM contactos_cargo
WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 
  'personal_cargos',
  COUNT(*),
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM personal_cargos
WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 
  'contactos_area',
  COUNT(*),
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM contactos_area
WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 
  'sitios_tipo',
  COUNT(*),
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM sitios_tipo
WHERE tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'));
```

**Expected Results:**
```
catalog                    | total | active
───────────────────────────┼───────┼────────
rubros                     | 26    | 26     ← 13 per tenant
servicios_tipo_precios     | 10    | 10     ← 5 per tenant
contactos_cargo            | 16    | 16     ← 8 per tenant
personal_cargos            | 20    | 20     ← 10 per tenant
contactos_area             | 14    | 14     ← 7 per tenant
sitios_tipo                | 16    | 16     ← 8 per tenant
```

---

## PHASE 3: UI VALIDATION (30 min)

### Objective
Spot-check that UI dropdowns now show catalog values.

### Instructions

**Step 1: Start Dev Server**
```bash
cd C:\Proyectos\reportaweb3
npm run dev
# Expected: http://localhost:3000
```

**Step 2: Test Tercero Form**
```
1. Navigate to: http://localhost:3000/terceros/nuevo
2. Click "Rubro" dropdown → should show 8+ items
   Examples: Transportes, Construcción, Minería, etc.
3. Click "País" dropdown → should show 50+ countries
4. Select Peru, Rubro "Construcción"
5. Fill: RazonSocial, RUC
6. Click Save
7. Verify tercero.rubro_id IS NOT NULL ✅
```

**Step 3: Test Contact Form**
```
1. Navigate to: http://localhost:3000/terceros/{id}/contactos/nuevo
2. Click "Cargo" dropdown → should show 8+ items
   Examples: Gerente, Coordinador, Operario, etc.
3. Select a cargo, fill name
4. Click Save
5. Verify contacto.cargo_id IS NOT NULL ✅
```

**Step 4: Test Personal Form** (if exists)
```
1. Navigate to: http://localhost:3000/personal/nuevo
2. Click "Cargo" dropdown → should show 8+ items
3. Select, fill name, save
4. Verify personal.cargo_id IS NOT NULL ✅
```

### Validation Results
Record pass/fail for each form:

| Form | Catalog | Status | Notes |
|------|---------|--------|-------|
| Tercero | rubros | ✅/❌ | |
| Tercero | paises | ✅/❌ | |
| Contacto | cargo | ✅/❌ | |
| Personal | cargo | ✅/❌ | |

---

## PHASE 4: COMMIT RESULTS (5 min)

### Step 1: Create Results Document

File: `docs/FK_AUDIT_AND_SEED_RESULTS_v3.11.md`

```markdown
# REP-3.11-005 & REP-3.11-006: FK Audit & Catalog Seed — Final Results

**Date:** 2026-07-12  
**Executor:** [Your Name]  
**Status:** ✅ COMPLETE

## FK Audit Results
- All 10 foreign keys validated
- Orphans found: 0
- Status: ✅ PASS

## Catalog Seeding Results
- rubros: 26 total (13 per tenant)
- servicios_tipo_precios: 10 total
- contactos_cargo: 16 total (8 per tenant)
- personal_cargos: 20 total (10 per tenant)
- contactos_area: 14 total (7 per tenant)
- sitios_tipo: 16 total (8 per tenant)
- Status: ✅ COMPLETE

## UI Validation
- Tercero form: ✅ Rubro + País dropdowns working
- Contact form: ✅ Cargo dropdown working
- Personal form: ✅ Cargo dropdown working

## Summary
All tasks completed successfully. Database integrity validated. UI catalogs functional.

**Ready for Production:** YES
```

### Step 2: Commit Changes

```bash
cd C:\Proyectos\reportaweb3

# Stage all docs
git add docs/FK_AUDIT_RESULTS_v3.11_2026-07-12.md
git add docs/FK_AUDIT_AND_SEED_RESULTS_v3.11.md

# Commit with message
git commit -m "docs(v3.11): REP-3.11-005 & REP-3.11-006 FK audit + catalog seed execution results"

# Verify
git log -1
```

---

## TROUBLESHOOTING

### Problem: Query times out in Supabase Console
**Solution:** This is normal for large datasets. Wait 30 seconds. If still timeout, check network.

### Problem: Dropdown still shows 0 items after seeding
**Solution:** 
1. Hard refresh browser (Ctrl+Shift+R)
2. Restart dev server (npm run dev)
3. Verify RLS policies allow SELECT on catalog tables
4. Check tenant_id matches current user's tenant

### Problem: Migration fails with "table doesn't exist"
**Solution:** Check that migration hasn't already run. Query:
```sql
SELECT * FROM schema_migrations WHERE name LIKE '20260712%';
```
If no results, try running migration again.

### Problem: Some catalogs still empty after migration
**Solution:**
1. Verify tenant exists: `SELECT id, nombre FROM companies WHERE nombre LIKE '%CISE%' OR nombre LIKE '%GRUAS%';`
2. Check if migration ran: `SELECT * FROM schema_migrations ORDER BY name DESC LIMIT 5;`
3. If tenant doesn't exist, create it first
4. Manually insert records if needed

---

## ROLLBACK (if needed)

### Reset Catalogs to Empty State
```sql
-- ⚠️ CAUTION: This deletes all seeded data
DELETE FROM rubros WHERE tenant_id IN (
  SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC')
);
DELETE FROM servicios_tipo_precios WHERE tenant_id IN (
  SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC')
);
DELETE FROM contactos_cargo WHERE tenant_id IN (
  SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC')
);
-- ... (repeat for other tables)
```

### Undo Migration
```bash
# If using Supabase CLI
supabase db reset --project-id fqwhagryqkkhbgznxtwf

# Or manually mark migration as not run:
# (This is a last resort and requires DB access)
```

---

## SUCCESS CRITERIA CHECKLIST

After completing all phases, verify:

```
PHASE 1: FK AUDIT
□ All 10 queries executed
□ All 10 queries return orphans = 0
□ Results documented in FK_AUDIT_RESULTS_v3.11_2026-07-12.md
□ No errors in Supabase console

PHASE 2: CATALOG SEEDING
□ Migration applied successfully
□ Verification query shows all 6 catalogs populated
□ Seeding counts match expected: rubros=26, servicios=10, cargo=16, etc.
□ No duplicate entries (due to idempotent migration)

PHASE 3: UI VALIDATION
□ Tercero form: Rubro dropdown works
□ Tercero form: País dropdown works
□ Contacto form: Cargo dropdown works
□ Personal form: Cargo dropdown works
□ All forms can save with dropdown values

PHASE 4: COMMIT
□ Results documented in FK_AUDIT_AND_SEED_RESULTS_v3.11.md
□ Changes committed to git
□ Branch: develop

FINAL
□ All success criteria met
□ Documentation complete
□ Ready for PR review
```

---

## TIME TRACKER

Use this to track actual execution time:

**Phase 1 (FK Audit)**
- Start: ___:___
- End: ___:___
- Duration: ___ min (target: 15)

**Phase 2 (Seeding)**
- Start: ___:___
- End: ___:___
- Duration: ___ min (target: 10)

**Phase 3 (UI Validation)**
- Start: ___:___
- End: ___:___
- Duration: ___ min (target: 30)

**Phase 4 (Commit)**
- Start: ___:___
- End: ___:___
- Duration: ___ min (target: 5)

**TOTAL: ___ min (target: 60)**

---

## RESOURCES

- Supabase PROD: https://fqwhagryqkkhbgznxtwf.supabase.co
- Project ID: `fqwhagryqkkhbgznxtwf`
- Repo: `c:\Proyectos\reportaweb3`
- Branch: `develop`
- Migration: `supabase/migrations/20260712120000_seed_catalogs_v3_11.sql`

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-12  
**Status:** ✅ Ready for Execution
