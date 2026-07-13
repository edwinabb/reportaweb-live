-- mv_planificacion_diaria_v3
-- Extiende la MV con campos denormalizados para eliminar joins en runtime:
--   - cliente_nombre  : terceros.razon_social (via cliente_id)
--   - cotizacion_cod  : cotizaciones.numero/anio (via cotizacion_id)
--   - sitio           : terceros_sitios.nombre   (via sitio_id) con fallback a tareas.sitio
--   - hora_inicio     : tareas.hora_inicio
--   - hora_fin        : tareas.hora_fin
--   - autor_nombre    : profiles.first_name       (via created_by)
--   - personal_nombres: text[] de first_name de cada personal asignado al intervalo

DROP MATERIALIZED VIEW IF EXISTS mv_planificacion_diaria;

CREATE MATERIALIZED VIEW mv_planificacion_diaria AS
WITH mes_inicio AS (
    SELECT date_trunc('month', CURRENT_DATE::timestamptz)::date AS v
),
mes_fin AS (
    SELECT (date_trunc('month', CURRENT_DATE::timestamptz)
            + interval '1 month' + interval '6 days')::date AS v
),
fechas_expandidas AS (
    SELECT
        tf.id              AS tarea_fecha_id,
        tf.tarea_id,
        tf.tenant_id,
        tf.fecha_inicio,
        tf.fecha_fin,
        tf.fechas_multiples,
        tf.notas,
        d.fecha
    FROM tareas_fechas tf
    CROSS JOIN mes_inicio
    CROSS JOIN mes_fin,
    LATERAL (
        SELECT unnest(
            CASE
                WHEN tf.fechas_multiples IS NOT NULL THEN tf.fechas_multiples
                ELSE ARRAY(
                    SELECT generate_series(
                        GREATEST(tf.fecha_inicio, mes_inicio.v)::timestamp without time zone,
                        LEAST(tf.fecha_fin,   mes_fin.v)::timestamp without time zone,
                        '1 day'
                    )::date
                )
            END
        ) AS fecha
    ) d
    WHERE tf.is_active = true
      AND d.fecha >= mes_inicio.v
      AND d.fecha <= mes_fin.v
),
recursos_por_intervalo AS (
    SELECT
        fe.tarea_fecha_id,
        fe.tarea_id,
        fe.tenant_id,
        fe.fecha,
        fe.fecha_inicio,
        fe.fecha_fin,
        fe.fechas_multiples,
        fe.notas,
        array_agg(DISTINCT tr.personal_id)
            FILTER (WHERE tr.personal_id   IS NOT NULL) AS personal_ids,
        array_agg(DISTINCT tr.maquinaria_id)
            FILTER (WHERE tr.maquinaria_id IS NOT NULL) AS maquinaria_ids,
        count(DISTINCT tr.personal_id)
            FILTER (WHERE tr.tipo_recurso = 'PERSONAL')   AS personal_count,
        count(DISTINCT tr.maquinaria_id)
            FILTER (WHERE tr.tipo_recurso = 'MAQUINARIA') AS maquinaria_count,
        -- Primer nombre de cada personal asignado (NULLs excluidos)
        array_remove(
            array_agg(DISTINCT p.first_name),
            NULL
        ) AS personal_nombres
    FROM fechas_expandidas fe
    LEFT JOIN tareas_recursos tr
           ON tr.tarea_fecha_id = fe.tarea_fecha_id AND tr.is_active = true
    LEFT JOIN profiles p
           ON p.id = tr.personal_id AND tr.tipo_recurso = 'PERSONAL'
    GROUP BY fe.tarea_fecha_id, fe.tarea_id, fe.tenant_id, fe.fecha,
             fe.fecha_inicio, fe.fecha_fin, fe.fechas_multiples, fe.notas
)
SELECT
    ri.tenant_id,
    ri.fecha,
    ri.tarea_fecha_id,
    ri.tarea_id,
    ri.fecha_inicio,
    ri.fecha_fin,
    ri.fechas_multiples,
    ri.notas,
    t.codigo,
    t.titulo,
    t.estado,
    t.prioridad,
    t.hora_inicio,
    t.hora_fin,
    t.created_at                                            AS tarea_created_at,
    -- Cliente: FK sobre terceros, fallback a campo denormalizado
    COALESCE(ter.razon_social, t.cliente_nombre)            AS cliente_nombre,
    -- Cotización: número/año concatenado, fallback a cotizacion_ref libre
    CASE
        WHEN cot.numero IS NOT NULL AND cot.anio IS NOT NULL
            THEN cot.numero::text || '/' || cot.anio::text
        WHEN cot.numero IS NOT NULL
            THEN cot.numero::text
        ELSE t.cotizacion_ref
    END                                                     AS cotizacion_cod,
    -- Sitio: FK sobre terceros_sitios, fallback a texto libre
    COALESCE(ts.nombre, t.sitio)                            AS sitio,
    -- Autor: first_name del creador de la tarea
    autor.first_name                                        AS autor_nombre,
    ri.personal_ids,
    ri.maquinaria_ids,
    ri.personal_count::integer  AS personal_count,
    ri.maquinaria_count::integer AS maquinaria_count,
    ri.personal_nombres,
    array_agg(DISTINCT rp.id)
        FILTER (WHERE rp.id  IS NOT NULL)                   AS reporte_personal_ids,
    array_agg(DISTINCT rm.id)
        FILTER (WHERE rm.id  IS NOT NULL)                   AS reporte_maquinaria_ids,
    array_agg(DISTINCT rc.id)
        FILTER (WHERE rc.id  IS NOT NULL)                   AS reporte_combustible_ids,
    array_agg(DISTINCT ins.id)
        FILTER (WHERE ins.id IS NOT NULL)                   AS inspeccion_ids
FROM recursos_por_intervalo ri
JOIN  tareas            t    ON t.id   = ri.tarea_id  AND t.is_active = true
LEFT JOIN terceros      ter  ON ter.id = t.cliente_id
LEFT JOIN cotizaciones  cot  ON cot.id = t.cotizacion_id
LEFT JOIN terceros_sitios ts ON ts.id  = t.sitio_id
LEFT JOIN profiles      autor ON autor.id = t.created_by
LEFT JOIN reportes_personal   rp  ON rp.tarea_id  = ri.tarea_id
                                  AND rp.fecha_reporte       = ri.fecha
                                  AND rp.is_active  = true
LEFT JOIN reportes_maquinaria rm  ON rm.tarea_id  = ri.tarea_id
                                  AND rm.fecha_reporte       = ri.fecha
                                  AND rm.is_active  = true
LEFT JOIN reportes_combustible rc ON rc.tarea_id  = ri.tarea_id
                                  AND rc.fecha_reporte       = ri.fecha
                                  AND rc.is_active  = true
LEFT JOIN inspecciones        ins ON ins.tarea_id = ri.tarea_id
                                  AND ins.fecha_inspeccion::date = ri.fecha
                                  AND ins.is_active = true
GROUP BY
    ri.tarea_fecha_id, ri.tarea_id, ri.tenant_id, ri.fecha,
    ri.fecha_inicio, ri.fecha_fin, ri.fechas_multiples, ri.notas,
    t.codigo, t.titulo, t.estado, t.prioridad, t.hora_inicio, t.hora_fin, t.created_at,
    ter.razon_social, t.cliente_nombre,
    cot.numero, cot.anio, t.cotizacion_ref,
    ts.nombre, t.sitio,
    autor.first_name,
    ri.personal_ids, ri.maquinaria_ids, ri.personal_count, ri.maquinaria_count,
    ri.personal_nombres;

-- Índice único requerido para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_planif_pk
    ON mv_planificacion_diaria (tenant_id, fecha, tarea_fecha_id);

-- Índices de búsqueda
CREATE INDEX idx_mv_planif_tarea
    ON mv_planificacion_diaria (tarea_id, fecha);

-- Poblar la vista
REFRESH MATERIALIZED VIEW mv_planificacion_diaria;
