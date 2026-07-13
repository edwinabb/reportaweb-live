
-- ENUMS
CREATE TYPE tercero_tipo AS ENUM ('cliente', 'proveedor', 'ambos');
CREATE TYPE maquinaria_propietario AS ENUM ('propio', 'tercero');
CREATE TYPE maquinaria_estado AS ENUM ('operativo', 'mantenimiento', 'inactivo');
CREATE TYPE doc_aplica_a AS ENUM ('vehiculo', 'maquinaria', 'todos');

-- TABLE: TERCEROS
CREATE TABLE public.terceros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    tipo tercero_tipo DEFAULT 'cliente',
    razon_social TEXT NOT NULL,
    nombre_comercial TEXT,
    ruc TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    rubro TEXT,
    condicion TEXT, -- e.g. HABIDO
    estado TEXT DEFAULT 'ACTIVO',
    logo_url TEXT,
    ubicacion_ciudad TEXT,
    ubicacion_departamento TEXT,
    ubicacion_pais TEXT DEFAULT 'PERU',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- TABLE: TERCEROS CONTACTOS
CREATE TABLE public.terceros_contactos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tercero_id UUID REFERENCES public.terceros(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    nombre_completo TEXT NOT NULL,
    cargo TEXT,
    area TEXT,
    telefono TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- TABLE: TERCEROS SITIOS
CREATE TABLE public.terceros_sitios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tercero_id UUID REFERENCES public.terceros(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    nombre TEXT NOT NULL,
    codigo TEXT,
    direccion TEXT,
    ciudad TEXT,
    tipo TEXT, -- e.g. SITIO DE PROYECTO
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- TABLE: MAQUINARIA
CREATE TABLE public.maquinarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    codigo_interno TEXT,
    nombre TEXT NOT NULL,
    categoria TEXT, -- e.g. CAMIONETA
    marca TEXT,
    modelo TEXT,
    placa TEXT,
    capacidad TEXT,
    anio_fabricacion INTEGER,
    propietario maquinaria_propietario DEFAULT 'propio',
    proveedor_id UUID REFERENCES public.terceros(id), -- Nullable, used if propietario='tercero'
    estado maquinaria_estado DEFAULT 'operativo',
    foto_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- TABLE: TIPOS DE DOCUMENTO (Config)
CREATE TABLE public.maquinaria_tipos_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    nombre TEXT NOT NULL,
    aplica_a doc_aplica_a DEFAULT 'todos',
    requiere_vencimiento BOOLEAN DEFAULT true,
    dias_alerta INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- TABLE: DOCUMENTOS DE MAQUINARIA
CREATE TABLE public.maquinaria_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquinaria_id UUID REFERENCES public.maquinarias(id) ON DELETE CASCADE,
    tipo_doc_id UUID REFERENCES public.maquinaria_tipos_docs(id),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    numero_doc TEXT,
    fecha_emision DATE,
    fecha_vencimiento DATE,
    archivo_url TEXT,
    estado TEXT, -- VIGENTE, VENCIDO, POR VENCER (Can be calculated, but stored for ease)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- TRIGGERS FOR UPDATED_AT
-- Assumes update_updated_at_column function exists from previous migration
CREATE TRIGGER update_terceros_modtime BEFORE UPDATE ON public.terceros FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_terceros_contactos_modtime BEFORE UPDATE ON public.terceros_contactos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_terceros_sitios_modtime BEFORE UPDATE ON public.terceros_sitios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_maquinarias_modtime BEFORE UPDATE ON public.maquinarias FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_maquinaria_tipos_docs_modtime BEFORE UPDATE ON public.maquinaria_tipos_docs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_maquinaria_documentos_modtime BEFORE UPDATE ON public.maquinaria_documentos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS POLICIES
ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terceros_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terceros_sitios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinaria_tipos_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinaria_documentos ENABLE ROW LEVEL SECURITY;

-- Note: Actual policies to be applied via admin client or separate script if needed, 
-- but generally we use Service Role in Actions for now or need to define them.
-- Adding basic "Users can view data from their own tenant" policy placeholder.

