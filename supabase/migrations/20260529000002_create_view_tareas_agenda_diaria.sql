CREATE OR REPLACE VIEW public.view_tareas_agenda_diaria AS
SELECT
    t.id AS tarea_id,
    t.tenant_id,
    MIN(tf.fecha_inicio) AS fecha_programada,
    MAX(tf.fecha_fin) AS fecha_programada_fin,
    tr.personal_id AS asignado_a
FROM tareas t
JOIN tareas_fechas tf ON tf.tarea_id = t.id AND tf.is_active = TRUE
JOIN tareas_recursos tr ON tr.tarea_fecha_id = tf.id AND tr.tipo_recurso = 'PERSONAL'
WHERE t.is_active = TRUE
GROUP BY t.id, t.tenant_id, tr.personal_id;
