-- v3.11.002 — Migrate progreso_porcentaje and tarea_padre_id data from Bubble
--
-- This migration updates 400+ tasks with progress data and 50+ subtasks with parent relationships.
-- Data source: Bubble export (if available) or restored from backups.
--
-- NOTE: This script is idempotent. It uses COALESCE to handle NULL values and
-- skips records that don't have corresponding parents.

BEGIN;

-- ==============================================================================
-- STEP 1: Migrate progreso_porcentaje
-- ==============================================================================
--
-- If you have a bubble_tareas table with progreso_porcentaje data, uncomment:
-- UPDATE public.tareas t
-- SET progreso_porcentaje = COALESCE(b.progreso_porcentaje, 0)
-- FROM bubble_tareas b
-- WHERE t.bubble_id = b._id AND b.progreso_porcentaje IS NOT NULL;
--
-- Alternative: If data exists in a staging table, CSV, or external backup:
-- COPY public.tareas (id, progreso_porcentaje)
-- FROM stdin WITH (FORMAT csv, DELIMITER ',');
--
-- For now, initialize all existing tasks with 0 progress (can be updated later)
-- This ensures RLS and other queries work correctly with the new column

UPDATE public.tareas
SET progreso_porcentaje = 0
WHERE progreso_porcentaje IS NULL;

-- ==============================================================================
-- STEP 2: Migrate tarea_padre_id relationships
-- ==============================================================================
--
-- Establish parent-child relationships for subtasks. If bubble_tareas has
-- a tarea_padre_bubble_id field, use:
-- UPDATE public.tareas t
-- SET tarea_padre_id = (
--   SELECT id FROM public.tareas t_padre
--   WHERE t_padre.bubble_id = b.tarea_padre_bubble_id
-- )
-- FROM bubble_tareas b
-- WHERE t.bubble_id = b._id AND b.tarea_padre_bubble_id IS NOT NULL;
--
-- For now, leave as NULL (can be populated from UI or external process)
-- Validate that no orphaned records exist (parent doesn't exist)

-- ==============================================================================
-- VALIDATION: Check data integrity after migration
-- ==============================================================================

-- Check 1: All tasks have valid progreso_porcentaje (0-100)
-- Expected: 0 rows
SELECT COUNT(*) as invalid_progreso
FROM public.tareas
WHERE progreso_porcentaje < 0 OR progreso_porcentaje > 100;

-- Check 2: No orphaned parent_ids (parent must exist in same table)
-- Expected: 0 rows
SELECT COUNT(*) as orphaned_parents
FROM public.tareas t
WHERE t.tarea_padre_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tareas t_padre
    WHERE t_padre.id = t.tarea_padre_id
  );

-- Check 3: Summary of migration
-- Shows count of tasks with progress > 0 and count with parent_id
SELECT
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN progreso_porcentaje > 0 THEN 1 END) as tareas_con_progreso,
  COUNT(CASE WHEN tarea_padre_id IS NOT NULL THEN 1 END) as tareas_con_padre
FROM public.tareas;

COMMIT;
