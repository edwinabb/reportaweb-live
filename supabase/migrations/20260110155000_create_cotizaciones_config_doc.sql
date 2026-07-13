
-- Create cotizaciones_configuracion_doc table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cotizaciones_configuracion_doc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    nombre TEXT NOT NULL, -- e.g. 'Terminos y Condiciones', 'Introduccion Default'
    contenido TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, nombre)
);

-- Enable RLS
ALTER TABLE public.cotizaciones_configuracion_doc ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cotizaciones_config_doc_modtime') THEN
        CREATE TRIGGER update_cotizaciones_config_doc_modtime 
        BEFORE UPDATE ON public.cotizaciones_configuracion_doc 
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
