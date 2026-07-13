-- Final Finance Schema Update (Clean Names)
-- Based on PROCESO_MIGRACION_ARCHIVOS_FINAL.md
DROP TABLE IF EXISTS facturas_compra_pagos;
DROP TABLE IF EXISTS factura_venta_pagos;
DROP TABLE IF EXISTS facturas_compra_item;
DROP TABLE IF EXISTS facturas_venta_item;
DROP TABLE IF EXISTS facturas_compra;
DROP TABLE IF EXISTS facturas_venta;
-- 1. Facturas Compra
CREATE TABLE facturas_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by TEXT,
    editor_id TEXT,
    tenant_id TEXT,
    -- Mapped from static map or DB
    codigo_factura TEXT,
    codigo_valoracion TEXT,
    fecha_factura TIMESTAMPTZ,
    fecha_valorado TIMESTAMPTZ,
    fecha_vencimiento TIMESTAMPTZ,
    estado TEXT,
    estado_pago TEXT,
    factura_paga BOOLEAN,
    proveedor_id TEXT,
    -- Keeping Bubble ID reference
    moneda_id TEXT,
    tasa_cambio_id TEXT,
    subtotal NUMERIC,
    igv_monto NUMERIC,
    igv_porcentaje NUMERIC,
    total_sol NUMERIC,
    total_usd NUMERIC,
    monto_pagado_soles NUMERIC,
    monto_pagado_usd NUMERIC,
    monto_a_cobrar_soles NUMERIC,
    monto_a_cobrar_usd NUMERIC,
    pendiente_por_cobrar_sol NUMERIC,
    pendiente_por_cobrar_usd NUMERIC,
    detraccion_soles NUMERIC,
    detraccion_usd NUMERIC,
    detraccion_porcentaje NUMERIC,
    detraccion_constancia NUMERIC,
    detraccion_fecha_pago TIMESTAMPTZ,
    detraccion_paga_por TEXT,
    detraccion_pago_monto_soles NUMERIC,
    dias_para_pago NUMERIC,
    pdf_factura TEXT,
    pdf_valorizacion TEXT,
    total_cant_facturar NUMERIC,
    total_horas NUMERIC,
    lista_cobros TEXT [],
    lista_items TEXT []
);
-- 2. Facturas Compra Item
CREATE TABLE facturas_compra_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by TEXT,
    editor_id TEXT,
    tenant_id TEXT,
    maquinaria_reporte_id TEXT,
    cant_facturar NUMERIC,
    horas_total NUMERIC,
    subtotal NUMERIC,
    estado TEXT
);
-- 3. Facturas Compra Pagos (Cleaned)
CREATE TABLE facturas_compra_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by TEXT,
    id_editor TEXT,
    tenant_id TEXT,
    factura_compra_id TEXT,
    -- RENAMED from facturas_comprar_id
    moneda_id TEXT,
    banco TEXT,
    comentarios TEXT,
    tipo_pago TEXT,
    fecha_cobro TIMESTAMPTZ,
    monto_sol NUMERIC,
    monto_usd NUMERIC
);
-- 4. Facturas Venta
CREATE TABLE facturas_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by TEXT,
    editor_id TEXT,
    tenant_id TEXT,
    cliente_id TEXT,
    codigo_valoracion TEXT,
    fecha_valorado TIMESTAMPTZ,
    estado TEXT,
    subtotal NUMERIC,
    igv_monto NUMERIC,
    igv_porcentaje NUMERIC,
    total_usd NUMERIC,
    total_cant_facturar NUMERIC,
    total_horas NUMERIC,
    monto_a_cobrar_soles NUMERIC,
    monto_a_cobrar_usd NUMERIC,
    detraccion_usd NUMERIC,
    detraccion_porcentaje NUMERIC,
    pdf_valorizacion TEXT,
    lista_items TEXT []
);
-- 5. Facturas Venta Item
CREATE TABLE facturas_venta_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by TEXT,
    editor_id TEXT,
    tenant_id TEXT,
    maquinaria_reporte_id TEXT,
    maquinaria_id TEXT,
    servicio_id TEXT,
    cant_facturar NUMERIC,
    horas_total NUMERIC,
    precio_unitario NUMERIC,
    subtotal NUMERIC,
    minimo NUMERIC,
    capacidad TEXT,
    estado TEXT
);
-- 6. Factura Venta Pagos (Singular)
CREATE TABLE factura_venta_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by TEXT,
    id_editor TEXT,
    id_empresa TEXT,
    -- Keeping original name as this seems semantic for Venta
    moneda_id TEXT,
    banco TEXT,
    tipo_pago TEXT,
    fecha_cobro TIMESTAMPTZ,
    monto_sol NUMERIC,
    monto_usd NUMERIC
);
CREATE INDEX idx_fc_bubble ON facturas_compra(bubble_id);
CREATE INDEX idx_fci_bubble ON facturas_compra_item(bubble_id);
CREATE INDEX idx_fcp_bubble ON facturas_compra_pagos(bubble_id);
CREATE INDEX idx_fcp_parent ON facturas_compra_pagos(factura_compra_id);
-- Index on renamed Col
CREATE INDEX idx_fv_bubble ON facturas_venta(bubble_id);
CREATE INDEX idx_fvi_bubble ON facturas_venta_item(bubble_id);
CREATE INDEX idx_fvp_bubble ON factura_venta_pagos(bubble_id);