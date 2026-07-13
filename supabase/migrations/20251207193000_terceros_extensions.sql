-- Create Terceros Personal Table
CREATE TABLE public.terceros_personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    tercero_id UUID REFERENCES public.terceros(id) ON DELETE CASCADE,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    pais_nacionalidad TEXT,
    tipo_doc TEXT,
    numero_doc TEXT,
    cargo TEXT,
    email TEXT,
    telefono TEXT,
    firma_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for Terceros Personal
ALTER TABLE public.terceros_personal ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_terceros_personal_modtime BEFORE UPDATE ON public.terceros_personal FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Modify Terceros Sitios to add 'comentarios'
ALTER TABLE public.terceros_sitios ADD COLUMN comentarios TEXT;
