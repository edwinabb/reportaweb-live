
-- Migration to add fields to companies and branches tables
ALTER TABLE public.companies 
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS gerente_general TEXT;

ALTER TABLE public.branches
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'PE',
    ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
