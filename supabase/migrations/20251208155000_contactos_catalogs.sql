-- Tabla: Contactos Cargo
CREATE TABLE IF NOT EXISTS public.contactos_cargo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    nombre TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Tabla: Contactos Area
CREATE TABLE IF NOT EXISTS public.contactos_area (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    nombre TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- RLS Policies
ALTER TABLE public.contactos_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos_area ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'contactos_cargo' AND policyname = 'Tenant Isolation Cargo'
    ) THEN
        CREATE POLICY "Tenant Isolation Cargo" ON public.contactos_cargo
            USING (tenant_id = (select tenant_id from profiles where id = auth.uid()))
            WITH CHECK (tenant_id = (select tenant_id from profiles where id = auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'contactos_area' AND policyname = 'Tenant Isolation Area'
    ) THEN
        CREATE POLICY "Tenant Isolation Area" ON public.contactos_area
            USING (tenant_id = (select tenant_id from profiles where id = auth.uid()))
            WITH CHECK (tenant_id = (select tenant_id from profiles where id = auth.uid()));
    END IF;
END
$$;
