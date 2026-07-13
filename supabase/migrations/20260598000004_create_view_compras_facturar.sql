-- Create view for Purchases Pending Invoicing (Compras Pendientes de Facturar)
-- Analogous to view_ventas_pendientes_facturar but for purchases from third-party providers
-- Filters: Third-party machinery AND valorized but not invoiced purchases
DROP VIEW IF EXISTS view_compras_pendientes_facturar;
CREATE VIEW view_compras_pendientes_facturar AS
SELECT r.tenant_id,
    -- Provider Name (string, not ID - for consistency with sales view)
    COALESCE(
        prov.nombre_comercial,
        prov.razon_social,
        m_prov.nombre_comercial,
        m_prov.razon_social,
        'Sin Proveedor'
    ) AS proveedor,
    -- Provider ID (added for easier mapping in frontend)
    COALESCE(r.proveedor_id, m.proveedor_id) AS proveedor_id,
    -- Count of valorized purchases (valorizaciones de compra)
    COUNT(*) AS valoraciones,
    -- Oldest valuation date (fecha de la valoración más antigua)
    MIN(r.fecha_reporte) AS fecha_valoracion_mas_antigua,
    -- Pending amount to invoice (monto pendiente)
    -- Calculate: hours * price from quotation detail
    SUM(
        GREATEST(
            COALESCE(r.horas_facturar, r.total_horas, 0),
            COALESCE(det.cantidad, 0)
        ) * COALESCE(det.precio_valor, 0)
    ) AS monto_pendiente
FROM reportes_maquinaria r -- Join machinery to check ownership
    INNER JOIN maquinarias m ON r.maquinaria_id = m.id -- CRITICAL FILTER: Only third-party machinery
    AND m.propietario = 'tercero' -- Provider from report
    LEFT JOIN terceros prov ON r.proveedor_id = prov.id -- Provider from machinery (fallback)
    LEFT JOIN terceros m_prov ON m.proveedor_id = m_prov.id -- Task (to get quotation reference)
    LEFT JOIN tareas t ON r.tarea_id = t.id -- Quotation (for purchase pricing)
    LEFT JOIN cotizaciones qt ON t.cotizacion_id = qt.id -- Quotation Detail with LATERAL for pricing
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
    ) det ON TRUE
WHERE -- FILTER: Valorized but not invoiced
    r.valorizacion_compra IS NOT NULL
    AND r.factura_compra_item IS NULL -- Ensure provider exists
    AND COALESCE(r.proveedor_id, m.proveedor_id) IS NOT NULL
GROUP BY r.tenant_id,
    COALESCE(r.proveedor_id, m.proveedor_id),
    COALESCE(
        prov.nombre_comercial,
        prov.razon_social,
        m_prov.nombre_comercial,
        m_prov.razon_social,
        'Sin Proveedor'
    );
-- Grant permissions
GRANT SELECT ON public.view_compras_pendientes_facturar TO authenticated;
GRANT SELECT ON public.view_compras_pendientes_facturar TO service_role;
-- Comment
COMMENT ON VIEW view_compras_pendientes_facturar IS 'Vista agregada de compras valorizadas pendientes de facturar, agrupadas por proveedor. Filtra por maquinaria de terceros y estado valorizado pero no facturado.';