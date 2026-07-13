# REP-3.11-006: Catalog Synchronization Audit & Validation Plan

**Date:** 2026-07-12  
**Task:** REP-3.11-006  
**Priority:** MEDIA  
**Effort:** 1 hour  
**Status:** IN PROGRESS

---

## Executive Summary

This task validates that all catalog/master data (rubros, paises, servicios_tipo_precios, contactos_cargo, etc.) are synchronized between Bubble (legacy) and Supabase (new), and that UI dropdowns display complete options.

**Key Catalogs to Validate:**
- `rubros` - business sectors for terceros (tenant-scoped)
- `paises` - countries for locations (global)
- `servicios_tipo_precios` - service price types for quotations (tenant-scoped)
- `contactos_cargo` - contact job titles (tenant-scoped)
- `personal_cargos` - staff job titles (tenant-scoped)
- `contactos_area` - contact departments (tenant-scoped)
- `sitios_tipo` - site types (tenant-scoped)

---

## Acceptance Criteria

- [ ] Verify each catalog has all values from Bubble
- [ ] Compare count: Bubble vs Supabase (must match or have documented reason)
- [ ] Insert missing catalogs (if any)
- [ ] Validate UI dropdowns show complete options
- [ ] Document findings in audit report
- [ ] No errors when loading forms with catalog selects

---

## Audit Tasks

### 1. Catalog Count Comparison

**Objective:** Compare record counts between Bubble and Supabase

**Catalogs to Check:**
```
SCOPE: CISE + GRUAS tenants only

Catalog                          | Type      | Location  | Multi-tenant?
---------------------------------|-----------|-----------|---------------
rubros                           | Master    | Supabase  | YES (tenant_id)
paises                           | Lookup    | Supabase  | NO (global)
servicios_tipo_precios           | Master    | Supabase  | YES (tenant_id)
contactos_cargo                  | Master    | Supabase  | YES (tenant_id)
personal_cargos                  | Master    | Supabase  | YES (tenant_id)
contactos_area                   | Master    | Supabase  | YES (tenant_id)
sitios_tipo                       | Master    | Supabase  | YES (tenant_id)
ubigeo                           | Lookup    | Supabase  | NO (Peru geographic)
```

**SQL Queries (Need Supabase Access):**

```sql
-- Check all catalogs with counts
SELECT 'rubros' as catalog, COUNT(*) as total, COUNT(DISTINCT tenant_id) as tenants
FROM rubros
UNION ALL
SELECT 'paises', COUNT(*), COUNT(DISTINCT id) 
FROM paises
UNION ALL
SELECT 'servicios_tipo_precios', COUNT(*), COUNT(DISTINCT tenant_id)
FROM servicios_tipo_precios
UNION ALL
SELECT 'contactos_cargo', COUNT(*), COUNT(DISTINCT tenant_id)
FROM contactos_cargo
UNION ALL
SELECT 'personal_cargos', COUNT(*), COUNT(DISTINCT tenant_id)
FROM personal_cargos
UNION ALL
SELECT 'contactos_area', COUNT(*), COUNT(DISTINCT tenant_id)
FROM contactos_area
UNION ALL
SELECT 'sitios_tipo', COUNT(*), COUNT(DISTINCT tenant_id)
FROM sitios_tipo
UNION ALL
SELECT 'ubigeo', COUNT(*), NULL
FROM ubigeo;
```

### 2. Identify Catalogs by Tenant

**Query tenant-scoped catalogs:**

```sql
-- Rubros per tenant
SELECT 
  (SELECT nombre FROM companies WHERE id = r.tenant_id) as tenant,
  COUNT(*) as rubro_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM rubros r
GROUP BY r.tenant_id
ORDER BY tenant;

-- Similar for: servicios_tipo_precios, contactos_cargo, personal_cargos, contactos_area, sitios_tipo
```

### 3. Validate Global Catalogs

**Paises:**
```sql
SELECT 
  id, 
  nombre, 
  continente, 
  is_active,
  created_at
FROM paises
ORDER BY nombre;
```

**Ubigeo (Peru):**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT departamento) as departments,
  COUNT(DISTINCT provincia) as provinces,
  COUNT(DISTINCT distrito) as districts
FROM ubigeo;
```

### 4. Check for Inactive Records

```sql
-- Find inactive catalogs that should be active
SELECT 'rubros' as table_name, id, nombre, tenant_id, is_active
FROM rubros WHERE is_active = false
UNION ALL
SELECT 'servicios_tipo_precios', id, nombre, tenant_id, is_active
FROM servicios_tipo_precios WHERE is_active = false
UNION ALL
SELECT 'contactos_cargo', id, nombre, tenant_id, is_active
FROM contactos_cargo WHERE is_active = false
UNION ALL
SELECT 'contactos_area', id, nombre, tenant_id, is_active
FROM contactos_area WHERE is_active = false
UNION ALL
SELECT 'personal_cargos', id, nombre, tenant_id, is_active
FROM personal_cargos WHERE is_active = false
UNION ALL
SELECT 'sitios_tipo', id, nombre, tenant_id, is_active
FROM sitios_tipo WHERE is_active = false
ORDER BY table_name, nombre;
```

### 5. UI Validation

**Test Cases:**

| Page | Component | Catalog | Expected Count | Test |
|------|-----------|---------|-----------------|------|
| `/terceros/nuevo` | Rubro select | `rubros` | 10+ | Dropdown loads, can select |
| `/terceros/nuevo` | País select | `paises` | 50+ | Dropdown loads, Peru present |
| `/cotizaciones/nuevo` | Tipo precio select | `servicios_tipo_precios` | 5+ | Dropdown loads (if UI uses it) |
| Contact form | Cargo select | `contactos_cargo` | 3+ | Dropdown loads, can add new |
| Personal form | Cargo select | `personal_cargos` | 3+ | Dropdown loads, can add new |
| Sitio form | Tipo select | `sitios_tipo` | 3+ | Dropdown loads, can add new |

---

## Known Issues / Gaps

### Gap 1: servicios_tipo_precios Not Used in UI
- **Status:** Need to verify if UI actually uses this catalog
- **Action:** Check `/cotizaciones` form components
- **Current:** 58 records in Bubble, may not be fully migrated

### Gap 2: Completeness Unknown Without Bubble Access
- **Blocker:** Cannot run Bubble queries directly
- **Workaround:** 
  1. Use memory docs (BUBBLE_COMPARISON.md shows 71% migrated)
  2. Infer from schema migrations which catalogs were seeded
  3. Test UI for missing options

### Gap 3: Tenant Isolation for New Catalogs
- **Issue:** Dropdowns may not filter correctly by tenant
- **Action:** Verify RLS policies on all tenant-scoped catalogs

---

## Success Criteria

### Before Validation
- [ ] All catalog tables exist in Supabase
- [ ] All have proper tenant_id FK (if tenant-scoped)
- [ ] All have is_active column (if applicable)
- [ ] RLS policies enabled

### After Validation
- [ ] Count matches expected (Bubble vs Supabase)
- [ ] No inactive records that should be active
- [ ] UI dropdowns load without errors
- [ ] User can select from dropdown and save
- [ ] Multi-tenant isolation works (CISE values != GRUAS values)
- [ ] Faltantes inserted (if any)

---

## Migration Template (If Inserts Needed)

```sql
-- Template: Insert missing catalog item
INSERT INTO {table_name} (
  id,
  tenant_id,
  nombre,
  is_active,
  created_at
)
VALUES (
  gen_random_uuid(),
  '{tenant_id}',
  '{nombre}',
  true,
  NOW()
)
ON CONFLICT(tenant_id, nombre) 
DO UPDATE SET is_active = true;
```

---

## Findings Log

### Catalog: rubros

**Current Count in Supabase:**
- CISE: ? (need query)
- GRUAS: ? (need query)
- Total: ? 

**Status:** PENDING QUERY

**Missing from Bubble:**
- (will be determined after audit)

---

### Catalog: paises

**Current Count in Supabase:**
- Global: ? (need query)

**Status:** PENDING QUERY

**Missing countries:**
- (will be determined after audit)

---

### Catalog: servicios_tipo_precios

**Current Count in Supabase:**
- CISE: ? (need query)
- GRUAS: ? (need query)
- Total: ?

**Status:** PENDING QUERY

**UI Usage:**
- Need to verify if `/cotizaciones` form uses this

---

### Catalog: contactos_cargo

**Current Count in Supabase:**
- CISE: ? (need query)
- GRUAS: ? (need query)
- Total: ?

**Status:** PENDING QUERY

---

## Next Steps

1. **Gain Supabase ACCESS** - Execute SQL queries to get actual counts
2. **Compare with BUBBLE_COMPARISON.md** - Extract expected values
3. **Test UI Dropdowns** - Verify forms load and allow selection
4. **Insert Missing Values** - If count < expected, insert
5. **Validate RLS** - Confirm tenant isolation works
6. **Document Findings** - Update findings log above

---

## Timeline

- **Task Start:** 2026-07-12
- **Queries:** 5 min (if access granted)
- **Testing:** 30 min (UI validation)
- **Inserts:** 15 min (if needed)
- **Documentation:** 10 min
- **Total:** ~1 hour

---

## References

- [BUBBLE_COMPARISON.md](../../BUBBLE_COMPARISON.md) - Migration status (71%)
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Schema patterns
- [catalogos.ts](../../lib/actions/catalogos.ts) - Backend queries
- [tercero-form.tsx](../../components/terceros/tercero-form.tsx) - UI usage

