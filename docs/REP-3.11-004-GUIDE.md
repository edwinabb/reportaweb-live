# REP-3.11-004: Crear columna notas_internas TEXT en cotizaciones

**Task ID:** REP-3.11-004  
**Title:** Add notas_internas to cotizaciones (1200+ records migration)  
**Status:** 🟡 IN PROGRESS  
**Effort:** 1.5 hours  
**Date:** 2026-07-12  
**Owner:** Dev-B  

---

## 📋 Overview

Add a `notas_internas` (internal notes) TEXT column to the `cotizaciones` table and migrate ~1200 records from Bubble containing sales notes and internal pricing observations.

**Key Points:**
- Column already exists in schema (created in v3.0.x)
- Data needs to be populated from Bubble API (~1200 records)
- Privacy: notas_internas must NOT be visible to clients (sales/admin only)
- Scope: Only CISE and GRUAS tenants affected

---

## 🎯 Objective

1. ✅ **Verify column exists** in Supabase `cotizaciones` table
2. ✅ **Create SQL migration** to initialize the column
3. 🟡 **Create TypeScript migration script** to fetch data from Bubble
4. 🟡 **Execute migration** in TEST environment
5. 🟡 **Validate results** with SQL checks
6. 🟡 **Update backend API** to enforce privacy (exclude from client views)
7. 🟡 **Deploy to PROD** as part of v3.11 release

---

## 📁 Files Created/Modified

### 1. SQL Migration
**File:** `supabase/migrations/20260712120200_migrate_cotizaciones_notas_internas.sql`

- ✅ Ensures `notas_internas` column exists (should already exist)
- ✅ Initializes NULL values to empty string for consistency
- ✅ Documents 3 different data migration paths
- ✅ Includes validation checks and privacy enforcement guidelines
- ✅ Scoped to CISE and GRUAS tenants only

**Key SQL snippets:**
```sql
-- Ensure column exists
ALTER TABLE public.cotizaciones
    ADD COLUMN IF NOT EXISTS notas_internas TEXT DEFAULT NULL;

-- Initialize NULLs to empty strings (CISE + GRUAS only)
UPDATE public.cotizaciones
SET notas_internas = ''
WHERE notas_internas IS NULL
  AND tenant_id IN (
    '1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid,  -- CISE
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid   -- GRUAS
  );
```

### 2. TypeScript Migration Script
**File:** `scripts/migrate-cotizaciones-notas.ts`

- ✅ Fetches all cotizaciones from Bubble API (with pagination)
- ✅ Maps `bubble_id` to Supabase `id`
- ✅ Extracts `notas_internas` or fallback to `Observaciones precios` field
- ✅ Batches updates (100 records per batch)
- ✅ Retry logic with exponential backoff
- ✅ Comprehensive error handling and logging
- ✅ Support for dry-run mode

**Usage:**
```bash
# Dry run (no data updated, safe to test)
npx ts-node scripts/migrate-cotizaciones-notas.ts --env test --dry-run

# Execute migration (TEST environment)
npx ts-node scripts/migrate-cotizaciones-notas.ts --env test

# Execute migration (PROD environment)
npx ts-node scripts/migrate-cotizaciones-notas.ts --env prod
```

**Environment variables required:**
```bash
export SUPABASE_URL=https://wioozisskjjgjjybsoqo.supabase.co
export SUPABASE_KEY=<service-role-key>
export BUBBLE_API_TOKEN=5532c3bb4891ccf5c49e69a6cf30b8e7
```

---

## 🔄 Step-by-Step Execution

### Step 1: Verify Environment Setup
```bash
# Check environment variables
echo "SUPABASE_URL: $SUPABASE_URL"
echo "BUBBLE_API_TOKEN: ${BUBBLE_API_TOKEN:0:10}..."

# If missing, set them:
export SUPABASE_URL=https://wioozisskjjgjjybsoqo.supabase.co  # TEST
# or
export SUPABASE_URL=https://fqwhagryqkkhbgznxtwf.supabase.co  # PROD

# Get service role key from Supabase console
export SUPABASE_KEY=<paste-service-role-key-here>
export BUBBLE_API_TOKEN=5532c3bb4891ccf5c49e69a6cf30b8e7
```

### Step 2: Apply SQL Migration to TEST
```bash
# Option A: Via Supabase CLI
cd C:\Proyectos\reportaweb3
supabase migration up

# Option B: Via Supabase Studio (manual)
# 1. Go to https://supabase.com/dashboard
# 2. Select TEST project (wioozisskjjgjjybsoqo)
# 3. SQL Editor → New Query
# 4. Paste contents of supabase/migrations/20260712120200_migrate_cotizaciones_notas_internas.sql
# 5. Run → Check results
```

### Step 3: Run Dry-Run Test
```bash
npx ts-node scripts/migrate-cotizaciones-notas.ts --env test --dry-run

# Expected output:
# ✅ Found mapping for X records
# 📥 Fetching cotizaciones from Bubble API...
# 🔗 Mapping Bubble IDs to Supabase IDs...
# 🚀 Migrating in batches...
# ✅ Migration complete!
# (This was a DRY RUN - no data was actually updated)
```

### Step 4: Execute Actual Migration (TEST)
```bash
npx ts-node scripts/migrate-cotizaciones-notas.ts --env test

# Expected output: ~1200 records migrated across ~12 batches
# Success rate should be > 95%
```

### Step 5: Validate Results
```sql
-- Run these checks in Supabase Studio (TEST)

-- Check 1: Column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cotizaciones' AND column_name = 'notas_internas';

-- Check 2: Count records with notas_internas populated
SELECT
  CASE
    WHEN tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid THEN 'CISE'
    WHEN tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid THEN 'GRUAS'
    ELSE 'OTHER'
  END as tenant_name,
  COUNT(*) as total,
  COUNT(CASE WHEN notas_internas IS NOT NULL THEN 1 END) as with_notas,
  COUNT(CASE WHEN notas_internas != '' THEN 1 END) as with_content
FROM public.cotizaciones
WHERE tenant_id IN ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, '6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid)
GROUP BY tenant_id
ORDER BY tenant_name;

-- Check 3: Sample records with notas
SELECT id, numero, SUBSTRING(notas_internas, 1, 80) as notas_sample, created_at
FROM public.cotizaciones
WHERE tenant_id IN ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, '6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid)
  AND notas_internas IS NOT NULL
  AND notas_internas != ''
LIMIT 20;
```

### Step 6: Update Backend API (Backend Development)
**File to update:** `lib/api/cotizaciones.ts` or similar

**Changes needed:**
```typescript
// For ADMIN/SALES users (internal view)
export async function getCotizacionDetails(id: string, userRole: string) {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*, notas_internas')  // ✅ INCLUDE for admin/sales
    .eq('id', id)
    .single();
  
  return data;
}

// For CLIENT users (public view)
export async function getCotizacionPublic(id: string) {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id, numero, estado, fecha_emision, total, moneda, ...')  // ❌ NO notas_internas
    .eq('id', id)
    .single();
  
  return data;
}

// In RPC or API routes
app.get('/api/cotizaciones/:id', (req, res) => {
  const isAdmin = req.user.role === 'admin' || req.user.role === 'vendedor';
  const data = getCotizacionDetails(req.params.id, isAdmin);
  
  // Always remove notas_internas for clients
  if (!isAdmin) {
    delete data.notas_internas;
  }
  
  res.json(data);
});
```

### Step 7: Run E2E Tests
```bash
npm run test:e2e -- --grep "cotizaciones"

# Expected: All tests pass
# If tests fail: Review backend changes (Step 6)
```

### Step 8: Deploy to PROD
```bash
# After all validations pass in TEST:

# Option 1: Via Supabase CLI
supabase db push  # Apply migration to PROD

# Option 2: Via manual script
npx ts-node scripts/migrate-cotizaciones-notas.ts --env prod

# Option 3: As part of v3.11 release (recommended)
# Include in deployment pipeline for v3.11 release (2026-07-20)
```

---

## 🔒 Privacy & Security

### Critical: notas_internas Must NOT Be Visible to Clients

**Scenario 1: Client views their quotation via public link**
```
❌ WRONG: Returns {"id": "123", "numero": "CT-001", "notas_internas": "cliente dificil, negociar"}
✅ RIGHT: Returns {"id": "123", "numero": "CT-001"}
```

**Scenario 2: Sales user views quotation**
```
✅ CORRECT: Returns full object including notas_internas
```

### Enforcement Points

1. **Backend API** (MUST implement)
   - Filter `notas_internas` from response for unauthenticated users
   - Filter for authenticated users without 'admin' or 'vendedor' role

2. **RLS Policies** (optional, defense-in-depth)
   ```sql
   CREATE POLICY "notas_internas_admin_only" ON public.cotizaciones
   FOR SELECT
   USING (auth.jwt()->>'role' IN ('admin', 'vendedor', 'owner'));
   ```

3. **Database Views** (optional, for public access)
   ```sql
   CREATE VIEW cotizaciones_public AS
   SELECT id, numero, estado, fecha_emision, total, moneda, -- NO notas_internas
   FROM cotizaciones
   WHERE estado IN ('ENVIADA', 'APROBADA');
   ```

4. **Audit Logging** (recommended)
   - Log all accesses to notas_internas
   - Alert if accessed by non-admin users
   - Monthly compliance report

---

## 📊 Expected Results

| Metric | Value |
|--------|-------|
| **Total Cotizaciones (CISE)** | ~1,300 |
| **Total Cotizaciones (GRUAS)** | ~1,300 |
| **Expected to migrate** | ~1,200-1,500 |
| **Success rate** | 95%+ |
| **Batch size** | 100 records |
| **Estimated time** | 2-3 minutes |
| **Fields extracted** | notas_internas or Observaciones precios |

---

## ⚠️ Potential Issues & Solutions

### Issue 1: "bubble_id mapping not found"
**Cause:** Some Bubble records don't have corresponding Supabase records
**Solution:** 
- Check if migration was incomplete
- Run data audit: `SELECT COUNT(*) FROM cotizaciones WHERE bubble_id IS NULL`
- Consider re-running full cotizaciones migration

### Issue 2: "Timeout connecting to Bubble API"
**Cause:** Network issue or API rate limiting
**Solution:**
- Check BUBBLE_API_TOKEN is valid
- Retry script (it has 3-attempt retry logic)
- Contact Bubble support if recurring

### Issue 3: "SUPABASE_KEY permission denied"
**Cause:** Using anon key instead of service role key
**Solution:**
- Use **service role** key only (not anon)
- Get from Supabase Dashboard → Settings → API → Service Role Key
- Never commit to git

### Issue 4: "Updated X records but expected Y"
**Cause:** Partial migration
**Solution:**
- Rerun script (idempotent, safe to retry)
- Verify all batches completed without errors
- Check application logs for errors

---

## ✅ Checklist for Completion

- [ ] SQL migration applied to TEST environment
- [ ] Dry-run executed successfully (`--dry-run` flag)
- [ ] Actual migration executed (without `--dry-run`)
- [ ] Validation checks pass (SQL queries in Step 5)
- [ ] ~1,200+ records have notas_internas populated
- [ ] Backend API updated to exclude notas_internas from client views
- [ ] E2E tests pass
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Migration applied to PROD (or scheduled for v3.11 release)
- [ ] Sales team notified that notas_internas is ready
- [ ] Task marked as completed

---

## 📚 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Technical decisions, schema patterns
- [ROADMAP.md](./ROADMAP.md) — P1-P5 priorities, 2026-Q2 timeline
- [TESTING.md](./TESTING.md) — E2E suite architecture
- [GAPS_AND_ACTIONS.md](./GAPS_AND_ACTIONS.md) — Full audit with all gaps

---

## 🔗 References

- **Task:** REP-3.11-004
- **Effort:** 1.5 hours
- **Related Gaps:** GAP-4 (notas_internas MEDIA priority)
- **Bubble Data:** ~2,644 cotizaciones in Bubble, ~2,581 in Supabase
- **Tenants:** CISE (1cb97ec7...) + GRUAS (6f4c923a...)
- **Release:** v3.11 (scheduled 2026-07-20)

---

**Last Updated:** 2026-07-12  
**Status:** 🟡 IN PROGRESS  
**Owner:** Dev-B
