-- Fix Schema based on User Request
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='texto_introduccion')
    AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='introduccion') THEN
        ALTER TABLE public.cotizaciones_configuracion RENAME COLUMN texto_introduccion TO introduccion;
    END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='texto_notas_precios')
    AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='terminos_condiciones') THEN
        ALTER TABLE public.cotizaciones_configuracion RENAME COLUMN texto_notas_precios TO terminos_condiciones;
    END IF;
END $$;

-- Handle inconsistent previous naming or missing columns
DO $$
BEGIN
    -- firma_autorizada_usuario_id -> firma_autorizado_url
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='firma_autorizada_usuario_id')
    AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='firma_autorizado_url') THEN
        ALTER TABLE public.cotizaciones_configuracion RENAME COLUMN firma_autorizada_usuario_id TO firma_autorizado_url;
    ELSE
        ALTER TABLE public.cotizaciones_configuracion ADD COLUMN IF NOT EXISTS firma_autorizado_url UUID;
    END IF;

    -- firma_imagen_url -> imagen_firma
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='firma_imagen_url')
    AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='imagen_firma') THEN
        ALTER TABLE public.cotizaciones_configuracion RENAME COLUMN firma_imagen_url TO imagen_firma;
    ELSE
        ALTER TABLE public.cotizaciones_configuracion ADD COLUMN IF NOT EXISTS imagen_firma TEXT;
    END IF;

    -- imagen_banco_url -> imagen_banco
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='imagen_banco_url')
    AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='cotizaciones_configuracion' AND column_name='imagen_banco') THEN
        ALTER TABLE public.cotizaciones_configuracion RENAME COLUMN imagen_banco_url TO imagen_banco;
    ELSE
        ALTER TABLE public.cotizaciones_configuracion ADD COLUMN IF NOT EXISTS imagen_banco TEXT;
    END IF;
END $$;

-- Add other missing columns per schema
ALTER TABLE public.cotizaciones_configuracion
    ADD COLUMN IF NOT EXISTS pie_pagina TEXT,
    ADD COLUMN IF NOT EXISTS forma_pago1 TEXT,
    ADD COLUMN IF NOT EXISTS forma_pago2 TEXT,
    ADD COLUMN IF NOT EXISTS despedida TEXT,
    ADD COLUMN IF NOT EXISTS mostrar_firma BOOLEAN DEFAULT true;

-- Foreign Key for firma_autorizado_url (User ID)
-- Check if constraint exists before adding to avoid error
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_configuracion_firma_autorizado_url_fkey')
    AND EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='cotizaciones_configuracion'
                AND column_name='firma_autorizado_url'
                AND data_type='uuid') THEN
        ALTER TABLE public.cotizaciones_configuracion
        ADD CONSTRAINT cotizaciones_configuracion_firma_autorizado_url_fkey
        FOREIGN KEY (firma_autorizado_url) REFERENCES auth.users(id);
    END IF;
END $$;


-- Create 'cotizaciones' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('cotizaciones', 'cotizaciones', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for 'cotizaciones' bucket
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow authenticated uploads to cotizaciones' AND tablename='objects' AND schemaname='storage') THEN
        CREATE POLICY "Allow authenticated uploads to cotizaciones" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cotizaciones');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow public view cotizaciones' AND tablename='objects' AND schemaname='storage') THEN
        CREATE POLICY "Allow public view cotizaciones" ON storage.objects FOR SELECT TO public USING (bucket_id = 'cotizaciones');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow authenticated update cotizaciones' AND tablename='objects' AND schemaname='storage') THEN
        CREATE POLICY "Allow authenticated update cotizaciones" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'cotizaciones');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow authenticated delete cotizaciones' AND tablename='objects' AND schemaname='storage') THEN
        CREATE POLICY "Allow authenticated delete cotizaciones" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cotizaciones');
    END IF;
END $$;
