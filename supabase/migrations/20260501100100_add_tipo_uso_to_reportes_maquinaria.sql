-- A.2: Soporte para tipo de uso y horas de alquiler en reportes_maquinaria
-- tipo_uso distingue operacion propia vs alquiler externo vs espera
-- horas_alquiler = horas facturables al proveedor (puede diferir de total_horas por mínimo facturable)

ALTER TABLE reportes_maquinaria
  ADD COLUMN IF NOT EXISTS tipo_uso TEXT DEFAULT 'OPERACION'
    CHECK (tipo_uso IN ('OPERACION', 'ALQUILER', 'ESPERA')),
  ADD COLUMN IF NOT EXISTS horas_alquiler NUMERIC;

-- Marcar registros existentes como OPERACION
UPDATE reportes_maquinaria
  SET tipo_uso = 'OPERACION'
  WHERE tipo_uso IS NULL;
