-- Fix missing columns in cotizaciones_detalle
-- Based on migration failures, 'descripcion' is missing.
-- Re-applying core columns definition.
ALTER TABLE public.cotizaciones_detalle
ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2) DEFAULT 0 CHECK (subtotal >= 0),
    ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS unidad_medida TEXT,
    ADD COLUMN IF NOT EXISTS descuento_porcentaje DECIMAL(5, 2) DEFAULT 0;
-- Ensure descripcion is populated (if it was added now, it's null)
-- If we want to enforce NOT NULL later:
-- UPDATE public.cotizaciones_detalle SET descripcion = 'Sin descripción' WHERE descripcion IS NULL;
-- ALTER TABLE public.cotizaciones_detalle ALTER COLUMN descripcion SET NOT NULL;