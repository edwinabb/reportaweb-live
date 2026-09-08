-- Limite de intentos del PIN de aprobacion publica (/aprobacion/[token]).
-- Antes: sin limite -- cualquiera con el link podia probar los 9000 PINs
-- posibles (4 digitos) sin restriccion. Decision del usuario 2026-09-08:
-- 3 intentos fallidos -> bloqueo de 15 minutos.

ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS pin_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz NULL;
