
-- Run this in Supabase SQL Editor

-- Helper to create typical catalog table
CREATE OR REPLACE FUNCTION create_catalog_table(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.' || table_name || ' (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL, -- Assuming linking to tenant ID
        nombre text NOT NULL,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        created_by uuid, -- Optional reference to auth.users
        updated_by uuid,
        PRIMARY KEY (id)
    )';
    -- Add generic update trigger if needed (omitted for speed unless requested)
END;
$$ LANGUAGE plpgsql;

-- 1. Precios Monedas
SELECT create_catalog_table('precios_monedas');

-- 2. Precios Nombres
SELECT create_catalog_table('precios_nombres');

-- 3. Precios Minimos
SELECT create_catalog_table('precios_minimos');

-- 4. Servicios Tipo
SELECT create_catalog_table('servicios_tipo');

-- 5. Terceros Tipos
SELECT create_catalog_table('terceros_tipos');

-- 6. Sitios Ubicacion
SELECT create_catalog_table('sitios_ubicacion');

-- 7. Tiempo Unidades
SELECT create_catalog_table('tiempo_unidades');

-- Drop helper function
DROP FUNCTION create_catalog_table(text);
