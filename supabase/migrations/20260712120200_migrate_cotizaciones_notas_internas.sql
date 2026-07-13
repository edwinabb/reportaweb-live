-- v3.11.004 — Add notas_internas column to cotizaciones + migrate data from Bubble
--
-- Task: REP-3.11-004: Crear columna notas_internas TEXT en cotizaciones. Migrar 1200+ registros de Bubble
--
-- Description:
--   - Add notas_internas TEXT column to cotizaciones table (should already exist from v3.0.x)
--   - Initialize NULL values to empty string for consistency
--   - Document migration path for ~1200 records from Bubble
--   - Ensure only CISE and GRUAS tenants are affected
--
-- Notas internas are PRIVATE notes for internal sales/admin use only.
-- They should NOT be visible to clients viewing quotations.
-- Privacy is enforced at the application layer via:
--   - Backend: exclude notas_internas from SELECT statements to clients
--   - RLS: optional row-level security policies
--   - UI: never display to unauthenticated/client users
--
-- Migration sources (in order of preference):
--   1. bubble_cotizaciones mirror table (if imported)
--   2. Bubble API direct sync (via TypeScript script)
--   3. CSV dump from Bubble backup
--   4. Manual data entry by sales team
--
-- Scope: Only CISE (1cb97ec7-326c-4376-93ee-ed317d3da51b) and GRUAS (6f4c923a-c3b7-47c2-9dea-2a187f274f73) tenants

BEGIN;

-- ==============================================================================
-- STEP 1: Ensure notas_internas column exists
-- ==============================================================================
-- The column should already exist from the cotizaciones_module migration (20251208203000_cotizaciones_module.sql).
-- This ADD COLUMN IF NOT EXISTS will safely verify it exists or create it if missing.
--
ALTER TABLE public.cotizaciones
    ADD COLUMN IF NOT EXISTS notas_internas TEXT DEFAULT NULL;

-- ==============================================================================
-- STEP 2: Initialize NULL notas_internas to empty string
-- ==============================================================================
-- Ensures consistency: all records have a value (not NULL)
-- This prepares the column for data ingestion from Bubble
--
UPDATE public.cotizaciones
SET notas_internas = ''
WHERE notas_internas IS NULL
  AND tenant_id IN (
    -- Only CISE and GRUAS tenants (scope of v3.11)
    '1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid,  -- CISE
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid   -- GRUAS
  );

-- ==============================================================================
-- STEP 3: Data migration options (see TypeScript script for actual execution)
-- ==============================================================================
--
-- ✅ RECOMMENDED: Use TypeScript migration script (scripts/migrate-cotizaciones-notas.ts)
--   This script:
--   1. Connects to Bubble API
--   2. Fetches all cotizaciones records with notas_internas field
--   3. Maps bubble_id to Supabase id
--   4. Batches UPDATE statements (1000 records at a time)
--   5. Logs progress and errors
--
-- 🔄 ALTERNATIVE: If you have a mirror table:
--   UPDATE public.cotizaciones c
--   SET notas_internas = TRIM(COALESCE(b.notas_internas, ''))
--   FROM bubble_cotizaciones b
--   WHERE c.bubble_id = b._id
--     AND c.tenant_id IN ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, '6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid)
--     AND b.notas_internas IS NOT NULL
--     AND TRIM(b.notas_internas) != '';
--
-- 📊 ALTERNATIVE: If you have a CSV export from Bubble:
--   1. Create temp table: CREATE TEMP TABLE temp_notas_backup AS SELECT id, notas_internas FROM cotizaciones;
--   2. Load CSV data into temp table with bubble_id mapping
--   3. Execute UPDATE with the mapping

-- ==============================================================================
-- STEP 4: Validation checks (run after migration script completes)
-- ==============================================================================

-- Check 1: Verify column exists and has correct data type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cotizaciones' AND column_name = 'notas_internas';

-- Check 2: Count total cotizaciones records for CISE and GRUAS
SELECT
  c.tenant_id,
  CASE
    WHEN c.tenant_id = '1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid THEN 'CISE'
    WHEN c.tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid THEN 'GRUAS'
    ELSE 'OTHER'
  END as tenant_name,
  COUNT(*) as total_cotizaciones,
  COUNT(CASE WHEN notas_internas IS NOT NULL THEN 1 END) as with_notas,
  COUNT(CASE WHEN notas_internas IS NOT NULL AND TRIM(notas_internas) != '' THEN 1 END) as with_notas_content
FROM public.cotizaciones
GROUP BY c.tenant_id
ORDER BY c.tenant_id;

-- Check 3: Sample records with notas_internas populated
SELECT id, numero, tenant_id, SUBSTRING(notas_internas, 1, 100) as notas_sample, updated_at
FROM public.cotizaciones
WHERE tenant_id IN ('1cb97ec7-326c-4376-93ee-ed317d3da51b'::uuid, '6f4c923a-c3b7-47c2-9dea-2a187f274f73'::uuid)
  AND notas_internas IS NOT NULL
  AND TRIM(notas_internas) != ''
LIMIT 10;

-- ==============================================================================
-- STEP 5: Privacy enforcement (application layer)
-- ==============================================================================
--
-- ⚠️ CRITICAL: notas_internas MUST NOT be exposed to end clients
--
-- BACKEND IMPLEMENTATION (for REST API and RPC functions):
--
--   For ADMIN/SALES users (has role 'admin' or 'vendedor'):
--     SELECT id, numero, cliente_id, ..., notas_internas FROM cotizaciones
--     WHERE tenant_id = $1 AND id = $2
--
--   For UNAUTHENTICATED/CLIENT users (uses public view):
--     SELECT id, numero, cliente_id, ..., estado FROM cotizaciones_public_view
--     WHERE id = $2
--     -- NEVER include notas_internas in result set
--
-- DATABASE-LEVEL (optional RLS policy):
--
--   CREATE POLICY "notas_internas_admin_only" ON public.cotizaciones
--   FOR SELECT
--   USING (
--     auth.jwt()->>'role' IN ('admin', 'vendedor', 'owner')
--     OR (current_user_id = created_by)
--   );
--
-- AUDIT LOG (optional):
--   - Log all access to notas_internas via application
--   - Alert if accessed by unauthorized roles
--   - Monthly report of access patterns
--
-- COMPLIANCE:
--   - Notas internas may contain sensitive pricing, customer feedback, internal strategy
--   - Do NOT sync to third-party systems (Zapier, n8n) without approval
--   - Do NOT include in PDF exports to clients
--   - Do NOT display in mobile app (REPORTA App v1.8.x does not have notas_internas UI)

-- ==============================================================================
-- STEP 6: Post-migration tasks
-- ==============================================================================
--
-- 1. ✅ Run TypeScript migration script (see above)
-- 2. ✅ Verify data with validation checks (STEP 4)
-- 3. ✅ Update backend API routes to exclude notas_internas from client views
-- 4. ✅ Add audit logging for notas_internas access
-- 5. ✅ Run E2E tests (E2E suite, cotizaciones module)
-- 6. ✅ Communication: Notify sales team that notas_internas is ready
-- 7. ✅ Deployment: Include in v3.11 release (scheduled 2026-07-20)

COMMIT;
