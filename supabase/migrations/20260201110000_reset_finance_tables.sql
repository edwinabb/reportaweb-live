-- Reset Finance Tables (Sales + Purchase) and Fix Types
-- This script wipes inconsistent data and prepares columns as UUID
-- TO BE RUN BEFORE V4 MIGRATION
-- Note: Uses USING NULL because tables are truncated first — no data cast needed.

-- 1. Truncate (Wipe) - SALES
TRUNCATE TABLE public.facturas_venta_item CASCADE;
TRUNCATE TABLE public.factura_venta_pagos CASCADE;
TRUNCATE TABLE public.facturas_venta CASCADE;
TRUNCATE TABLE public.cotizaciones_detalle CASCADE;
TRUNCATE TABLE public.cotizaciones CASCADE;
-- 2. Truncate (Wipe) - PURCHASE
TRUNCATE TABLE public.facturas_compra_item CASCADE;
TRUNCATE TABLE public.facturas_compra_pagos CASCADE;
TRUNCATE TABLE public.facturas_compra CASCADE;

-- 3. Fix Column Types to UUID - Drop policies first, then alter
DO $$ BEGIN
    -- Drop any RLS policies that might reference these columns
    DROP POLICY IF EXISTS "Access Policy" ON public.facturas_venta;
    DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.facturas_venta;
    DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.facturas_venta;
    DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.facturas_venta;
    DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON public.facturas_venta;
    -- facturas_venta columns
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta' AND column_name='created_by' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta ALTER COLUMN created_by TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta' AND column_name='editor_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta ALTER COLUMN editor_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta' AND column_name='tenant_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta ALTER COLUMN tenant_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta' AND column_name='cliente_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta ALTER COLUMN cliente_id TYPE uuid USING NULL; END IF;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Access Policy" ON public.facturas_venta_item;
    DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.facturas_venta_item;
    DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.facturas_venta_item;
    DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.facturas_venta_item;
    DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON public.facturas_venta_item;
    -- facturas_venta_item columns (factura_id not a column — skip; FK is factura_venta_id if present)
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='created_by' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN created_by TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='editor_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN editor_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='tenant_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN tenant_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='maquinaria_reporte_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN maquinaria_reporte_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='maquinaria_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN maquinaria_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='servicio_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN servicio_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='factura_venta_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN factura_venta_id TYPE uuid USING NULL; END IF;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Access Policy" ON public.factura_venta_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.factura_venta_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.factura_venta_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.factura_venta_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON public.factura_venta_pagos;
    -- factura_venta_pagos — check each column before altering
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='created_by' AND data_type<>'uuid') THEN ALTER TABLE public.factura_venta_pagos ALTER COLUMN created_by TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='updated_by' AND data_type<>'uuid') THEN ALTER TABLE public.factura_venta_pagos ALTER COLUMN updated_by TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='tenant_id' AND data_type<>'uuid') THEN ALTER TABLE public.factura_venta_pagos ALTER COLUMN tenant_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='factura_venta_id' AND data_type<>'uuid') THEN ALTER TABLE public.factura_venta_pagos ALTER COLUMN factura_venta_id TYPE uuid USING NULL; END IF;
END $$;

-- 4. Fix Column Types to UUID - PURCHASE
DO $$ BEGIN
    DROP POLICY IF EXISTS "Access Policy" ON public.facturas_compra;
    DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.facturas_compra;
    DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.facturas_compra;
    DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.facturas_compra;
    DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON public.facturas_compra;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra' AND column_name='created_by' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra ALTER COLUMN created_by TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra' AND column_name='editor_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra ALTER COLUMN editor_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra' AND column_name='tenant_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra ALTER COLUMN tenant_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra' AND column_name='proveedor_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra ALTER COLUMN proveedor_id TYPE uuid USING NULL; END IF;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Access Policy" ON public.facturas_compra_item;
    DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.facturas_compra_item;
    DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.facturas_compra_item;
    DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.facturas_compra_item;
    DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON public.facturas_compra_item;
    -- facturas_compra_item: factura_id and servicio_id may not exist — check before altering
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_item' AND column_name='created_by' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_item ALTER COLUMN created_by TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_item' AND column_name='editor_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_item ALTER COLUMN editor_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_item' AND column_name='tenant_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_item ALTER COLUMN tenant_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_item' AND column_name='factura_compra_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_item ALTER COLUMN factura_compra_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_item' AND column_name='servicio_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_item ALTER COLUMN servicio_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_item' AND column_name='maquinaria_reporte_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_item ALTER COLUMN maquinaria_reporte_id TYPE uuid USING NULL; END IF;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Access Policy" ON public.facturas_compra_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.facturas_compra_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.facturas_compra_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.facturas_compra_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON public.facturas_compra_pagos;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_pagos' AND column_name='created_by' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_pagos ALTER COLUMN created_by TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_pagos' AND column_name='editor_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_pagos ALTER COLUMN editor_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_pagos' AND column_name='tenant_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_pagos ALTER COLUMN tenant_id TYPE uuid USING NULL; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_compra_pagos' AND column_name='factura_compra_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_compra_pagos ALTER COLUMN factura_compra_id TYPE uuid USING NULL; END IF;
END $$;

-- 5. Ensure bubble_id on Companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS bubble_id text UNIQUE;
