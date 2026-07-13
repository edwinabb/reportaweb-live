-- Create view for Valoración Ventas Table
-- Columns: 
-- Informe, Fecha, Dia, Cliente, Lugar, Descripción, Maquinaria, Cotización, 
-- Hrs Recc, Jornada, Hrs Trab, Hrs Min, Cant Fact, Moneda, Precio Unit, Total, 
-- Valoración, Factura, Estado
DROP VIEW IF EXISTS view_valoraciones_ventas;
CREATE VIEW view_valoraciones_ventas AS
SELECT r.id AS id,
    r.tenant_id,
    -- Informe: Use codigo_documento_interno (user schema) or fallback to ID substring
    COALESCE(r.codigo_documento_interno, LEFT(r.id::text, 8)) AS informe,
    -- Fecha
    r.fecha_reporte AS fecha,
    -- Dia (Spanish Day Name)
    CASE
        TRIM(TO_CHAR(r.fecha_reporte, 'Day'))
        WHEN 'Monday' THEN 'Lunes'
        WHEN 'Tuesday' THEN 'Martes'
        WHEN 'Wednesday' THEN 'Miércoles'
        WHEN 'Thursday' THEN 'Jueves'
        WHEN 'Friday' THEN 'Viernes'
        WHEN 'Saturday' THEN 'Sábado'
        WHEN 'Sunday' THEN 'Domingo'
        ELSE TO_CHAR(r.fecha_reporte, 'Day')
    END AS dia,
    -- Cliente (Nombre Comercial or Razon Social)
    COALESCE(
        c.nombre_comercial,
        c.razon_social,
        'Sin Cliente'
    ) AS cliente,
    t.cliente_id,
    -- Keep ID for filtering
    -- Lugar
    COALESCE(t.sitio, 'N/A') AS lugar,
    -- Descripción: Use trabajo_realizado per schema, fallback to other desc fields
    COALESCE(
        r.trabajo_realizado,
        qt.descripcion_requerimiento,
        m.modelo,
        'Alquiler Maquinaria'
    ) AS descripcion,
    -- Maquinaria: Categoria + Modelo + Placa
    TRIM(CONCAT_WS(' ', m.categoria, m.modelo, m.placa)) AS maquinaria,
    -- Cotización
    COALESCE(qt.numero, 'N/A') AS cotizacion,
    -- Hrs Recc (User: Falta campo. Setting to 0 numeric placeholder)
    0::numeric AS hrs_recc,
    -- Jornada (Combined Jornada 1 and 2)
    TRIM(
        CONCAT_WS(
            ' / ',
            CASE
                WHEN r.jornada1_inicio IS NOT NULL THEN TO_CHAR(r.jornada1_inicio, 'HH24:MI') || ' - ' || TO_CHAR(r.jornada1_fin, 'HH24:MI')
            END,
            CASE
                WHEN r.jornada2_inicio IS NOT NULL THEN TO_CHAR(r.jornada2_inicio, 'HH24:MI') || ' - ' || TO_CHAR(r.jornada2_fin, 'HH24:MI')
            END
        )
    ) AS jornada,
    -- Hrs Trab (Campo especifico: horas_trabajadas instead of total_horas)
    COALESCE(r.horas_trabajadas, 0) AS hrs_trab,
    -- Hrs Min (From Cotizacion Detail)
    COALESCE(det.cantidad, 0) AS hrs_min,
    -- Cant Fact (Greatest of Trab vs Min)
    GREATEST(
        COALESCE(r.horas_trabajadas, 0),
        COALESCE(det.cantidad, 0)
    ) AS cant_fact,
    -- Moneda
    COALESCE(qt.moneda, 'USD') AS moneda,
    -- Precio Unit
    COALESCE(det.precio_valor, 0) AS precio_unit,
    -- Total
    (
        GREATEST(
            COALESCE(r.horas_trabajadas, 0),
            COALESCE(det.cantidad, 0)
        ) * COALESCE(det.precio_valor, 0)
    ) AS total,
    -- Valoración
    r.valorizacion_venta AS valoracion,
    -- Factura
    r.factura_venta_item AS factura,
    -- Estado
    CASE
        WHEN r.factura_venta_item IS NOT NULL THEN 'FACTURADO'
        WHEN r.valorizacion_venta IS NOT NULL THEN 'VALORADO'
        ELSE 'PENDIENTE'
    END AS estado,
    -- Extra IDs for joins/actions
    r.id AS reporte_id,
    t.id AS tarea_id,
    m.id AS maquinaria_id
FROM reportes_maquinaria r
    LEFT JOIN tareas t ON r.tarea_id = t.id
    LEFT JOIN terceros c ON t.cliente_id = c.id
    LEFT JOIN maquinarias m ON r.maquinaria_id = m.id
    LEFT JOIN cotizaciones qt ON t.cotizacion_id = qt.id -- Improved Join with LATERAL to handle fallback logic cleanly
    LEFT JOIN LATERAL (
        SELECT d.cantidad,
            d.precio_valor,
            d.id
        FROM cotizaciones_detalle d
        WHERE (
                t.cotizacion_item_id IS NOT NULL
                AND d.id = t.cotizacion_item_id
            )
            OR (
                t.cotizacion_item_id IS NULL
                AND d.cotizacion_id = qt.id
            )
        ORDER BY d.id ASC
        LIMIT 1
    ) det ON TRUE;