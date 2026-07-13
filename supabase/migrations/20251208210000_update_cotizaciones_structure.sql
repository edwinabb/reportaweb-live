-- Actualización completa del módulo de Cotizaciones
-- Basado en análisis del sistema legacy de Bubble

-- ============================================
-- ACTUALIZAR TABLA SERVICIOS
-- ============================================

-- Eliminar campos antiguos si existen
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servicios' AND column_name = 'precio_base') THEN
        ALTER TABLE public.servicios DROP COLUMN precio_base;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servicios' AND column_name = 'unidad_medida') THEN
        ALTER TABLE public.servicios DROP COLUMN unidad_medida;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servicios' AND column_name = 'descripcion') THEN
        ALTER TABLE public.servicios DROP COLUMN descripcion;
    END IF;
END $$;

-- Renombrar categoria a tipo_servicio si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'servicios' AND column_name = 'categoria'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'servicios' AND column_name = 'tipo_servicio'
    ) THEN
        ALTER TABLE public.servicios RENAME COLUMN categoria TO tipo_servicio;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'servicios' AND column_name = 'categoria'
    ) THEN
        ALTER TABLE public.servicios DROP COLUMN categoria;
    END IF;
END $$;

-- Agregar tipo_servicio si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servicios' AND column_name = 'tipo_servicio') THEN
        ALTER TABLE public.servicios ADD COLUMN tipo_servicio TEXT DEFAULT 'ALQUILER';
    END IF;
END $$;

-- Agregar campos adicionales
ALTER TABLE public.servicios
ADD COLUMN IF NOT EXISTS toneladas TEXT,
ADD COLUMN IF NOT EXISTS imagen_url TEXT,
ADD COLUMN IF NOT EXISTS cantidad_precios INTEGER DEFAULT 1;

-- PRECIO 1
ALTER TABLE public.servicios
ADD COLUMN IF NOT EXISTS precio_1_tipo TEXT,
ADD COLUMN IF NOT EXISTS precio_1_valor DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS precio_1_campo_adicional DECIMAL(10, 2);

-- PRECIO 2
ALTER TABLE public.servicios
ADD COLUMN IF NOT EXISTS precio_2_tipo TEXT,
ADD COLUMN IF NOT EXISTS precio_2_valor DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS precio_2_campo_adicional DECIMAL(10, 2);

-- PRECIO 3
ALTER TABLE public.servicios
ADD COLUMN IF NOT EXISTS precio_3_tipo TEXT,
ADD COLUMN IF NOT EXISTS precio_3_valor DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS precio_3_campo_adicional DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS precio_3_no_aplica BOOLEAN DEFAULT false;

-- ============================================
-- ACTUALIZAR TABLA COTIZACIONES
-- ============================================

-- Agregar campos del Paso 1 (Info General)
ALTER TABLE public.cotizaciones
ADD COLUMN IF NOT EXISTS fecha_inicio_estimada DATE,
ADD COLUMN IF NOT EXISTS periodo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS periodo_unidad TEXT DEFAULT 'DIA' CHECK (periodo_unidad IN ('DIA', 'MES')),
ADD COLUMN IF NOT EXISTS forma_pago TEXT DEFAULT 'ADELANTADO',
ADD COLUMN IF NOT EXISTS plazo_pago TEXT DEFAULT 'ANTICIPADO',
ADD COLUMN IF NOT EXISTS descripcion_requerimiento TEXT;

-- Agregar campos del Paso 4 (PDF)
ALTER TABLE public.cotizaciones
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_generado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notas_precios TEXT;

-- Agregar campos del Paso 5 (Aprobación)
ALTER TABLE public.cotizaciones
ADD COLUMN IF NOT EXISTS comentarios_cliente TEXT;

-- Actualizar estados posibles
ALTER TABLE public.cotizaciones
DROP CONSTRAINT IF EXISTS cotizaciones_estado_check;

ALTER TABLE public.cotizaciones
ADD CONSTRAINT cotizaciones_estado_check 
CHECK (estado IN ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA', 'APLAZADA'));

-- ============================================
-- ACTUALIZAR TABLA COTIZACIONES_DETALLE
-- ============================================

-- Eliminar campos antiguos
ALTER TABLE public.cotizaciones_detalle
DROP COLUMN IF EXISTS descripcion,
DROP COLUMN IF EXISTS unidad_medida,
DROP COLUMN IF EXISTS precio_unitario,
DROP COLUMN IF EXISTS descuento_porcentaje,
DROP COLUMN IF EXISTS subtotal;

-- Agregar campos para precio seleccionado
ALTER TABLE public.cotizaciones_detalle
ADD COLUMN IF NOT EXISTS precio_seleccionado INTEGER CHECK (precio_seleccionado BETWEEN 1 AND 3),
ADD COLUMN IF NOT EXISTS precio_tipo TEXT,
ADD COLUMN IF NOT EXISTS precio_valor DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS precio_campo_adicional DECIMAL(10, 2);

-- Agregar campos para aprobación individual
ALTER TABLE public.cotizaciones_detalle
ADD COLUMN IF NOT EXISTS estado_aprobacion TEXT DEFAULT 'PENDIENTE' 
    CHECK (estado_aprobacion IN ('APROBADA', 'RECHAZADA', 'PENDIENTE')),
ADD COLUMN IF NOT EXISTS tarea_id UUID;

-- ============================================
-- CREAR TABLA MATRIZ RESPONSABILIDAD
-- ============================================

CREATE TABLE IF NOT EXISTS public.cotizaciones_matriz_responsabilidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    
    actividad TEXT NOT NULL,
    responsable TEXT NOT NULL CHECK (responsable IN ('EMPRESA', 'CLIENTE')),
    orden INTEGER NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_matriz_responsabilidad_cotizacion 
    ON public.cotizaciones_matriz_responsabilidad(cotizacion_id);

-- RLS
ALTER TABLE public.cotizaciones_matriz_responsabilidad ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREAR TABLA OFERTAS PROVEEDORES
-- ============================================

CREATE TABLE IF NOT EXISTS public.cotizaciones_ofertas_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE NOT NULL,
    servicio_id UUID REFERENCES public.servicios(id) NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    
    proveedor_nombre TEXT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    observaciones TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ofertas_proveedores_cotizacion 
    ON public.cotizaciones_ofertas_proveedores(cotizacion_id);

CREATE INDEX IF NOT EXISTS idx_ofertas_proveedores_servicio 
    ON public.cotizaciones_ofertas_proveedores(servicio_id);

-- RLS
ALTER TABLE public.cotizaciones_ofertas_proveedores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREAR TABLA TIPOS DE PRECIO (Catálogo)
-- ============================================

CREATE TABLE IF NOT EXISTS public.tipos_precio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    requiere_campo_adicional BOOLEAN DEFAULT false,
    nombre_campo_adicional TEXT, -- 'HORAS POR DIA', 'HORAS POR SEMANA', etc.
    orden INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar tipos de precio del sistema legacy
INSERT INTO public.tipos_precio (nombre, requiere_campo_adicional, nombre_campo_adicional, orden) VALUES
('Precio Por Día', false, NULL, 1),
('Precio Por Hora', true, 'HORAS POR DIA', 2),
('Precio por Semana', true, 'HORAS POR SEMANA', 3),
('Precio por Mes', false, NULL, 4),
('Precio Mes', false, NULL, 5),
('Precio por Servicio', false, NULL, 6),
('Precio Por Hora Exceso', true, 'HORAS POR DIA', 7),
('Precio Por Jornada', false, NULL, 8),
('Precio Por Traslado', false, NULL, 9),
('Precio de Movilización', false, NULL, 10),
('Precio de Combustible', false, NULL, 11),
('Precio de Mantenimiento', false, NULL, 12),
('DESMOVILIZACION', false, NULL, 13),
('DESMOVILIZACION-HUARMEY', false, NULL, 14),
('MOVILIZACION-HUARMEY', false, NULL, 15),
('MOV- DESM-CAMION ALPAYANA', false, NULL, 16),
('MOVI Y DESMV', false, NULL, 17),
('MOV. Y DESM. CONTRAPESOS', false, NULL, 18),
('DESARMADO CELOSIA', false, NULL, 19),
('DESM. GRUA CELOSIA', false, NULL, 20)
ON CONFLICT (nombre) DO NOTHING;

-- RLS
ALTER TABLE public.tipos_precio ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREAR TABLA ACTIVIDADES MATRIZ (Catálogo)
-- ============================================

CREATE TABLE IF NOT EXISTS public.actividades_matriz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    nombre TEXT NOT NULL,
    responsable_default TEXT CHECK (responsable_default IN ('EMPRESA', 'CLIENTE')),
    orden INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_actividades_matriz_tenant 
    ON public.actividades_matriz(tenant_id);

-- RLS
ALTER TABLE public.actividades_matriz ENABLE ROW LEVEL SECURITY;
