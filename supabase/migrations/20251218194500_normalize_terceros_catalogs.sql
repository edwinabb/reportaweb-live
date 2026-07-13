
-- 1. Table for Rubros
CREATE TABLE public.rubros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    nombre TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS and Trigger
ALTER TABLE public.rubros ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_rubros_modtime BEFORE UPDATE ON public.rubros FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Table for Countries
CREATE TABLE public.paises (
    id TEXT PRIMARY KEY, -- ISO code (e.g., 'PE', 'CO', 'US')
    nombre TEXT NOT NULL,
    continente TEXT DEFAULT 'América',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.paises ENABLE ROW LEVEL SECURITY;
-- Public read access for paises (no tenant isolation needed for a global catalog)
CREATE POLICY "Allow public read access for paises" ON public.paises FOR SELECT USING (true);

-- 3. Table for Ubigeo (Peru)
CREATE TABLE public.ubigeo (
    codigo TEXT PRIMARY KEY, -- INEI Code
    departamento TEXT NOT NULL,
    provincia TEXT NOT NULL,
    distrito TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.ubigeo ENABLE ROW LEVEL SECURITY;
-- Public read access for ubigeo
CREATE POLICY "Allow public read access for ubigeo" ON public.ubigeo FOR SELECT USING (true);

-- 4. Update Terceros Table
ALTER TABLE public.terceros 
    ADD COLUMN rubro_id UUID REFERENCES public.rubros(id),
    ADD COLUMN pais_id TEXT REFERENCES public.paises(id),
    ADD COLUMN ubigeo_codigo TEXT REFERENCES public.ubigeo(codigo);

-- Add indexes for performance
CREATE INDEX idx_terceros_rubro ON public.terceros(rubro_id);
CREATE INDEX idx_terceros_pais ON public.terceros(pais_id);
CREATE INDEX idx_terceros_ubigeo ON public.terceros(ubigeo_codigo);
