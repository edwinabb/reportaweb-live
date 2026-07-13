-- Add pdf URLs to view_valoraciones_ventas:
--   pdf_cotizacion_url → cotizaciones.pdf_url
--   pdf_valoracion_url → facturas_venta.pdf_valorizacion (via valorizacion_venta = bubble_id)
--   pdf_factura_url    → facturas_venta.pdf_factura_url  (same record)
DROP VIEW IF EXISTS view_valoraciones_ventas;
CREATE VIEW view_valoraciones_ventas AS
SELECT r.id AS id,
    r.tenant_id,
    COALESCE(r.codigo_documento_interno, LEFT(r.id::text, 8)) AS informe,
    r.fecha_reporte AS fecha,
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
    COALESCE(c.nombre_comercial, c.razon_social, 'Sin Cliente') AS cliente,
    t.cliente_id,
    COALESCE(t.sitio, 'N/A') AS lugar,
    COALESCE(r.trabajo_realizado, qt.descripcion_requerimiento, m.modelo, 'Alquiler Maquinaria') AS descripcion,
    TRIM(CONCAT_WS(' ', m.categoria, m.modelo, m.placa)) AS maquinaria,
    COALESCE(qt.numero, 'N/A') AS cotizacion,
    0::numeric AS hrs_recc,
    TRIM(
        CONCAT_WS(
            ' / ',
            CASE WHEN r.jornada1_inicio IS NOT NULL THEN TO_CHAR(r.jornada1_inicio, 'HH24:MI') || ' - ' || TO_CHAR(r.jornada1_fin, 'HH24:MI') END,
            CASE WHEN r.jornada2_inicio IS NOT NULL THEN TO_CHAR(r.jornada2_inicio, 'HH24:MI') || ' - ' || TO_CHAR(r.jornada2_fin, 'HH24:MI') END
        )
    ) AS jornada,
    COALESCE(r.horas_trabajadas, 0) AS hrs_trab,
    COALESCE(det.cantidad, 0) AS hrs_min,
    GREATEST(COALESCE(r.horas_trabajadas, 0), COALESCE(det.cantidad, 0)) AS cant_fact,
    COALESCE(qt.moneda, 'USD') AS moneda,
    COALESCE(det.precio_valor, 0) AS precio_unit,
    (GREATEST(COALESCE(r.horas_trabajadas, 0), COALESCE(det.cantidad, 0)) * COALESCE(det.precio_valor, 0)) AS total,
    r.valorizacion_venta AS valoracion,
    r.factura_venta_item AS factura,
    CASE
        WHEN r.factura_venta_item IS NOT NULL THEN 'FACTURADO'
        WHEN r.valorizacion_venta IS NOT NULL THEN 'VALORADO'
        ELSE 'PENDIENTE'
    END AS estado,
    r.id AS reporte_id,
    t.id AS tarea_id,
    m.id AS maquinaria_id,
    qt.id AS cotizacion_id,
    qt.pdf_url AS pdf_cotizacion_url,
    fv.id AS valoracion_fv_id,
    fv.pdf_valorizacion AS pdf_valoracion_url,
    fv.pdf_factura_url
FROM reportes_maquinaria r
    LEFT JOIN tareas t ON r.tarea_id = t.id
    LEFT JOIN terceros c ON t.cliente_id = c.id
    LEFT JOIN maquinarias m ON r.maquinaria_id = m.id
    LEFT JOIN cotizaciones qt ON t.cotizacion_id = qt.id
    LEFT JOIN facturas_venta fv ON fv.bubble_id = r.valorizacion_venta
    LEFT JOIN LATERAL (
        SELECT d.cantidad, d.precio_valor, d.id
        FROM cotizaciones_detalle d
        WHERE (t.cotizacion_item_id IS NOT NULL AND d.id = t.cotizacion_item_id)
            OR (t.cotizacion_item_id IS NULL AND d.cotizacion_id = qt.id)
        ORDER BY d.id ASC
        LIMIT 1
    ) det ON TRUE;

GRANT SELECT ON public.view_valoraciones_ventas TO authenticated, service_role;
