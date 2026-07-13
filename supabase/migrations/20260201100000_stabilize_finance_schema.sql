-- Finance Schema Stabilization
-- Purpose: Ensure all relational columns are UUID and consistent across tables.
-- 1. Companies
ALTER TABLE IF EXISTS public.companies
ADD COLUMN IF NOT EXISTS bubble_id text UNIQUE;
-- 2. Cotizaciones (Fix schema if needed)
-- Assuming columns exist based on inspect-schemas.ts
-- 3. Facturas Venta
DROP POLICY IF EXISTS "Access Policy" ON public.facturas_venta;
DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.facturas_venta;
DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.facturas_venta;
DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.facturas_venta;
ALTER TABLE IF EXISTS public.facturas_venta
ALTER COLUMN created_by TYPE uuid USING created_by::uuid,
    ALTER COLUMN editor_id TYPE uuid USING editor_id::uuid,
    ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid,
    ALTER COLUMN cliente_id TYPE uuid USING cliente_id::uuid;
-- 4. Facturas Venta Item
-- Drop policies + rename stray column + alter types all in one block so catalog changes are visible together
DO $$ BEGIN
    -- Drop all policies that reference columns we're about to change type
    DROP POLICY IF EXISTS "Access Policy" ON public.facturas_venta_item;
    DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.facturas_venta_item;
    DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.facturas_venta_item;
    DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.facturas_venta_item;
    DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON public.facturas_venta_item;
    -- Cleanup stray 'tenant_id bubble' column name from Bubble import
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='tenant_id bubble') THEN
        ALTER TABLE facturas_venta_item RENAME COLUMN "tenant_id bubble" TO tenant_id_bubble_temp;
    END IF;
    -- Alter column types to uuid (only if not already uuid)
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='created_by' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN created_by TYPE uuid USING created_by::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='editor_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN editor_id TYPE uuid USING editor_id::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='tenant_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='maquinaria_reporte_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN maquinaria_reporte_id TYPE uuid USING maquinaria_reporte_id::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='maquinaria_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN maquinaria_id TYPE uuid USING maquinaria_id::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='servicio_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN servicio_id TYPE uuid USING servicio_id::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='facturas_venta_item' AND column_name='factura_id' AND data_type<>'uuid') THEN ALTER TABLE public.facturas_venta_item ALTER COLUMN factura_id TYPE uuid USING factura_id::uuid; END IF;
END $$;
-- 5. Factura Venta Pagos
-- Drop policies + rename stray columns + alter types all in one block
DO $$ BEGIN
    -- Drop all policies that reference columns we're about to change type
    DROP POLICY IF EXISTS "Access Policy" ON public.factura_venta_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access SELECT" ON public.factura_venta_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access INSERT" ON public.factura_venta_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access UPDATE" ON public.factura_venta_pagos;
    DROP POLICY IF EXISTS "Admin Tenant Access DELETE" ON public.factura_venta_pagos;
    -- Cleanup stray Bubble column names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='created_by Bubble') THEN
        ALTER TABLE factura_venta_pagos RENAME COLUMN "created_by Bubble" TO created_by_bubble_temp;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='tenant_id Bubble') THEN
        ALTER TABLE factura_venta_pagos RENAME COLUMN "tenant_id Bubble" TO tenant_id_bubble_temp;
    END IF;
    -- Alter column types to uuid (only if not already uuid)
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='created_by' AND data_type<>'uuid') THEN ALTER TABLE public.factura_venta_pagos ALTER COLUMN created_by TYPE uuid USING created_by::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='updated_by' AND data_type<>'uuid') THEN ALTER TABLE public.factura_venta_pagos ALTER COLUMN updated_by TYPE uuid USING updated_by::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='tenant_id' AND data_type<>'uuid') THEN ALTER TABLE public.factura_venta_pagos ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='factura_venta_pagos' AND column_name='factura_venta_id' AND data_type<>'uuid') THEN ALTER TABLE public.factura_venta_pagos ALTER COLUMN factura_venta_id TYPE uuid USING factura_venta_id::uuid; END IF;
END $$;