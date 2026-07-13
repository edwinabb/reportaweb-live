-- Create Finance Tables
-- Based on Bubble Schema Inspection
-- 1. Facturas Compra (includes Valorizaciones Compra)
CREATE TABLE IF NOT EXISTS facturas_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    tenant_id UUID,
    -- To be mapped
    codigo_factura TEXT,
    codigo_valoracion TEXT,
    fecha_factura TIMESTAMPTZ,
    fecha_valorado TIMESTAMPTZ,
    fecha_vencimiento TIMESTAMPTZ,
    estado TEXT,
    -- "PENDIENTE", "PAGADO", etc.
    estado_pago TEXT,
    id_proveedor TEXT,
    -- Bubble ID for provider
    id_empresa TEXT,
    -- Bubble ID for company
    id_moneda TEXT,
    subtotal NUMERIC,
    igv_monto NUMERIC,
    igv_porcentaje NUMERIC,
    total_sol NUMERIC,
    total_usd NUMERIC,
    monto_pagado_soles NUMERIC,
    monto_pagado_usd NUMERIC,
    monto_a_cobrar_soles NUMERIC,
    monto_a_cobrar_usd NUMERIC,
    detraccion_soles NUMERIC,
    detraccion_usd NUMERIC,
    detraccion_porcentaje NUMERIC,
    pdf_factura TEXT,
    pdf_valorizacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);
-- 2. Facturas Compra Items
CREATE TABLE IF NOT EXISTS facturas_compra_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    tenant_id UUID,
    factura_compra_id UUID REFERENCES facturas_compra(id),
    -- To be linked via bubble_id
    id_maquinaria_reporte TEXT,
    -- Link to Reporte Maquinaria (Bubble ID)
    cant_facturar NUMERIC,
    horas_total NUMERIC,
    subtotal NUMERIC,
    estado TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);
-- 3. Facturas Venta (includes Valorizaciones Venta)
CREATE TABLE IF NOT EXISTS facturas_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    tenant_id UUID,
    codigo_valoracion TEXT,
    fecha_valorado TIMESTAMPTZ,
    estado TEXT,
    id_cliente TEXT,
    -- Bubble ID linked to 'companies' or 'clients'
    id_empresa TEXT,
    subtotal NUMERIC,
    igv_monto NUMERIC,
    igv_porcentaje NUMERIC,
    total_usd NUMERIC,
    monto_a_cobrar_soles NUMERIC,
    monto_a_cobrar_usd NUMERIC,
    detraccion_usd NUMERIC,
    detraccion_porcentaje NUMERIC,
    pdf_valorizacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);
-- 4. Facturas Venta Items
CREATE TABLE IF NOT EXISTS facturas_venta_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    tenant_id UUID,
    factura_venta_id UUID REFERENCES facturas_venta(id),
    -- To be linked
    id_maquinaria_reporte TEXT,
    -- Link to Reporte
    id_servicio TEXT,
    -- Link to Service?
    id_maquinaria TEXT,
    cant_facturar NUMERIC,
    horas_total NUMERIC,
    precio_unitario NUMERIC,
    subtotal NUMERIC,
    estado TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_facturas_compra_bubble_id ON facturas_compra(bubble_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_bubble_id ON facturas_venta(bubble_id);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_item_reporte ON facturas_compra_item(id_maquinaria_reporte);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_item_reporte ON facturas_venta_item(id_maquinaria_reporte);