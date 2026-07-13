# REP-3.11-006: Catalog Synchronization - Execution Guide

**Date:** 2026-07-12  
**Task:** REP-3.11-006  
**Priority:** MEDIA  
**Effort:** 1 hour  
**Status:** EXECUTING

---

## Overview

This guide walks through validating and synchronizing all catalog/master data between Bubble (legacy) and Supabase (new), ensuring UI dropdowns are complete.

**Key Deliverables:**
1. ✅ Catalog audit script created (`catalogs-validation.ts`)
2. ✅ Audit plan documented (`CATALOGS_AUDIT_PLAN.md`)
3. 🔄 Execute audits & seed missing data
4. 🔄 Test UI dropdowns
5. 🔄 Document findings

---

## Step-by-Step Execution

### Phase 1: Preparation (5 min)

**Objective:** Understand current state and prepare environment

```bash
# 1. Navigate to project
cd C:\Proyectos\reportaweb3

# 2. Review audit plan
cat docs/v3.11/CATALOGS_AUDIT_PLAN.md

# 3. Review validation script
cat lib/actions/catalogs-validation.ts

# 4. Verify Supabase CLI access
supabase status
```

### Phase 2: Execute Audits (15 min)

**Objective:** Run catalog audits against Supabase TEST

The following audits need to run via Supabase tools or direct SQL access:

#### 2.1 Audit Via SQL (Recommended)

Connect to Supabase TEST (`wioozisskjjgjjybsoqo`) and run:

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- CATALOG AUDIT QUERIES - REP-3.11-006
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. SUMMARY: All catalogs with counts
SELECT 'rubros' as catalog, 'tenant' as scope, COUNT(*) as total, 
  COUNT(DISTINCT tenant_id) as tenants, 
  COUNT(CASE WHEN is_active = true THEN 1 END) as active
FROM rubros
GROUP BY catalog, scope
UNION ALL
SELECT 'servicios_tipo_precios', 'tenant', COUNT(*), 
  COUNT(DISTINCT tenant_id), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM servicios_tipo_precios
GROUP BY catalog, scope
UNION ALL
SELECT 'contactos_cargo', 'tenant', COUNT(*), 
  COUNT(DISTINCT tenant_id), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM contactos_cargo
GROUP BY catalog, scope
UNION ALL
SELECT 'personal_cargos', 'tenant', COUNT(*), 
  COUNT(DISTINCT tenant_id), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM personal_cargos
GROUP BY catalog, scope
UNION ALL
SELECT 'contactos_area', 'tenant', COUNT(*), 
  COUNT(DISTINCT tenant_id), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM contactos_area
GROUP BY catalog, scope
UNION ALL
SELECT 'sitios_tipo', 'tenant', COUNT(*), 
  COUNT(DISTINCT tenant_id), 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM sitios_tipo
GROUP BY catalog, scope
UNION ALL
SELECT 'paises', 'global', COUNT(*), NULL, 
  COUNT(CASE WHEN is_active = true THEN 1 END)
FROM paises
GROUP BY catalog, scope
UNION ALL
SELECT 'ubigeo', 'global', COUNT(*), NULL, NULL
FROM ubigeo;

-- ═══════════════════════════════════════════════════════════════════════════

-- 2. DETAIL: Rubros by tenant
SELECT 
  c.nombre as tenant_name,
  COUNT(r.id) as rubro_count,
  COUNT(CASE WHEN r.is_active = true THEN 1 END) as active,
  COUNT(CASE WHEN r.is_active = false THEN 1 END) as inactive,
  STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as rubros_list
FROM rubros r
LEFT JOIN companies c ON r.tenant_id = c.id
GROUP BY c.nombre, r.tenant_id
ORDER BY tenant_name;

-- ═══════════════════════════════════════════════════════════════════════════

-- 3. DETAIL: Servicios Tipo Precios by tenant
SELECT 
  c.nombre as tenant_name,
  COUNT(s.id) as servicios_count,
  STRING_AGG(s.nombre, ', ' ORDER BY s.nombre) as servicios_list
FROM servicios_tipo_precios s
LEFT JOIN companies c ON s.tenant_id = c.id
GROUP BY c.nombre, s.tenant_id
ORDER BY tenant_name;

-- ═══════════════════════════════════════════════════════════════════════════

-- 4. DETAIL: Contactos Cargo by tenant
SELECT 
  c.nombre as tenant_name,
  COUNT(cc.id) as cargo_count,
  STRING_AGG(cc.nombre, ', ' ORDER BY cc.nombre) as cargos_list
FROM contactos_cargo cc
LEFT JOIN companies c ON cc.tenant_id = c.id
GROUP BY c.nombre, cc.tenant_id
ORDER BY tenant_name;

-- ═══════════════════════════════════════════════════════════════════════════

-- 5. DETAIL: Personal Cargos by tenant
SELECT 
  c.nombre as tenant_name,
  COUNT(pc.id) as cargo_count,
  STRING_AGG(pc.nombre, ', ' ORDER BY pc.nombre) as cargos_list
FROM personal_cargos pc
LEFT JOIN companies c ON pc.tenant_id = c.id
GROUP BY c.nombre, pc.tenant_id
ORDER BY tenant_name;

-- ═══════════════════════════════════════════════════════════════════════════

-- 6. DETAIL: Paises (global)
SELECT 
  id,
  nombre,
  continente,
  is_active
FROM paises
ORDER BY nombre;

-- ═══════════════════════════════════════════════════════════════════════════

-- 7. CHECK: Inactive records (should all be active for user-facing catalogs)
SELECT 'rubros' as table_name, id, nombre, tenant_id, is_active
FROM rubros WHERE is_active = false
UNION ALL
SELECT 'servicios_tipo_precios', id, nombre, tenant_id, is_active
FROM servicios_tipo_precios WHERE is_active = false
UNION ALL
SELECT 'contactos_cargo', id, nombre, tenant_id, is_active
FROM contactos_cargo WHERE is_active = false
UNION ALL
SELECT 'personal_cargos', id, nombre, tenant_id, is_active
FROM personal_cargos WHERE is_active = false
UNION ALL
SELECT 'contactos_area', id, nombre, tenant_id, is_active
FROM contactos_area WHERE is_active = false
UNION ALL
SELECT 'sitios_tipo', id, nombre, tenant_id, is_active
FROM sitios_tipo WHERE is_active = false
ORDER BY table_name, nombre;
```

#### 2.2 Record Audit Results

Create audit results file:

```bash
# Create results directory
mkdir -p docs/v3.11/audit-results/

# Save query output to:
docs/v3.11/audit-results/catalogs-audit-2026-07-12.txt
```

**Document findings:**
- [ ] Catalog counts (expected vs actual)
- [ ] Missing items per catalog
- [ ] Inactive records found
- [ ] Data gaps identified

### Phase 3: Seed Missing Data (10 min)

**Objective:** Insert any missing catalog items

If audit found gaps, create migration file:

```bash
# Example: If rubros are missing for CISE
supabase migration new seed_missing_rubros_cise
```

**Migration Template (`supabase/migrations/YYYYMMDDHHMMSS_seed_missing_catalogs.sql`):**

```sql
BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- REP-3.11-006: Seed Missing Catalogs
-- ═══════════════════════════════════════════════════════════════════════════

-- Get tenant IDs
WITH tenant_ids AS (
  SELECT id, nombre FROM companies 
  WHERE nombre IN ('CISE del Perú SAC', 'GRUAS del PACIFICO SAC')
)

-- Insert missing rubros for CISE (if needed)
INSERT INTO rubros (id, tenant_id, nombre, is_active, created_at)
SELECT 
  gen_random_uuid(),
  t.id,
  items.nombre,
  true,
  NOW()
FROM tenant_ids t
CROSS JOIN (
  VALUES 
    ('Transportes'),
    ('Construcción'),
    ('Minería'),
    ('Manufactura'),
    ('Comercio'),
    ('Servicios'),
    ('Agricultura'),
    ('Telecomunicaciones'),
    ('Energía'),
    ('Finanzas'),
    ('Educación'),
    ('Salud')
) items(nombre)
WHERE t.nombre = 'CISE del Perú SAC'
AND NOT EXISTS (
  SELECT 1 FROM rubros r 
  WHERE r.tenant_id = t.id 
  AND r.nombre = items.nombre
)
ON CONFLICT (tenant_id, nombre) DO UPDATE SET is_active = true;

-- Similar inserts for other catalogs as needed...

COMMIT;
```

**Steps:**
1. Create migration file if gaps found
2. Run: `supabase migration up`
3. Verify inserts with repeat audit query

### Phase 4: Validate UI Dropdowns (20 min)

**Objective:** Verify all forms load and display complete catalog options

#### Test Form: Create Tercero (`/terceros/nuevo`)

```
✓ Page loads without errors
✓ Rubro dropdown:
  - Loads populated list
  - Can select value
  - Can create new if needed
✓ País dropdown:
  - Shows 50+ countries
  - Peru is present and selectable
✓ Save tercero → verify rubro_id populated
```

**Test Steps:**
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to: http://localhost:3000/terceros/nuevo

# 3. Test rubro dropdown
- Click rubro select
- Verify list has 8+ items
- Select one, save form
- Verify tercero.rubro_id is populated

# 4. Test país dropdown
- Click país select
- Verify list has 50+ countries
- Search "Perú" should work
- Select one, save form
- Verify tercero.pais_id is populated
```

#### Test Form: Create Contact (`/terceros/{id}/contactos`)

```
✓ Cargo dropdown:
  - Loads populated list
  - Can select from existing
  - Can create new
✓ Area dropdown (if implemented):
  - Loads populated list
  - Can select from existing
```

#### Test Form: Create Personal (if available)

```
✓ Cargo dropdown:
  - Loads populated list
  - Can select job title
✓ Multi-tenant isolation:
  - CISE user sees CISE values only
  - GRUAS user sees GRUAS values only
```

#### Test Form: Create Quotation (`/cotizaciones/nuevo`)

```
✓ Tipo Precio dropdown (if UI uses it):
  - Loads populated list (3-5 items)
  - Can select value
```

**Document Results:**
- [ ] Tercero form: rubros dropdown ✓
- [ ] Tercero form: paises dropdown ✓
- [ ] Contacto form: cargo dropdown ✓
- [ ] Personal form: cargo dropdown ✓
- [ ] Quotation form: tipo_precio dropdown (if used) ✓

### Phase 5: Validation Report (10 min)

**Objective:** Document findings and close task

Create final report:

```markdown
# REP-3.11-006: Catalog Synchronization Report

## Audit Results

### Summary
- Date: 2026-07-12
- Tenant: CISE, GRUAS
- Total Catalogs Audited: 7
- Status: ✅ PASS

### Catalog Details

#### Rubros
- Expected: 10-15
- Actual: [X]
- Status: ✅ PASS / ⚠️ INCOMPLETE / ❌ MISSING
- Missing: None / [list]

#### Paises  
- Expected: 50+
- Actual: [X]
- Status: ✅ PASS / ⚠️ INCOMPLETE
- Missing: None / [list]

#### Servicios Tipo Precios
- Expected: 3-5
- Actual: [X]
- Status: ✅ PASS / ⚠️ INCOMPLETE
- Missing: None / [list]

#### Contactos Cargo
- Expected: 3-5
- Actual: [X]
- Status: ✅ PASS / ⚠️ INCOMPLETE
- Missing: None / [list]

#### Personal Cargos
- Expected: 5-8
- Actual: [X]
- Status: ✅ PASS / ⚠️ INCOMPLETE
- Missing: None / [list]

#### Contactos Area
- Expected: 3-5
- Actual: [X]
- Status: ✅ PASS / ⚠️ INCOMPLETE
- Missing: None / [list]

#### Sitios Tipo
- Expected: 3-5
- Actual: [X]
- Status: ✅ PASS / ⚠️ INCOMPLETE
- Missing: None / [list]

## UI Validation Results

| Form | Catalog | Status | Notes |
|------|---------|--------|-------|
| Tercero Create | rubros | ✅ | Dropdown loads, can select |
| Tercero Create | paises | ✅ | 50+ countries, Peru present |
| Contacto Create | cargo | ✅ | Can select or create |
| Personal Create | cargo | ✅ | Can select job title |
| Quotation Create | tipo_precio | ✅/N/A | [if used] |

## Conclusions

✅ **PASS** - All catalogs synchronized and UI dropdowns complete

### Actions Taken
- [ ] Audit queries executed
- [ ] [X] missing items inserted (if needed)
- [ ] UI validation completed
- [ ] This report created

### Next Steps
- Proceed with other v3.11 tasks (REP-3.11-001, 002, 005)
- Consider scheduling monthly catalog maintenance

---

**Task Completed By:** [User]  
**Date Completed:** 2026-07-12  
**Verification:** ✅ Ready for Merge
```

---

## Troubleshooting

### Issue: "Cannot access Supabase (no permission)"

**Solution:**
1. Verify you have TEST project access
2. Use Supabase dashboard directly: https://app.supabase.com/
3. Project ID: `wioozisskjjgjjybsoqo`
4. SQL editor → copy queries from this guide

### Issue: "Dropdown shows 0 items"

**Check:**
```sql
-- Verify data exists
SELECT COUNT(*) FROM {table_name} 
WHERE tenant_id = '{your_tenant_id}' 
AND is_active = true;

-- Verify RLS policy allows read
SELECT * FROM {table_name} 
WHERE is_active = true 
LIMIT 1;
```

### Issue: "Multi-tenant isolation broken"

**Check RLS Policies:**
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('rubros', 'contactos_cargo', 'personal_cargos', 'sitios_tipo')
ORDER BY tablename;
```

---

## Success Criteria Checklist

- [ ] All audit queries executed successfully
- [ ] Expected catalog counts match actual counts
- [ ] No critical gaps found (or documented & seeded)
- [ ] All UI dropdowns load without errors
- [ ] Multi-tenant isolation verified
- [ ] Audit report created
- [ ] Task marked complete

---

## References

- [CATALOGS_AUDIT_PLAN.md](./CATALOGS_AUDIT_PLAN.md)
- [catalogs-validation.ts](../../lib/actions/catalogs-validation.ts)
- [catalogos.ts](../../lib/actions/catalogos.ts)
- [tercero-form.tsx](../../components/terceros/tercero-form.tsx)

---

**Last Updated:** 2026-07-12  
**Status:** Ready for Execution
