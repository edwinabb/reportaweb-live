# FASE 3: Seeding Default - Instrucciones de Ejecución

**Date:** 2026-07-12  
**Status:** READY FOR MANUAL EXECUTION  
**Effort:** 5 minutos  

---

## 📋 Resumen

Después de:
1. ✅ **FASE 2:** Limpiar 1,844 registros huérfanos
2. ✅ **Estado actual:** 14,529 tareas activas, 377 con recursos (2.6%), 14,152 sin recursos (97.4%)

La FASE 3 va a:
- **Insertar 14,152 registros** de `tareas_recursos` con default maquinaria
- **Alcanzar 100% cobertura** (todas las tareas tendrán al menos 1 recurso)
- **Mantener FK Integrity** (todos los maquinaria_id apuntarán a máquinas válidas)

---

## 🚀 Ejecución (Manual)

### Opción 1: Via Supabase Console (Recomendado)

1. **Abre Supabase Console:**
   ```
   https://app.supabase.com/project/fqwhagryqkkhbgznxtwf/sql/new
   ```

2. **Copia este SQL completo:**
   ```sql
   -- FASE 3: Seed default recursos para tareas sin resources
   WITH maquinaria_default AS (
     SELECT DISTINCT ON (tenant_id)
       id, tenant_id
     FROM maquinarias
     WHERE is_active = true
     ORDER BY tenant_id, created_at ASC
   ),
   tareas_sin_recursos AS (
     SELECT t.id, t.tenant_id
     FROM tareas t
     WHERE t.is_active = true
     AND NOT EXISTS (
       SELECT 1 FROM tareas_recursos tr WHERE tr.tarea_id = t.id
     )
   )
   INSERT INTO tareas_recursos (
     id, tenant_id, tarea_id, tipo_recurso,
     maquinaria_id, personal_id, recurso_externo_nombre,
     proveedor_id, is_active, created_at, created_by, tarea_fecha_id
   )
   SELECT
     gen_random_uuid() as id,
     tsr.tenant_id,
     tsr.id as tarea_id,
     'MAQUINARIA' as tipo_recurso,
     COALESCE(md.id, NULL) as maquinaria_id,
     NULL as personal_id,
     NULL as recurso_externo_nombre,
     NULL as proveedor_id,
     true as is_active,
     NOW() as created_at,
     'SYSTEM_SEEDING_V3.11' as created_by,
     NULL as tarea_fecha_id
   FROM tareas_sin_recursos tsr
   LEFT JOIN maquinaria_default md ON tsr.tenant_id = md.tenant_id
   ON CONFLICT DO NOTHING;
   ```

3. **Click "Run"** (o Cmd+Enter)

4. **Espera a que complete** (toma ~30-60 segundos para 14k registros)

5. **Verifica resultado:**
   ```sql
   -- Ejecuta esto para ver el resultado
   SELECT 
     COUNT(*) as total_registros,
     COUNT(DISTINCT tarea_id) as tareas_unicas,
     ROUND(100.0 * COUNT(DISTINCT tarea_id) / (SELECT COUNT(*) FROM tareas WHERE is_active = true), 1) as cobertura_pct
   FROM tareas_recursos;
   ```

   **Resultado esperado:**
   ```
   total_registros | tareas_unicas | cobertura_pct
   ________________|_______________|________________
   ~45000          | 14529         | 100.0
   ```

### Opción 2: Via Supabase CLI

```bash
cd C:/Proyectos/reportaweb3

# Ejecutar la migración
supabase migration up --remote
```

---

## ✅ Validación Post-Ejecución

Después de ejecutar, corre estos queries:

### 1. Verificar cobertura
```sql
SELECT 
  COUNT(*) as total_tareas,
  COUNT(DISTINCT CASE WHEN tr.id IS NOT NULL THEN t.id END) as con_recursos,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN tr.id IS NOT NULL THEN t.id END) / COUNT(*), 1) as cobertura_pct
FROM tareas t
LEFT JOIN tareas_recursos tr ON t.id = tr.tarea_id
WHERE t.is_active = true;
```

**Esperado:** cobertura_pct = 100.0

### 2. Verificar FK Integrity
```sql
-- No debe haber huérfanos
SELECT COUNT(*) FROM tareas_recursos WHERE tarea_id NOT IN (SELECT id FROM tareas);
SELECT COUNT(*) FROM tareas_recursos WHERE maquinaria_id IS NOT NULL AND maquinaria_id NOT IN (SELECT id FROM maquinarias);
```

**Esperado:** Ambas queries retornan 0

### 3. Verificar distribución de recursos
```sql
SELECT 
  tipo_recurso,
  COUNT(*) as cantidad
FROM tareas_recursos
WHERE created_by = 'SYSTEM_SEEDING_V3.11'
GROUP BY tipo_recurso;
```

---

## 📊 Expected Outcome

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total registros | 30,819 | ~45,000 | +14,152 |
| Tareas con recursos | 377 | 14,529 | ✅ +14,152 |
| Cobertura | 2.6% | 100.0% | ✅ Complete |
| FK Orphans | 0 | 0 | ✅ Maintained |

---

## 🎯 Next Steps (After Execution)

1. **Verify in UI:**
   - Open `/planificacion` → should see all tareas with timeline
   - Check `/tareas/[id]` → verify resources are visible

2. **Update memory:**
   - Mark FASE 3 as COMPLETE
   - Proceed to FASE 4: Final validation

3. **Commit:**
   ```bash
   git add .
   git commit -m "feat(v3.11): seed default resources for 14,152 tareas [REP-3.11-002]"
   ```

---

## ⏱️ Timing

- **Execution:** ~60 seconds (14k INSERT operations)
- **Validation:** ~30 seconds (4 verification queries)
- **Total:** ~2 minutes

---

## 🆘 Troubleshooting

### "Query timeout"
- Supabase may timeout large INSERTs. If it does:
  1. Re-run the query (it's idempotent via `ON CONFLICT`)
  2. Or split into smaller batches

### "Foreign key violation"
- Should not happen (we validate maquinaria_id exists)
- Check: Are there inactive maquinarias? Verify with:
  ```sql
  SELECT COUNT(*) FROM maquinarias WHERE is_active = false;
  ```

### "Still low coverage after execution"
- Verify the query ran successfully (check rowcount)
- Run validation query #1 above
- If still <100%: report with query output

---

**Script location:** `supabase/migrations/20260712_phase3_seed_default_recursos.sql`  
**Status:** Ready for production execution
