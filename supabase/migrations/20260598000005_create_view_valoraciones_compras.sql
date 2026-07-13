-- Create view for detailed Purchase Valuations (Valoraciones de Compras)
-- Analogous to view_valoraciones_ventas but for purchases from third-party providers
-- Columns: Informe, Fecha, Dia, Proveedor, Cliente, Lugar, Descripción, Maquinaria, Cotización,
-- Hrs Recorrido, Jornada, Hrs Trab, Hrs Min, Cant Fact, Moneda, Precio Unit, Total,
-- Valoración, Factura, Estado
DROP VIEW IF EXISTS view_valoraciones_compras;
CREATE VIEW view_valoraciones_compras AS
SELECT r.id AS id,
    r.tenant_id,
    -- Informe: Use codigo_documento_interno (user schema) or fallback to ID substring
    COALESCE(
        r.codigo_documento_interno,
        LEFT(r.id::text, 8)
    ) AS informe,
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
    -- Proveedor (Provider - the machinery owner for purchases)
    COALESCE(
        prov.nombre_comercial,
        prov.razon_social,
        m_prov.nombre_comercial,
        m_prov.razon_social,
        'Sin Proveedor'
    ) AS proveedor,
    COALESCE(r.proveedor_id, m.proveedor_id) AS proveedor_id,
    -- Cliente (from task)
    COALESCE(
        c.nombre_comercial,
        c.razon_social,
        'Sin Cliente'
    ) AS cliente,
    t.cliente_id,
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
    -- Hrs Recorrido (Travel hours)
    COALESCE(r.horas_recorrido, 0) AS hrs_recc,
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
    -- Hrs Trab (Billable hours or total hours)
    COALESCE(r.horas_facturar, r.total_horas, 0) AS hrs_trab,
    -- Hrs Min (From Cotizacion Detail)
    COALESCE(det.cantidad, 0) AS hrs_min,
    -- Cant Fact (Greatest of Trab vs Min)
    GREATEST(
        COALESCE(r.horas_facturar, r.total_horas, 0),
        COALESCE(det.cantidad, 0)
    ) AS cant_fact,
    -- Moneda
    COALESCE(qt.moneda, 'USD') AS moneda,
    -- Precio Unit (Purchase price - precio_valor from quotation)
    COALESCE(det.precio_valor, 0) AS precio_unit,
    -- Total (Purchase amount)
    (
        GREATEST(
            COALESCE(r.horas_facturar, r.total_horas, 0),
            COALESCE(det.cantidad, 0)
        ) * COALESCE(det.precio_valor, 0)
    ) AS total,
    -- Valoración (Purchase valuation reference)
    r.valorizacion_compra AS valoracion,
    -- Factura (Purchase invoice reference)
    r.factura_compra_item AS factura,
    -- Estado (Status based on purchase valuation and invoice)
    CASE
        WHEN r.factura_compra_item IS NOT NULL THEN 'FACTURADO'
        WHEN r.valorizacion_compra IS NOT NULL THEN 'VALORADO'
        ELSE 'PENDIENTE'
    END AS estado,
    -- Extra IDs for joins/actions
    r.id AS reporte_id,
    t.id AS tarea_id,
    m.id AS maquinaria_id
FROM reportes_maquinaria r -- Join maquinarias to check if it's from a third party
    INNER JOIN maquinarias m ON r.maquinaria_id = m.id -- CRITICAL FILTER: Only include third-party machinery
    AND m.propietario = 'tercero' -- Provider from report
    LEFT JOIN terceros prov ON r.proveedor_id = prov.id -- Provider from machinery (fallback)
    LEFT JOIN terceros m_prov ON m.proveedor_id = m_prov.id -- Task and Client
    LEFT JOIN tareas t ON r.tarea_id = t.id
    LEFT JOIN terceros c ON t.cliente_id = c.id -- Quotation (purchase quotation if exists)
    LEFT JOIN cotizaciones qt ON t.cotizacion_id = qt.id -- Quotation Detail with LATERAL for fallback logic
    LEFT JOIN LATERAL (
        SELECT d.cantidad,
            d.precio_valor,
            d.id
        FROM cotizaciones_detalle d
        WHERE (
                r.cotizacion_compra_item_id IS NOT NULL
                AND d.id = r.cotizacion_compra_item_id
            )
            OR (
                r.cotizacion_compra_item_id IS NULL
                AND t.cotizacion_item_id IS NOT NULL
                AND d.id = t.cotizacion_item_id
            )
            OR (
                r.cotizacion_compra_item_id IS NULL
                AND t.cotizacion_item_id IS NULL
                AND d.cotizacion_id = qt.id
            )
        ORDER BY d.id ASC
        LIMIT 1
    ) det ON TRUE;
-- Grant permissions
GRANT SELECT ON public.view_valoraciones_compras TO authenticated;
GRANT SELECT ON public.view_valoraciones_compras TO service_role;
-- Comment
COMMENT ON VIEW view_valoraciones_compras IS 'Vista detallada de valoraciones de compras para maquinaria de terceros. Incluye información completa del reporte, proveedor, cliente, horas trabajadas, precios y estado de valorización/facturación.';