# Catalog Sync Audit v3.11

**Status:** COMPLETE  
**Date:** 2026-07-13  
**Ticket:** REP-3.11-006  
**Environment:** Supabase PROD (fqwhagryqkkhbgznxtwf)

---

## Executive Summary

Master catalog audit to verify completeness of dropdown/select data. These catalogs are critical for:
- UI form dropdowns (terceros/cotizaciones screens)
- Data validation
- Reporting and filtering

**Result:** ⚠️ 3 of 4 core catalogs are EMPTY (gaps identified)

---

## Audit Results

### Core Catalogs (Multi-tenant)

| Catalog | Records | Status | Expected | Notes |
|---------|---------|--------|----------|-------|
| `paises` | 249 | ✅ OK | 200+ | Complete country list present |
| `rubros` | 0 | ⚠️ EMPTY | 15-30 | **GAP: Missing service types/categories** |
| `servicios_tipo_precios` | 0 | ⚠️ EMPTY | 58 | **GAP: Should have 58 from Bubble migration** |
| `contactos_cargo` | 0 | ⚠️ EMPTY | 20-30 | **GAP: Contact position types missing** |

---

## Impact Analysis

### Affected UI Flows

1. **Terceros (Clients) Form** (`/terceros/nuevo`)
   - `rubros` dropdown — **Currently empty**
   - Users cannot select service category
   - Form submission may fail or default to NULL

2. **Cotizaciones (Quotes) Form** (`/cotizaciones/nuevo`)
   - `servicios_tipo_precios` dropdown — **Currently empty**
   - Cannot select pricing service type
   - Form validation blocked

3. **Contactos (Contacts) Form** (`/terceros/:id/contactos`)
   - `contactos_cargo` dropdown — **Currently empty**
   - Cannot assign contact job title
   - Form may fail on submission

### Severity

- **rubros:** HIGH — blocks terceros workflow
- **servicios_tipo_precios:** HIGH — blocks cotizaciones workflow  
- **contactos_cargo:** MEDIUM — affects contactos workflow

---

## Gap Details

### 1. rubros (Service Types/Categories)

**Schema:**
```sql
CREATE TABLE rubros (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  codigo TEXT,
  nombre TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Expected entries:**
- Service categories like: "Alquiler", "Transporte", "Izaje", "Maniobra", etc.
- Typically 15-30 entries per tenant

**Current:** 0 records across all tenants (CISE + GRUAS)

**Source:** Unknown (not found in seed scripts — may be Bubble-specific)

---

### 2. servicios_tipo_precios (Service Pricing Types)

**Schema:**
```sql
CREATE TABLE servicios_tipo_precios (
  id UUID PRIMARY KEY,
  bubble_id TEXT,
  tenant_id UUID NOT NULL,
  codigo TEXT,
  nombre TEXT,
  minimo_opcion_bubble_id TEXT,
  created_at TIMESTAMP
);
```

**Expected:** 58 records from Bubble (per `migrate-servicios-tipo-precios.ts`)

**Current:** 0 records — migration appears to have not run or failed

**Migration script:** `scripts/migrate-servicios-tipo-precios.ts`

**Status:** ⚠️ Needs re-execution or verification

---

### 3. contactos_cargo (Contact Job Titles)

**Schema:**
```sql
CREATE TABLE contactos_cargo (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Expected entries:**
- "Gerente General", "Jefe de Operaciones", "Supervisor", "Encargado", etc.
- Typically 20-30 entries

**Current:** 0 records

**Source:** Likely Bubble migration or seed data — unknown

---

## Remediation Options

### Option A: Re-run Migration Scripts (Preferred)

If data exists in Bubble:
```bash
# For servicios_tipo_precios
npx tsx scripts/migrate-servicios-tipo-precios.ts

# For other catalogs (check if migration scripts exist)
npx tsx scripts/migrate-*.ts  # Run all applicable migration scripts
```

**Note:** Verify Bubble API credentials in `.env.local` first

### Option B: Seed with Default Values

Create data if Bubble doesn't have it:

```javascript
const RUBROS = [
  { tenant_id: CISE, nombre: 'Alquiler de Grúa', is_active: true },
  { tenant_id: CISE, nombre: 'Transporte', is_active: true },
  { tenant_id: CISE, nombre: 'Maniobra', is_active: true },
  // ... etc
];

await supabase.from('rubros').insert(RUBROS);
```

### Option C: Manual Entry via UI

Use admin panel to add entries one-by-one (slowest, suitable for small corrections only)

---

## Verification Steps

### After remediation, verify:

1. **Count check:**
   ```bash
   npx tsx --eval "
     const { createClient } = require('@supabase/supabase-js');
     const sb = createClient(URL, KEY);
     for (const t of ['rubros', 'servicios_tipo_precios', 'contactos_cargo']) {
       const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
       console.log(\`\${t}: \${count}\`);
     }
   "
   ```

2. **UI Dropdown Test:**
   - Navigate to `/terceros/nuevo`
   - Check that `rubros` dropdown shows entries
   - Repeat for other affected forms

3. **Form Submission Test:**
   - Create new tercero with rubros selection
   - Verify database record has `rubros` linked correctly

---

## Acceptance Criteria

- [ ] All 4 catalogs have records (count > 0)
- [ ] Gap analysis completed
- [ ] Remediation executed (Option A, B, or C)
- [ ] Verification tests passed
- [ ] UI dropdowns tested manually
- [ ] Ticket marked DONE

---

## Files Generated

- `CATALOG_SYNC_AUDIT_v3.11.md` — This file
- Audit script: `C:\...\scratchpad\catalog-audit.js`
- Audit execution: 2026-07-13 03:00:47Z

---

## Next Steps

1. **Immediate:** Determine why migrations didn't populate data
   - Check if migration scripts were executed
   - Review Bubble API availability
   - Check for error logs

2. **Short-term:** Execute Option A (re-run migrations) or Option B (seed defaults)

3. **Follow-up:** Verify UI forms work correctly after remediation

---

## Audit Execution Log

### Run 1: 2026-07-13 03:00:47Z

**Method:** Supabase JS client + REST API  
**Tool:** Node.js script (`catalog-audit.js`)  
**Results:**
- paises: 249 ✅
- rubros: 0 ⚠️
- servicios_tipo_precios: 0 ⚠️
- contactos_cargo: 0 ⚠️

**Conclusion:** 3 gaps identified. Requires immediate remediation.

---

**Auditor:** Dev-C (Claude)  
**Ticket:** REP-3.11-006  
**Project:** Reporta v3.11
