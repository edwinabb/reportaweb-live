-- fecha_solicitud en cotizaciones (campo Fecha Solicitud de Bubble, no migrado originalmente)
ALTER TABLE cotizaciones
    ADD COLUMN IF NOT EXISTS fecha_solicitud TIMESTAMPTZ;

-- is_operario en profiles: si true el usuario aparece en Planificación > Personal
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_operario BOOLEAN NOT NULL DEFAULT FALSE;
