-- Create simplified view for Purchases Pending Valuation (Compras Pendientes de Valorizar)
-- This view aggregates directly from reportes_maquinaria without depending on a detailed view
-- Filters: Third-party machinery (propietario='tercero') AND pending purchase valuation
DROP VIEW IF EXISTS view_compras_pendiente_valorizar;
CREATE VIEW view_compras_pendiente_valorizar AS
SELECT r.tenant_id,
    -- Provider ID (from report or from machinery)
    COALESCE(r.proveedor_id, m.proveedor_id) AS proveedor_id,
    -- Provider Name
    COALESCE(
        prov.nombre_comercial,
        prov.razon_social,
        m_prov.nombre_comercial,
        m_prov.razon_social,
        'Sin Proveedor'
    ) AS proveedor_nombre,
    -- Count of pending reports
    COUNT(*) AS cantidad,
    -- Oldest report date
    MIN(r.fecha_reporte) AS fecha_antiguo,
    -- Total worked hours
    SUM(COALESCE(r.horas_facturar, r.total_horas, 0)) AS horas_totales
FROM reportes_maquinaria r -- Join machinery to check ownership
    INNER JOIN maquinarias m ON r.maquinaria_id = m.id -- CRITICAL FILTER: Only third-party machinery
    AND m.propietario = 'tercero' -- Provider from report
    LEFT JOIN terceros prov ON r.proveedor_id = prov.id -- Provider from machinery (fallback)
    LEFT JOIN terceros m_prov ON m.proveedor_id = m_prov.id
WHERE -- PENDING status: no purchase valuation and no purchase invoice
    r.valorizacion_compra IS NULL
    AND r.factura_compra_item IS NULL -- Optional: Filter by purchase status if field exists and is being used
    -- AND (r.estado_compra IS NULL OR r.estado_compra = 'P')
    -- Ensure provider exists
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
GRANT SELECT ON public.view_compras_pendiente_valorizar TO authenticated;
GRANT SELECT ON public.view_compras_pendiente_valorizar TO service_role;
-- Comment
COMMENT ON VIEW view_compras_pendiente_valorizar IS 'Vista agregada de compras pendientes de valorizar, agrupadas por proveedor. Filtra por maquinaria de terceros (propietario=tercero) y estado pendiente.';