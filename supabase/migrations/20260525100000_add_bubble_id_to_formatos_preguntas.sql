-- Add bubble_id to formatos_preguntas for linking Bubble informe_respuesta records
-- to Supabase formatos_preguntas during informes migration.
ALTER TABLE formatos_preguntas ADD COLUMN IF NOT EXISTS bubble_id TEXT;
CREATE INDEX IF NOT EXISTS idx_formatos_preguntas_bubble_id ON formatos_preguntas(bubble_id);
