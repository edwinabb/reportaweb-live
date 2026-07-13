
-- Migration: Add audit and image fields to Batch 1 tables
ALTER TABLE public.cotizaciones_configuracion 
    ADD COLUMN IF NOT EXISTS firma_autorizado_url TEXT,
    ADD COLUMN IF NOT EXISTS firma_gerente_url TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.companies_consecutives
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.plazos_pago
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.formas_pago
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add triggers for updated_at where missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_plazos_pago_modtime') THEN
        CREATE TRIGGER update_plazos_pago_modtime BEFORE UPDATE ON public.plazos_pago FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_formas_pago_modtime') THEN
        CREATE TRIGGER update_formas_pago_modtime BEFORE UPDATE ON public.formas_pago FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
