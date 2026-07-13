-- Add 'moneda' to factura_venta_pagos (Text column for 'PEN'/'USD')
ALTER TABLE IF EXISTS factura_venta_pagos
ADD COLUMN IF NOT EXISTS moneda text DEFAULT 'USD';