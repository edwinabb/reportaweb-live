-- Drop obsolete `servicios_tipos` table (plural)
--
-- Context: la tabla activa es `servicios_tipo` (singular). `servicios_tipos`
-- quedó como artefacto de una iteración previa, con 0 registros y sin UI que
-- la referenciara. Listada como pendiente de limpieza en TAREAS_PRIORIZADAS.md
-- desde antes del cutover.
--
-- Verificado (2026-04-17):
--   - 0 filas
--   - sin FKs apuntando a ella
--   - sin action files que la consulten (todos usan `servicios_tipo` singular)

DROP TABLE IF EXISTS public.servicios_tipos;
