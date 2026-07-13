-- Agrega campos para identificar personal externo (contratista) en profiles.
-- personal_externo = TRUE si el usuario pertenece a un tercero/proveedor.
-- tercero_bubble_id: ID del tercero en Bubble (para resolución FK durante migración).
-- tercero_id: FK al tercero en Supabase (resuelto desde tercero_bubble_id).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS personal_externo   BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tercero_bubble_id  TEXT,
  ADD COLUMN IF NOT EXISTS tercero_id         UUID     REFERENCES terceros(id) ON DELETE SET NULL;

-- Índice para queries por tercero (ej: listar personal de un proveedor)
CREATE INDEX IF NOT EXISTS idx_profiles_tercero_id ON profiles(tercero_id) WHERE tercero_id IS NOT NULL;

COMMENT ON COLUMN profiles.personal_externo   IS 'TRUE si el usuario es personal de un tercero (contratista/proveedor)';
COMMENT ON COLUMN profiles.tercero_bubble_id  IS 'Bubble ID del tercero al que pertenece este usuario (usado en migración)';
COMMENT ON COLUMN profiles.tercero_id         IS 'UUID del tercero en Supabase al que pertenece este usuario';
