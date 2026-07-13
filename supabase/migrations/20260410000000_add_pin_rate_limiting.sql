-- Agrega columnas de rate limiting para validación de PIN de aprobación de cotizaciones
ALTER TABLE public.cotizaciones
    ADD COLUMN IF NOT EXISTS pin_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

COMMENT ON COLUMN public.cotizaciones.pin_attempts IS 'Contador de intentos fallidos de validación de PIN';
COMMENT ON COLUMN public.cotizaciones.pin_locked_until IS 'Timestamp hasta el cual el PIN está bloqueado por exceso de intentos';
