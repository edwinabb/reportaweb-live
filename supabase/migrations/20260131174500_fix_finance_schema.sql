-- Add 'esta_activa' to facturas_compra and facturas_venta
ALTER TABLE IF EXISTS facturas_compra
ADD COLUMN IF NOT EXISTS esta_activa boolean DEFAULT true;
ALTER TABLE IF EXISTS facturas_venta
ADD COLUMN IF NOT EXISTS esta_activa boolean DEFAULT true;
-- Add 'editor_id' to facturas_compra_pagos
ALTER TABLE IF EXISTS facturas_compra_pagos
ADD COLUMN IF NOT EXISTS editor_id uuid REFERENCES auth.users(id);
-- Ensure 'factura_paga' exists in facturas_compra (Report said it had nulls, so it might exist, but safer to check)
ALTER TABLE IF EXISTS facturas_compra
ADD COLUMN IF NOT EXISTS factura_paga boolean DEFAULT false;
-- Ensure 'moneda' (text) exists in factura_venta_pagos (Report said nulls, likely exists)
-- If it was a mapped uuid in script but column is text, we just need to populate it.