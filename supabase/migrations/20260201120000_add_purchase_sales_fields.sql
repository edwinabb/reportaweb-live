-- Add missing fields from Bubble's Maquinaria_reporte_horas_new to reportes_maquinaria
-- These fields are required for purchase and sales valuation tracking
ALTER TABLE reportes_maquinaria -- Purchase and Sales Status
ADD COLUMN IF NOT EXISTS estado_compra text,
    ADD COLUMN IF NOT EXISTS estado_venta text,
    -- Provider and Client References
ADD COLUMN IF NOT EXISTS proveedor_id uuid REFERENCES terceros(id),
    ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES terceros(id),
    -- Quotation Item References
ADD COLUMN IF NOT EXISTS cotizacion_compra_item_id uuid,
    ADD COLUMN IF NOT EXISTS cotizacion_venta_item_id uuid,
    -- Additional Hours Tracking
ADD COLUMN IF NOT EXISTS horas_recorrido numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS horas_facturar numeric DEFAULT 0,
    -- Additional Fields from Bubble
ADD COLUMN IF NOT EXISTS pdf_url text,
    ADD COLUMN IF NOT EXISTS firma text,
    ADD COLUMN IF NOT EXISTS aceptacion text,
    ADD COLUMN IF NOT EXISTS aceptado_por text,
    ADD COLUMN IF NOT EXISTS segunda_jornada boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS autor_id uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS editor_id uuid REFERENCES auth.users(id);
-- Add index on provider_id for better performance on purchase queries
CREATE INDEX IF NOT EXISTS idx_reportes_maquinaria_proveedor ON reportes_maquinaria(proveedor_id)
WHERE proveedor_id IS NOT NULL;
-- Add index on cliente_id for better performance on sales queries
CREATE INDEX IF NOT EXISTS idx_reportes_maquinaria_cliente ON reportes_maquinaria(cliente_id)
WHERE cliente_id IS NOT NULL;
-- Add index on estado_compra for filtering purchases
CREATE INDEX IF NOT EXISTS idx_reportes_maquinaria_estado_compra ON reportes_maquinaria(estado_compra)
WHERE estado_compra IS NOT NULL;
-- Add index on estado_venta for filtering sales
CREATE INDEX IF NOT EXISTS idx_reportes_maquinaria_estado_venta ON reportes_maquinaria(estado_venta)
WHERE estado_venta IS NOT NULL;
-- Comments
COMMENT ON COLUMN reportes_maquinaria.estado_compra IS 'Purchase status: P=Pending, V=Valued, F=Invoiced';
COMMENT ON COLUMN reportes_maquinaria.estado_venta IS 'Sales status: P=Pending, V=Valued, F=Invoiced';
COMMENT ON COLUMN reportes_maquinaria.proveedor_id IS 'Provider reference when machinery is from third party';
COMMENT ON COLUMN reportes_maquinaria.cliente_id IS 'Client reference from the task';
COMMENT ON COLUMN reportes_maquinaria.horas_recorrido IS 'Travel hours (to/from site)';
COMMENT ON COLUMN reportes_maquinaria.horas_facturar IS 'Billable hours (may differ from total_horas)';