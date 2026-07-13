-- Migration: FASE 3 - Seed default recursos para tareas sin resources
-- Date: 2026-07-12
-- Description: Assigns default maquinaria to 14,152 tareas that have no resources

-- Step 1: Verify coverage before seeding
DO $$
DECLARE
  total_tareas INTEGER;
  tareas_con_recursos INTEGER;
  tareas_sin_recursos INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tareas FROM tareas WHERE is_active = true;

  SELECT COUNT(DISTINCT tarea_id) INTO tareas_con_recursos FROM tareas_recursos;

  tareas_sin_recursos := total_tareas - tareas_con_recursos;

  RAISE NOTICE 'Pre-seeding stats:';
  RAISE NOTICE '  Total tareas: %', total_tareas;
  RAISE NOTICE '  With recursos: %', tareas_con_recursos;
  RAISE NOTICE '  Without recursos: %', tareas_sin_recursos;
  RAISE NOTICE '  Coverage: %.1f%%', (tareas_con_recursos::NUMERIC / total_tareas * 100);
END $$;

-- Step 2: Insert default resources
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

-- Step 3: Verify coverage after seeding
DO $$
DECLARE
  total_tareas INTEGER;
  tareas_con_recursos INTEGER;
  coverage_pct NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_tareas FROM tareas WHERE is_active = true;
  SELECT COUNT(DISTINCT tarea_id) INTO tareas_con_recursos FROM tareas_recursos;
  coverage_pct := (tareas_con_recursos::NUMERIC / total_tareas * 100);

  RAISE NOTICE 'Post-seeding stats:';
  RAISE NOTICE '  Total tareas: %', total_tareas;
  RAISE NOTICE '  With recursos: %', tareas_con_recursos;
  RAISE NOTICE '  Coverage: %.1f%%', coverage_pct;

  IF coverage_pct >= 95 THEN
    RAISE NOTICE '✅ GOAL ACHIEVED: Coverage >= 95%%';
  ELSE
    RAISE WARNING '⚠️  Coverage < 95%%: %.1f%%', coverage_pct;
  END IF;
END $$;
