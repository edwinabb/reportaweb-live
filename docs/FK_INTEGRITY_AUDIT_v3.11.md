# FK Integrity Audit v3.11

**Date:** 2026-07-13  
**Audit ID:** REP-3.11-005  
**Environment:** Supabase PROD (fqwhagryqkkhbgznxtwf)  
**Status:** PLANNED (Ready for execution)

---

## Executive Summary

FK (Foreign Key) integrity audit to verify that all referenced records exist (no orphaned records). This audit is critical before production queries can execute safely.

**Expected outcome:** All 10 FK checks pass with 0 orphaned records.

---

## Technical Constraints

FK audit queries require **raw SQL execution** against PostgreSQL. Available execution methods:

| Method | Availability | Limitation |
|--------|---------------|-----------|
| Supabase PostgREST API | ✅ Available | No raw SQL support — only SELECT via REST |
| Supabase SQL Editor (Web Console) | ✅ Available | Requires manual login + execution in UI |
| supabase-js client | ✅ Available | No raw SQL support — only JSON API |
| Edge Functions (Deno) | ✅ Available | No direct pg connection without credentials |
| Direct psql/pg client | ⚠️ Requires | Needs PostgreSQL password (not in .env.local) |

**Current blockers:**
- `.env.local` contains JWT tokens (ANON_KEY, SERVICE_ROLE_KEY) but NOT the PostgreSQL password
- Supabase doesn't expose DB password in public APIs
- Must obtain password from Supabase dashboard → Database → Connection string

---

## Recommended Execution Path

### Option A: Via Supabase Console (UI) — Recommended

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Select project `fqwhagryqkkhbgznxtwf` (PROD)
3. Go to **SQL Editor** → Create new query
4. Copy-paste the SQL audit script (see below)
5. Execute and capture results

### Option B: Via psql (CLI) — Alternative

1. Get PostgreSQL password:
   - Supabase Dashboard → Database → Connection string (URI)
   - Extract password from `postgresql://postgres:<PASSWORD>@...`
2. Run:
   ```bash
   psql "postgresql://postgres:<PASSWORD>@fqwhagryqkkhbgznxtwf.supabase.co:5432/postgres" \
     -f fk-audit-queries.sql
   ```

### Option C: Via Node.js pg client (After obtaining password)

```bash
SUPABASE_DB_PASSWORD="<password>" node fk-audit-pg.js
```

---

## FK Audit Queries (10 total)

```sql
-- ────────────────────────────────────────────────────────────
-- FK INTEGRITY AUDIT v3.11
-- Supabase PROD: fqwhagryqkkhbgznxtwf
-- Timestamp: 2026-07-13T02:50:00Z
-- ────────────────────────────────────────────────────────────

\echo 'FK-1: cotizaciones.cliente_id → terceros.id'
SELECT COUNT(*) as orphans FROM cotizaciones c
WHERE NOT EXISTS (SELECT 1 FROM terceros t WHERE t.id = c.cliente_id);

\echo 'FK-2: cotizaciones_detalle.cotizacion_id → cotizaciones.id'
SELECT COUNT(*) as orphans FROM cotizaciones_detalle cd
WHERE NOT EXISTS (SELECT 1 FROM cotizaciones c WHERE c.id = cd.cotizacion_id);

\echo 'FK-3: tareas.cotizacion_id → cotizaciones.id (NULL OK)'
SELECT COUNT(*) as orphans FROM tareas t
WHERE t.cotizacion_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM cotizaciones c WHERE c.id = t.cotizacion_id);

\echo 'FK-4: tareas.cliente_id → terceros.id'
SELECT COUNT(*) as orphans FROM tareas t
WHERE NOT EXISTS (SELECT 1 FROM terceros t2 WHERE t2.id = t.cliente_id);

\echo 'FK-5: tareas_fechas.tarea_id → tareas.id'
SELECT COUNT(*) as orphans FROM tareas_fechas tf
WHERE NOT EXISTS (SELECT 1 FROM tareas t WHERE t.id = tf.tarea_id);

\echo 'FK-6: tareas_recursos.tarea_id → tareas.id'
SELECT COUNT(*) as orphans FROM tareas_recursos tr
WHERE NOT EXISTS (SELECT 1 FROM tareas t WHERE t.id = tr.tarea_id);

\echo 'FK-7: tareas_recursos.maquinaria_id → maquinarias.id'
SELECT COUNT(*) as orphans FROM tareas_recursos tr
WHERE tr.maquinaria_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM maquinarias m WHERE m.id = tr.maquinaria_id);

\echo 'FK-8: tareas_recursos.personal_id → profiles.id'
SELECT COUNT(*) as orphans FROM tareas_recursos tr
WHERE tr.personal_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = tr.personal_id);

\echo 'FK-9: reportes_maquinaria.maquinaria_id → maquinarias.id'
SELECT COUNT(*) as orphans FROM reportes_maquinaria rm
WHERE NOT EXISTS (SELECT 1 FROM maquinarias m WHERE m.id = rm.maquinaria_id);

\echo 'FK-10: inspecciones.maquinaria_id → maquinarias.id'
SELECT COUNT(*) as orphans FROM inspecciones i
WHERE NOT EXISTS (SELECT 1 FROM maquinarias m WHERE m.id = i.maquinaria_id);
```

---

## Expected Results

### Success Scenario (All PASS)

```
FK-1: ... orphans | 0
FK-2: ... orphans | 0
FK-3: ... orphans | 0
FK-4: ... orphans | 0
FK-5: ... orphans | 0
FK-6: ... orphans | 0
FK-7: ... orphans | 0
FK-8: ... orphans | 0
FK-9: ... orphans | 0
FK-10: ... orphans | 0
```

**Status:** ✅ ALL FK CHECKS PASSED

---

### Failure Scenario (If orphans found)

If any COUNT > 0, take remediation action:

#### Option A: Delete orphaned records

```sql
DELETE FROM cotizaciones_detalle cd
WHERE NOT EXISTS (SELECT 1 FROM cotizaciones c WHERE c.id = cd.cotizacion_id);
```

#### Option B: Repair by updating FK to valid value

```sql
UPDATE tareas SET cliente_id = '<known_valid_tercero_id>'
WHERE NOT EXISTS (SELECT 1 FROM terceros t WHERE t.id = t.cliente_id);
```

---

## Acceptance Criteria

- [ ] 10 FK queries executed successfully
- [ ] All COUNT results documented
- [ ] 0 orphans found (or documented + remediated)
- [ ] Results committed to audit log
- [ ] Ticket marked DONE with audit timestamp

---

## Files Generated

- `supabase/functions/fk-audit/index.ts` — Edge Function skeleton (partial support)
- `C:\...\scratchpad\fk-audit-pg.js` — Node.js pg client script
- `C:\...\scratchpad\fk-audit.sql` — SQL script for manual execution

---

## Next Steps

1. **Execute** FK audit via Option A (Supabase Console)
2. **Document** results in this file (section below)
3. **Commit** audit results
4. **Proceed** to Ticket 6 (Catálogos sync)

---

## Audit Execution Log

### Attempt 1: 2026-07-13 02:50:00Z

**Method:** Supabase CLI + supabase-js client  
**Status:** ⚠️ BLOCKED  
**Reason:** PostgREST API doesn't support raw SQL; pg client requires DB password

**Next:** Use Supabase Web Console (Option A)

---

## Findings

*To be updated after execution*

| Check | Orphans | Status | Notes |
|-------|---------|--------|-------|
| FK-1  | TBD     | —      | —     |
| FK-2  | TBD     | —      | —     |
| FK-3  | TBD     | —      | —     |
| FK-4  | TBD     | —      | —     |
| FK-5  | TBD     | —      | —     |
| FK-6  | TBD     | —      | —     |
| FK-7  | TBD     | —      | —     |
| FK-8  | TBD     | —      | —     |
| FK-9  | TBD     | —      | —     |
| FK-10 | TBD     | —      | —     |

---

## Signature

**Auditor:** Dev-C (Claude)  
**Date:** 2026-07-13  
**Project:** Reporta v3.11  
**Ticket:** REP-3.11-005
