-- A.1: Soporte para personal de tercero en reportes_personal
-- personal_id queda nullable (solo se llena para INTERNO)
-- tercero_personal_id se llena para EXTERNO

ALTER TABLE reportes_personal
  ADD COLUMN IF NOT EXISTS tipo_personal TEXT DEFAULT 'INTERNO'
    CHECK (tipo_personal IN ('INTERNO', 'EXTERNO')),
  ADD COLUMN IF NOT EXISTS tercero_personal_id UUID REFERENCES terceros_personal(id);

-- Marcar registros existentes como INTERNO
UPDATE reportes_personal
  SET tipo_personal = 'INTERNO'
  WHERE tipo_personal IS NULL;

-- Hacer personal_id nullable (antes era requerido en la lógica de app, no en DB)
-- No se altera la constraint NOT NULL aquí porque ya es nullable en la definición original
