-- Add pricing columns to cotizaciones_detalle referencing Bubble structure EXACTLY (1:1 mapping)
-- Fields: precio1_monto, minimo1, precio2_monto, minimo2, precio3_monto, minimo3.
-- Also: subtotal (calculated), descripcion, updated_at.
ALTER TABLE public.cotizaciones_detalle
ADD COLUMN IF NOT EXISTS precio1_monto DECIMAL(12, 2) DEFAULT 0 CHECK (precio1_monto >= 0),
    ADD COLUMN IF NOT EXISTS minimo1 DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS precio2_monto DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS minimo2 DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS precio3_monto DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS minimo3 DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Index for primary price
CREATE INDEX IF NOT EXISTS idx_cotizaciones_detalle_precio1 ON public.cotizaciones_detalle(precio1_monto);
-- Drop old attempted columns if they exist to avoid confusion
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cotizaciones_detalle'
        AND column_name = 'precio1'
) THEN
ALTER TABLE public.cotizaciones_detalle DROP COLUMN precio1;
END IF;
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cotizaciones_detalle'
        AND column_name = 'minimo_horas'
) THEN
ALTER TABLE public.cotizaciones_detalle DROP COLUMN minimo_horas;
END IF;
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cotizaciones_detalle'
        AND column_name = 'precio2'
) THEN
ALTER TABLE public.cotizaciones_detalle DROP COLUMN precio2;
END IF;
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cotizaciones_detalle'
        AND column_name = 'minimo_horas2'
) THEN
ALTER TABLE public.cotizaciones_detalle DROP COLUMN minimo_horas2;
END IF;
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cotizaciones_detalle'
        AND column_name = 'precio3'
) THEN
ALTER TABLE public.cotizaciones_detalle DROP COLUMN precio3;
END IF;
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cotizaciones_detalle'
        AND column_name = 'minimo_horas3'
) THEN
ALTER TABLE public.cotizaciones_detalle DROP COLUMN minimo_horas3;
END IF;
END $$;