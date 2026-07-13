-- Create maquinaria_modelos table
CREATE TABLE IF NOT EXISTS maquinaria_modelos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    tipo_equipo TEXT NOT NULL, -- "Equipo" (Excavadora)
    marca TEXT NOT NULL,       -- "Fabricante" (Caterpillar)
    modelo TEXT NOT NULL,      -- "Modelo" (320 GC)
    capacidad TEXT,            -- Default capacity
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID,
    updated_by UUID
);

-- Add foreign key to maquinarias
ALTER TABLE maquinarias ADD COLUMN IF NOT EXISTS modelo_id UUID REFERENCES maquinaria_modelos(id);

-- Add RLS Policies for maquinaria_modelos
ALTER TABLE maquinaria_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for tenant users" ON maquinaria_modelos
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable insert for tenant users" ON maquinaria_modelos
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Enable update for tenant users" ON maquinaria_modelos
    FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add Trigger for updated_at
CREATE TRIGGER update_maquinaria_modelos_modtime
    BEFORE UPDATE ON maquinaria_modelos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
