-- Módulo de Cotizaciones
-- Incluye: Tasas de Cambio, Servicios, Cotizaciones, Historial

-- ============================================
-- 1. TASAS DE CAMBIO (Exchange Rates)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasas_cambio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    moneda_origen TEXT NOT NULL CHECK (moneda_origen IN ('PEN', 'USD')),
    moneda_destino TEXT NOT NULL CHECK (moneda_destino IN ('PEN', 'USD')),
    tasa DECIMAL(10, 4) NOT NULL CHECK (tasa > 0),
    fecha_vigencia DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(tenant_id, moneda_origen, moneda_destino, fecha_vigencia)
);

-- ============================================
-- 2. SERVICIOS (Services Catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS public.servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT CHECK (categoria IN ('ALQUILER', 'SERVICIO', 'PRODUCTO')),
    unidad_medida TEXT CHECK (unidad_medida IN ('DIA', 'HORA', 'MES', 'UNIDAD')),
    precio_base DECIMAL(10, 2) NOT NULL CHECK (precio_base >= 0),
    moneda TEXT DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(tenant_id, codigo)
);

-- ============================================
-- 3. COTIZACIONES (Quotations Header)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    numero TEXT NOT NULL,
    version INTEGER DEFAULT 1 CHECK (version > 0),
    cotizacion_padre_id UUID REFERENCES public.cotizaciones(id),
    
    -- Cliente info
    cliente_id UUID REFERENCES public.terceros(id) NOT NULL,
    contacto_id UUID REFERENCES public.terceros_contactos(id),
    sitio_id UUID REFERENCES public.terceros_sitios(id),
    
    -- Fechas
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    dias_validez INTEGER DEFAULT 15 CHECK (dias_validez > 0),
    
    -- Moneda y totales
    moneda TEXT DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
    tasa_cambio_id UUID REFERENCES public.tasas_cambio(id),
    subtotal DECIMAL(12, 2) DEFAULT 0 CHECK (subtotal >= 0),
    igv DECIMAL(12, 2) DEFAULT 0 CHECK (igv >= 0),
    total DECIMAL(12, 2) DEFAULT 0 CHECK (total >= 0),
    
    -- Estado y aprobación
    estado TEXT DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA')),
    token_aprobacion TEXT UNIQUE,
    pin_aprobacion TEXT,
    fecha_envio TIMESTAMPTZ,
    fecha_aprobacion TIMESTAMPTZ,
    aprobado_por TEXT,
    observaciones_cliente TEXT,
    
    -- Tarea generada (futuro)
    tarea_id UUID,
    
    -- Notas
    notas_internas TEXT,
    terminos_condiciones TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(tenant_id, numero, version)
);

-- ============================================
-- 4. COTIZACIONES DETALLE (Quotation Lines)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cotizaciones_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    
    orden INTEGER NOT NULL CHECK (orden > 0),
    servicio_id UUID REFERENCES public.servicios(id),
    
    -- Permite override de datos del servicio
    descripcion TEXT NOT NULL,
    unidad_medida TEXT,
    cantidad DECIMAL(10, 2) NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    descuento_porcentaje DECIMAL(5, 2) DEFAULT 0 CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- 5. COTIZACIONES HISTORIAL (Quotation History)
-- ============================================
CREATE TABLE IF NOT EXISTS public.cotizaciones_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    
    accion TEXT NOT NULL, -- 'CREADA', 'MODIFICADA', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'NUEVA_VERSION'
    estado_anterior TEXT,
    estado_nuevo TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    usuario_email TEXT,
    observacion TEXT,
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE TRIGGER update_tasas_cambio_modtime
    BEFORE UPDATE ON public.tasas_cambio
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_servicios_modtime
    BEFORE UPDATE ON public.servicios
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_cotizaciones_modtime
    BEFORE UPDATE ON public.cotizaciones
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.tasas_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_historial ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_tenant ON public.tasas_cambio(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_vigencia ON public.tasas_cambio(fecha_vigencia);
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_monedas ON public.tasas_cambio(moneda_origen, moneda_destino);

CREATE INDEX IF NOT EXISTS idx_servicios_tenant ON public.servicios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_servicios_codigo ON public.servicios(codigo);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_tenant ON public.cotizaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON public.cotizaciones(numero);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON public.cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON public.cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_token ON public.cotizaciones(token_aprobacion);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha_emision ON public.cotizaciones(fecha_emision);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_detalle_cotizacion ON public.cotizaciones_detalle(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_detalle_servicio ON public.cotizaciones_detalle(servicio_id);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_historial_cotizacion ON public.cotizaciones_historial(cotizacion_id);
