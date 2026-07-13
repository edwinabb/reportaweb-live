-- Add new columns to maquinaria_tipos_docs

-- 1. es_obligatorio (Boolean)
ALTER TABLE public.maquinaria_tipos_docs 
ADD COLUMN IF NOT EXISTS es_obligatorio BOOLEAN DEFAULT false;

-- 2. categoria_equipo (Text)
ALTER TABLE public.maquinaria_tipos_docs 
ADD COLUMN IF NOT EXISTS categoria_equipo TEXT;

-- 3. modelo_id (UUID FK)
ALTER TABLE public.maquinaria_tipos_docs 
ADD COLUMN IF NOT EXISTS modelo_id UUID REFERENCES public.maquinaria_modelos(id);

-- Add comments for clarity
COMMENT ON COLUMN public.maquinaria_tipos_docs.categoria_equipo IS 'Links to maquinaria_modelos.tipo_equipo';
