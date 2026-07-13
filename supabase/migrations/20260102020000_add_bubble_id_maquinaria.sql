
-- Add bubble_id to maquinaria_modelos
ALTER TABLE public.maquinaria_modelos 
ADD COLUMN IF NOT EXISTS bubble_id text UNIQUE;

-- Add bubble_id to maquinarias
ALTER TABLE public.maquinarias 
ADD COLUMN IF NOT EXISTS bubble_id text UNIQUE;

-- Add bubble_id to maquinaria_tipos_docs
ALTER TABLE public.maquinaria_tipos_docs 
ADD COLUMN IF NOT EXISTS bubble_id text UNIQUE;

-- Add bubble_id to maquinaria_documentos
ALTER TABLE public.maquinaria_documentos 
ADD COLUMN IF NOT EXISTS bubble_id text UNIQUE;
