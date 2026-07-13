-- v3.11.001 — Add progreso_porcentaje and tarea_padre_id to tareas
--
-- Adds two columns to support task progress tracking and subtask hierarchies:
--   tareas.progreso_porcentaje — Progress as percentage (0-100, NUMERIC(5,2))
--   tareas.tarea_padre_id     — Parent task ID for subtasks (UUID FK to tareas.id)
--
-- These columns were present in Bubble but missing in Supabase. They enable:
-- - Dashboard progress visualization
-- - Subtask/epic planning workflows
-- - 400+ existing tasks have progress data in Bubble
-- - 50+ existing tasks are subtasks (have parent_id in Bubble)

BEGIN;

-- Add columns with defaults
ALTER TABLE public.tareas
    ADD COLUMN IF NOT EXISTS progreso_porcentaje NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tarea_padre_id UUID REFERENCES public.tareas(id) ON DELETE SET NULL;

-- Create index for parent-child lookups and RLS queries
CREATE INDEX IF NOT EXISTS idx_tareas_padre ON public.tareas(tarea_padre_id);

-- Add check constraint for valid percentage values
ALTER TABLE public.tareas
    ADD CONSTRAINT tareas_progreso_porcentaje_check CHECK (
        progreso_porcentaje >= 0 AND progreso_porcentaje <= 100
    );

COMMIT;
