-- Create ventas panel aggregation views
--
-- Context: [lib/actions/ventas.ts:56,84] reads from `view_ventas_pendiente_valorizar`
-- and `view_ventas_pendientes_facturar`, and an earlier migration
-- (20260201060000_grant_panel_views.sql) granted privileges on them — but the
-- views themselves were never created. `getPanelVentasData()` was silently
-- returning emptyData on every call.
--
-- These are the ventas (sales) mirror of view_compras_pendiente_valorizar and
-- view_compras_pendientes_facturar, flipped on:
--   - maquinarias.propietario = 'propio' (owned, not rented from third party)
--   - valorizacion_venta / factura_venta_item (sales-side status)
--   - aggregated by cliente (tareas.cliente_id → terceros) instead of proveedor

-- === 1. Pending valuation (not valorized, not invoiced) ===
DROP VIEW IF EXISTS view_ventas_pendiente_valorizar;
CREATE VIEW view_ventas_pendiente_valorizar AS
SELECT
    r.tenant_id,
    t.cliente_id,
    COALESCE(
        c.nombre_comercial,
        c.razon_social,
        'Sin Cliente'
    ) AS cliente_nombre,
    COUNT(*) AS cantidad,
    MIN(r.fecha_reporte) AS fecha_antiguo,
    SUM(COALESCE(r.horas_facturar, r.total_horas, 0)) AS horas_totales
FROM reportes_maquinaria r
    INNER JOIN maquinarias m ON r.maquinaria_id = m.id
        AND m.propietario = 'propio'
    LEFT JOIN tareas t ON r.tarea_id = t.id
    LEFT JOIN terceros c ON t.cliente_id = c.id
WHERE r.valorizacion_venta IS NULL
    AND r.factura_venta_item IS NULL
    AND t.cliente_id IS NOT NULL
GROUP BY
    r.tenant_id,
    t.cliente_id,
    COALESCE(c.nombre_comercial, c.razon_social, 'Sin Cliente');

-- === 2. Pending invoicing (valorized but not invoiced) ===
DROP VIEW IF EXISTS view_ventas_pendientes_facturar;
CREATE VIEW view_ventas_pendientes_facturar AS
SELECT
    r.tenant_id,
    COALESCE(
        c.nombre_comercial,
        c.razon_social,
        'Sin Cliente'
    ) AS cliente,
    t.cliente_id,
    COUNT(*) AS valoraciones,
    MIN(r.fecha_reporte) AS fecha_valoracion_mas_antigua,
    SUM(
        GREATEST(
            COALESCE(r.horas_trabajadas, 0),
            COALESCE(det.cantidad, 0)
        ) * COALESCE(det.precio_valor, 0)
    ) AS monto_pendiente
FROM reportes_maquinaria r
    INNER JOIN maquinarias m ON r.maquinaria_id = m.id
        AND m.propietario = 'propio'
    LEFT JOIN tareas t ON r.tarea_id = t.id
    LEFT JOIN terceros c ON t.cliente_id = c.id
    LEFT JOIN cotizaciones qt ON t.cotizacion_id = qt.id
    LEFT JOIN LATERAL (
        SELECT d.cantidad, d.precio_valor, d.id
        FROM cotizaciones_detalle d
        WHERE (
                r.cotizacion_venta_item_id IS NOT NULL
                AND d.id = r.cotizacion_venta_item_id
            )
            OR (
                r.cotizacion_venta_item_id IS NULL
                AND t.cotizacion_item_id IS NOT NULL
                AND d.id = t.cotizacion_item_id
            )
            OR (
                r.cotizacion_venta_item_id IS NULL
                AND t.cotizacion_item_id IS NULL
                AND d.cotizacion_id = qt.id
            )
        ORDER BY d.id ASC
        LIMIT 1
    ) det ON TRUE
WHERE r.valorizacion_venta IS NOT NULL
    AND r.factura_venta_item IS NULL
    AND t.cliente_id IS NOT NULL
GROUP BY
    r.tenant_id,
    t.cliente_id,
    COALESCE(c.nombre_comercial, c.razon_social, 'Sin Cliente');

-- === Grants ===
GRANT SELECT ON public.view_ventas_pendiente_valorizar TO authenticated;
GRANT SELECT ON public.view_ventas_pendiente_valorizar TO service_role;
GRANT SELECT ON public.view_ventas_pendientes_facturar TO authenticated;
GRANT SELECT ON public.view_ventas_pendientes_facturar TO service_role;

COMMENT ON VIEW view_ventas_pendiente_valorizar IS 'Ventas pendientes de valorizar agrupadas por cliente. Filtra maquinaria propia y reportes sin valorización ni factura de venta.';
COMMENT ON VIEW view_ventas_pendientes_facturar IS 'Ventas valorizadas pendientes de facturar agrupadas por cliente. Filtra maquinaria propia, valorizacion_venta NOT NULL y factura_venta_item NULL.';
