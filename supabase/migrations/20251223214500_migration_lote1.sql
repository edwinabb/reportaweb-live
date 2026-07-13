
-- Migration: Lote 1 - Configurativas y Catálogos
-- Description: Creación de tablas para control de consecutivos, festivos, intervalos, configuración de cotizaciones y catálogos de pagos.

-- 1. Control de Consecutivos
CREATE TABLE IF NOT EXISTS public.companies_consecutives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    documento_tipo TEXT NOT NULL, -- e.g. 'COTIZACION', 'FACTURA'
    prefijo TEXT,
    ultimo_numero INTEGER DEFAULT 0,
    longitud_numero INTEGER DEFAULT 6,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, documento_tipo)
);
COMMENT ON TABLE public.companies_consecutives IS 'Tabla para controlar los números consecutivos de los documentos por tenant.';

-- 2. Calendario de Festivos
CREATE TABLE IF NOT EXISTS public.app_calendario_festivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    descripcion TEXT,
    pais_id TEXT DEFAULT 'PE' REFERENCES public.paises(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.app_calendario_festivos IS 'Listado con las fechas festivas en Peru hasta el 2027.';

-- 3. Intervalos de Hora (30 min)
CREATE TABLE IF NOT EXISTS public.app_hora_intervalos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hora_inicio TIME NOT NULL UNIQUE,
    hora_fin TIME NOT NULL,
    etiqueta TEXT NOT NULL, -- e.g. '08:00 - 08:30'
    orden INTEGER,
    is_active BOOLEAN DEFAULT true
);
COMMENT ON TABLE public.app_hora_intervalos IS 'Tabla con Horarios cada 30 minutos en un día.';

-- 4. Actualizar Paises
ALTER TABLE public.paises 
    ADD COLUMN IF NOT EXISTS indicativo TEXT,
    ADD COLUMN IF NOT EXISTS iso2 TEXT;
COMMENT ON COLUMN public.paises.indicativo IS 'Código telefónico del país.';
COMMENT ON COLUMN public.paises.iso2 IS 'Código ISO de 2 letras.';

-- 5. Configuración de Cotizaciones
CREATE TABLE IF NOT EXISTS public.cotizaciones_configuracion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    saludo TEXT,
    introduccion TEXT,
    terminos_condiciones TEXT,
    pie_pagina TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id)
);
COMMENT ON TABLE public.cotizaciones_configuracion IS 'Tabla con los diferentes elementos de la cotización (saludo, introducción, etc).';

-- 6. Plazos de Pago
CREATE TABLE IF NOT EXISTS public.plazos_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    nombre TEXT NOT NULL,
    dias INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, nombre)
);
COMMENT ON TABLE public.plazos_pago IS 'Catálogo de plazos de pago por tenant.';

-- 7. Formas de Pago
CREATE TABLE IF NOT EXISTS public.formas_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    nombre TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, nombre)
);
COMMENT ON TABLE public.formas_pago IS 'Catálogo de formas de pago por tenant.';

-- Asegurar triggers de updated_at
CREATE TRIGGER update_companies_consecutives_modtime BEFORE UPDATE ON public.companies_consecutives FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_cotizaciones_config_modtime BEFORE UPDATE ON public.cotizaciones_configuracion FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.companies_consecutives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_calendario_festivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_hora_intervalos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plazos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas_pago ENABLE ROW LEVEL SECURITY;
