-- Agrega precio negociado por item de cotización (acordado con el cliente post-respuesta)
ALTER TABLE cotizaciones_detalle
    ADD COLUMN IF NOT EXISTS precio_negociado numeric;

-- Agrega referencia a tarea por detalle (una tarea por servicio aprobado)
-- La columna ya puede existir de versiones anteriores
ALTER TABLE cotizaciones_detalle
    ADD COLUMN IF NOT EXISTS tarea_id uuid REFERENCES tareas(id) ON DELETE SET NULL;
