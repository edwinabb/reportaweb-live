# REP-3.11-006: Catalog Sync — Quick Reference Card

**Print this page or keep open during execution**

---

## 📋 QUICK CHECKLIST

```
PHASE 1: AUDIT (15 min)
□ Access Supabase TEST: https://app.supabase.com/ → Project wioozisskjjgjjybsoqo
□ Open SQL Editor
□ Run: Audit Query #1 (summary counts)
□ Run: Audit Query #2 (rubros by tenant)
□ Run: Audit Query #3 (servicios by tenant)
□ Run: Audit Query #4 (contactos_cargo by tenant)
□ Run: Audit Query #5 (personal_cargos by tenant)
□ Run: Audit Query #6 (paises)
□ Run: Audit Query #7 (inactive records)
□ Save results to: docs/v3.11/audit-results/catalogs-audit-2026-07-12.txt

PHASE 2: SEED (10 min, if gaps found)
□ Review migration: supabase/migrations/20260712120000_seed_catalogs_v3_11.sql
□ Terminal: supabase migration up
□ Verify logs show success
□ Re-run Audit Query #1 to verify counts increased

PHASE 3: VALIDATE UI (20 min)
□ Terminal: npm run dev
□ Browser: http://localhost:3000/terceros/nuevo
□ Test: Rubro dropdown loads, can select, saves
□ Test: País dropdown loads, Peru visible, can select
□ Test: Save tercero, verify rubro_id populated
□ Similar tests for: contacto form, personal form, quotation form
□ Document results in test log

PHASE 4: REPORT (10 min)
□ Create: docs/v3.11/REP-3.11-006-REPORT.md
□ Document: Expected vs Actual counts
□ Document: UI validation results
□ Document: Any gaps found & actions
□ Verify: All success criteria met
□ Mark task: COMPLETED
```

---

## 🔍 AUDIT QUERIES (Copy & Paste)

### Query 1: Summary Counts
```sql
SELECT 'rubros' as catalog, COUNT(*) as total, 
  COUNT(CASE WHEN is_active = true THEN 1 END) as active
FROM rubros WHERE tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'servicios_tipo_precios', COUNT(*), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM servicios_tipo_precios WHERE tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'contactos_cargo', COUNT(*), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM contactos_cargo WHERE tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'personal_cargos', COUNT(*), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM personal_cargos WHERE tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'contactos_area', COUNT(*), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM contactos_area WHERE tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'sitios_tipo', COUNT(*), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM sitios_tipo WHERE tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'paises', COUNT(*), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM paises;
```

### Query 2: Rubros by Tenant
```sql
SELECT 
  c.nombre as tenant,
  COUNT(r.id) as total,
  COUNT(CASE WHEN r.is_active = true THEN 1 END) as active,
  STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as items
FROM rubros r
LEFT JOIN companies c ON r.tenant_id = c.id
WHERE r.tenant_id IN (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
GROUP BY c.nombre;
```

### Query 3: All Inactive Records
```sql
SELECT 'rubros' as table_name, COUNT(*) as count
FROM rubros WHERE is_active = false AND tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'contactos_cargo', COUNT(*)
FROM contactos_cargo WHERE is_active = false AND tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'personal_cargos', COUNT(*)
FROM personal_cargos WHERE is_active = false AND tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'contactos_area', COUNT(*)
FROM contactos_area WHERE is_active = false AND tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'))
UNION ALL
SELECT 'sitios_tipo', COUNT(*)
FROM sitios_tipo WHERE is_active = false AND tenant_id IN 
  (SELECT id FROM companies WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC'));
```

---

## 🎯 EXPECTED COUNTS (Reference)

| Catalog | Expected Min | Expected Max | Target |
|---------|-------------|-------------|--------|
| rubros | 8 | 15 | 10-13 |
| servicios_tipo_precios | 3 | 5 | 5 |
| contactos_cargo | 3 | 8 | 6-8 |
| personal_cargos | 5 | 10 | 8-10 |
| contactos_area | 3 | 7 | 5-7 |
| sitios_tipo | 3 | 8 | 6-8 |
| paises (global) | 50+ | 250+ | 100+ |

---

## 🧪 UI TEST CASES

### Test 1: Tercero Create Form
```
URL: http://localhost:3000/terceros/nuevo
□ Page loads
□ Rubro dropdown:
  - Click to open
  - Should show 8+ items
  - Click to select one
  - Value should populate
□ País dropdown:
  - Click to open
  - Should show 50+ countries
  - Search "Perú" → should find Peru
  - Click to select Peru
□ Fill minimal form (razon_social, ruc)
□ Save button → should work
□ Verify tercero.rubro_id IS NOT NULL
□ Verify tercero.pais_id IS NOT NULL
```

### Test 2: Contact Form
```
URL: http://localhost:3000/terceros/{id}/contactos
□ Page loads
□ Cargo dropdown:
  - Click to open
  - Should show 3+ items
  - Can select existing
  - Can type new + create
```

### Test 3: Personal Form (if available)
```
URL: Varies (check /personal, /staff, etc.)
□ Page loads
□ Cargo dropdown:
  - Click to open
  - Should show 5+ items
  - Can select
```

---

## 📊 EXPECTED AUDIT RESULTS

### PASS Criteria (Per Catalog)
```
✅ Total count ≥ expected minimum
✅ Active count > 0
✅ No critical gaps
✅ Multi-tenant isolation OK (CISE ≠ GRUAS for tenant-scoped)
```

### Example PASS Result
```
Catalog: rubros
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CISE: 10 active (Transportes, Construcción, ...)
GRUAS: 9 active (Transportes, Construcción, ...)
Status: ✅ PASS (≥8 each)
```

### Example INCOMPLETE Result
```
Catalog: servicios_tipo_precios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CISE: 2 items (only "Por Hora", "Por Día")
GRUAS: 2 items (only "Por Hora", "Por Día")
Status: ⚠️ INCOMPLETE (expected 5, have 2)
Action: Run migration → should insert 3 more
```

---

## ⚠️ COMMON ISSUES & FIXES

| Problem | Solution |
|---------|----------|
| "Cannot connect to Supabase" | Verify VPN/network, check dashboard connection |
| "Dropdown shows 0 items" | Check is_active = true, verify RLS policy, check tenant_id |
| "Results show old count after seeding" | Cache invalidation - refresh page or re-run query |
| "Migration fails" | Check syntax, verify tables exist, look at error message |
| "UI form won't save" | Check browser console for errors, verify required fields |
| "Multi-tenant isolation broken" | Verify RLS policy on table, check tenant_id in form context |

---

## 📝 REPORTING TEMPLATE

### Create: docs/v3.11/REP-3.11-006-REPORT.md

```markdown
# REP-3.11-006: Catalog Synchronization — Final Report

**Date:** 2026-07-12  
**Executor:** [Your Name]  
**Status:** ✅ COMPLETE

## Audit Results

### Summary
| Catalog | Expected | Actual | Status |
|---------|----------|--------|--------|
| rubros | 8+ | ? | ✅/⚠️ |
| paises | 50+ | ? | ✅/⚠️ |
| servicios_tipo_precios | 3+ | ? | ✅/⚠️ |
| contactos_cargo | 3+ | ? | ✅/⚠️ |
| personal_cargos | 5+ | ? | ✅/⚠️ |
| contactos_area | 3+ | ? | ✅/⚠️ |
| sitios_tipo | 3+ | ? | ✅/⚠️ |

### Details
[Paste audit results here]

## Migration Results
- Seed migration run: YES/NO
- New items inserted: [X]
- No errors: YES/NO

## UI Validation

| Form | Catalog | Status | Notes |
|------|---------|--------|-------|
| Tercero | rubros | ✅ | |
| Tercero | paises | ✅ | |
| Contacto | cargo | ✅ | |
| Personal | cargo | ✅ | |

## Conclusion
✅ All catalogs synchronized and validated
OR
⚠️ [Describe any issues and mitigations]

---

**Approved By:** [Name]  
**Ready for Merge:** YES/NO
```

---

## 🚀 ONE-LINER COMMANDS

```bash
# Start dev server
npm run dev

# Run Supabase migration
supabase migration up

# Check migration status
supabase migration status

# View Supabase logs
supabase log

# Access dashboard
open https://app.supabase.com/

# View specific catalog count (via psql if available)
psql postgres://[connection-string] -c "SELECT COUNT(*) FROM rubros;"
```

---

## ⏱️ TIME TRACKER

**Phase 1: Audit**
- Start: ___:___ 
- End: ___:___ 
- Duration: _____ min (target: 15 min)

**Phase 2: Seed**
- Start: ___:___ 
- End: ___:___ 
- Duration: _____ min (target: 10 min, skip if no gaps)

**Phase 3: UI Test**
- Start: ___:___ 
- End: ___:___ 
- Duration: _____ min (target: 20 min)

**Phase 4: Report**
- Start: ___:___ 
- End: ___:___ 
- Duration: _____ min (target: 10 min)

**TOTAL TIME:** _____ min (target: ~55 min)

---

## 📞 CONTACTS & RESOURCES

**Need Help?**
- Supabase Dashboard: https://app.supabase.com/
- Project: `wioozisskjjgjjybsoqo` (TEST)
- Slack: #tech-support
- Docs: See docs/v3.11/CATALOGS_*.md

**Key Files:**
- This file: `CATALOGS_QUICK_REFERENCE.md` (you are here)
- Audit plan: `CATALOGS_AUDIT_PLAN.md` (details)
- Execution guide: `CATALOGS_EXECUTION_GUIDE.md` (step-by-step)
- Summary: `REP-3.11-006-SUMMARY.md` (overview)
- Code: `lib/actions/catalogs-validation.ts` (TypeScript)
- Migration: `supabase/migrations/20260712120000_seed_catalogs_v3_11.sql` (SQL)

---

**Last Updated:** 2026-07-12  
**Version:** 1.0  
**Status:** ✅ Ready to Use
