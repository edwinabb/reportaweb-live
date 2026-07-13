-- Safe Migration to add bubble_id column
-- Run this in the Supabase Dashboard SQL Editor
DO $$ BEGIN -- 1. servicios
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'servicios'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'servicios'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.servicios
ADD COLUMN bubble_id text UNIQUE;
END IF;
ELSE RAISE NOTICE 'Table public.servicios not found. Skipping.';
END IF;
-- 2. servicios_tipos / servicios_tipo
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'servicios_tipos'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'servicios_tipos'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.servicios_tipos
ADD COLUMN bubble_id text UNIQUE;
END IF;
ELSIF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'servicios_tipo'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'servicios_tipo'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.servicios_tipo
ADD COLUMN bubble_id text UNIQUE;
END IF;
ELSE RAISE NOTICE 'Table public.servicios_tipos (or _tipo) not found. Skipping.';
END IF;
-- 3. actividades_matriz
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'actividades_matriz'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'actividades_matriz'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.actividades_matriz
ADD COLUMN bubble_id text UNIQUE;
END IF;
END IF;
-- 4. cotizaciones
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.cotizaciones
ADD COLUMN bubble_id text UNIQUE;
END IF;
END IF;
-- 5. cotizaciones_configuracion
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_configuracion'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_configuracion'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.cotizaciones_configuracion
ADD COLUMN bubble_id text UNIQUE;
END IF;
END IF;
-- 6. cotizaciones_detalle
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_detalle'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_detalle'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.cotizaciones_detalle
ADD COLUMN bubble_id text UNIQUE;
END IF;
END IF;
-- 7. cotizaciones_historial
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_historial'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_historial'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.cotizaciones_historial
ADD COLUMN bubble_id text UNIQUE;
END IF;
END IF;
-- 8. cotizaciones_matriz_responsabilidad
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_matriz_responsabilidad'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_matriz_responsabilidad'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.cotizaciones_matriz_responsabilidad
ADD COLUMN bubble_id text UNIQUE;
END IF;
END IF;
-- 9. cotizaciones_ofertas_items
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_ofertas_items'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_ofertas_items'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.cotizaciones_ofertas_items
ADD COLUMN bubble_id text UNIQUE;
END IF;
END IF;
-- 10. cotizaciones_ofertas_proveedores
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_ofertas_proveedores'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'cotizaciones_ofertas_proveedores'
        AND column_name = 'bubble_id'
) THEN
ALTER TABLE public.cotizaciones_ofertas_proveedores
ADD COLUMN bubble_id text UNIQUE;
END IF;
END IF;
END $$;