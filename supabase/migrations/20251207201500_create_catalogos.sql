-- Create Catalogos Table
CREATE TABLE public.catalogos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    categoria TEXT NOT NULL, -- 'TERCERO_CARGO', 'TERCERO_AREA'
    nombre TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_catalogos_modtime BEFORE UPDATE ON public.catalogos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
