-- Add missing finance and audit columns to reportes_maquinaria
ALTER TABLE reportes_maquinaria
ADD COLUMN IF NOT EXISTS valorizacion_compra text,
    ADD COLUMN IF NOT EXISTS valorizacion_venta text,
    ADD COLUMN IF NOT EXISTS factura_compra_item text,
    ADD COLUMN IF NOT EXISTS factura_venta_item text,
    ADD COLUMN IF NOT EXISTS updated_by text;
-- Mapping for 'Editor' or 'Modified By' from Bubble