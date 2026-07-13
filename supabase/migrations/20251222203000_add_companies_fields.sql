
-- Migration to add fields to companies table
ALTER TABLE public.companies 
    ADD COLUMN IF NOT EXISTS direccion TEXT,
    ADD COLUMN IF NOT EXISTS telefono TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS ubicacion_ciudad TEXT,
    ADD COLUMN IF NOT EXISTS ubicacion_pais TEXT DEFAULT 'PE',
    ADD COLUMN IF NOT EXISTS gerente_general TEXT;
