-- El flujo de planificación (createTarea / saveTareaBorradorBasic) escribe
-- estado BORRADOR y CONFIRMADA, pero el check original solo permitía los
-- estados legacy de Bubble. Sin esto, crear o guardar tareas desde la web
-- falla con 23514 en TEST y PROD.
ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_estado_check;
ALTER TABLE tareas ADD CONSTRAINT tareas_estado_check
  CHECK (estado = ANY (ARRAY[
    'PENDIENTE'::text,
    'EN_PROCESO'::text,
    'COMPLETADA'::text,
    'CANCELADA'::text,
    'BORRADOR'::text,
    'CONFIRMADA'::text
  ]));
