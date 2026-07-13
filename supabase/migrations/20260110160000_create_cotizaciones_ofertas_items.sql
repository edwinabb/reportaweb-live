
-- Create cotizaciones_ofertas_items table to support legacy provider offers details
CREATE TABLE IF NOT EXISTS public.cotizaciones_ofertas_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_oferta_id UUID REFERENCES public.cotizaciones_ofertas_proveedores(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    
    descripcion TEXT, -- In case it does not map to a service
    servicio_id UUID REFERENCES public.servicios(id),
    
    cantidad DECIMAL(10, 2) DEFAULT 1 CHECK (cantidad > 0),
    precio_monto DECIMAL(12, 2) DEFAULT 0 CHECK (precio_monto >= 0),
    minimo DECIMAL(10, 2) DEFAULT 0,
    
    aprobado BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.cotizaciones_ofertas_items ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cot_ofertas_items_oferta ON public.cotizaciones_ofertas_items(cotizacion_oferta_id);
CREATE INDEX IF NOT EXISTS idx_cot_ofertas_items_tenant ON public.cotizaciones_ofertas_items(tenant_id);

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cot_ofertas_items_modtime') THEN
        CREATE TRIGGER update_cot_ofertas_items_modtime 
        BEFORE UPDATE ON public.cotizaciones_ofertas_items 
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
