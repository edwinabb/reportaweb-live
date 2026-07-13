-- Migration: Create tables for Inspections and Reports module

-- 1. Tareas Fechas (Multi-date execution)
CREATE TABLE IF NOT EXISTS public.tareas_fechas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    tarea_id uuid REFERENCES public.tareas(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    
    assigned_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 2. Tareas Recursos (Granular assignment)
CREATE TABLE IF NOT EXISTS public.tareas_recursos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    tarea_id uuid REFERENCES public.tareas(id) ON DELETE CASCADE,
    
    tipo_recurso text NOT NULL CHECK (tipo_recurso IN ('PERSONAL', 'MAQUINARIA')),
    personal_id uuid REFERENCES public.profiles(id), -- Nullable if generic provider
    maquinaria_id uuid REFERENCES public.maquinarias(id),
    
    recurso_externo_nombre text, -- If provider resource without profile/machine ID
    proveedor_id uuid REFERENCES public.terceros(id), -- If external
    
    fecha_asignada date, -- If NULL, applies to entire task
    
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- 3. Reportes Personal
CREATE TABLE IF NOT EXISTS public.reportes_personal (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    tarea_id uuid REFERENCES public.tareas(id),
    personal_id uuid REFERENCES public.profiles(id),
    maquinaria_id uuid REFERENCES public.maquinarias(id), -- Optional link
    
    fecha_reporte date NOT NULL,
    id_documento_interno text,
    
    -- Jornada 1
    jornada1_inicio timestamptz,
    jornada1_fin timestamptz,
    
    -- Jornada 2
    jornada2_inicio timestamptz,
    jornada2_fin timestamptz,
    
    -- Calculations
    total_horas numeric DEFAULT 0,
    horas_extras numeric DEFAULT 0,
    horas_extras_extraordinarias numeric DEFAULT 0,
    horas_dominicales numeric DEFAULT 0,
    
    -- Gastos
    gasto_desayuno numeric DEFAULT 0,
    gasto_almuerzo numeric DEFAULT 0,
    gasto_cena numeric DEFAULT 0,
    gasto_movilidad numeric DEFAULT 0,
    gasto_total numeric DEFAULT 0,
    
    trabajo_realizado text,
    firmado_por uuid REFERENCES public.profiles(id),
    pdf_url text,
    
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- 4. Reportes Maquinaria
CREATE TABLE IF NOT EXISTS public.reportes_maquinaria (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    tarea_id uuid REFERENCES public.tareas(id),
    maquinaria_id uuid REFERENCES public.maquinarias(id),
    
    operador_id uuid REFERENCES public.profiles(id),
    rigger1_id uuid REFERENCES public.profiles(id),
    rigger2_id uuid REFERENCES public.profiles(id),
    
    fecha_reporte date NOT NULL,
    id_documento_interno text,
    
    -- Jornadas
    jornada1_inicio timestamptz,
    jornada1_fin timestamptz,
    jornada2_inicio timestamptz,
    jornada2_fin timestamptz,
    
    -- Metrics
    tipo_recorrido text, -- 'SOLO_IDA', 'IDA_VUELTA', 'NO_APLICA'
    total_horas numeric DEFAULT 0,
    
    trabajo_realizado text,
    
    -- Multimedia
    foto_actividad_url text,
    firma_cliente_url text,
    nombre_cliente_firmante text,
    cargo_cliente_firmante text,
    
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- 5. Reportes Combustible
CREATE TABLE IF NOT EXISTS public.reportes_combustible (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    tarea_id uuid REFERENCES public.tareas(id),
    maquinaria_id uuid REFERENCES public.maquinarias(id),
    
    fecha_reporte date NOT NULL,
    
    -- Readings
    horometro_actual numeric,
    kilometraje_actual numeric,
    
    -- Consumption
    galones numeric,
    tipo_combustible text, -- 'DIESEL', 'GASOLINA_90', etc.
    precio_unitario numeric,
    monto_subtotal numeric,
    monto_igv numeric,
    monto_total numeric,
    proveedor_grifo text,
    
    -- Evidence
    foto_tablero_url text,
    foto_surtidor_url text,
    foto_voucher_url text,
    
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- 6. Modify Inspecciones (Dynamic Forms)
-- Only run if column doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'tarea_id') THEN
        ALTER TABLE public.inspecciones ADD COLUMN tarea_id uuid REFERENCES public.tareas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'horometro_inicio') THEN
        ALTER TABLE public.inspecciones ADD COLUMN horometro_inicio numeric;
        ALTER TABLE public.inspecciones ADD COLUMN horometro_fin numeric;
        ALTER TABLE public.inspecciones ADD COLUMN kilometraje_inicio numeric;
        ALTER TABLE public.inspecciones ADD COLUMN kilometraje_fin numeric;
        ALTER TABLE public.inspecciones ADD COLUMN foto_tablero_inicio_url text;
        ALTER TABLE public.inspecciones ADD COLUMN foto_tablero_fin_url text;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.tareas_fechas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_maquinaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_combustible ENABLE ROW LEVEL SECURITY;

-- Simple Policies (Tenant isolation)
CREATE POLICY "Enable all for tenant users" ON public.tareas_fechas
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

CREATE POLICY "Enable all for tenant users" ON public.tareas_recursos
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

CREATE POLICY "Enable all for tenant users" ON public.reportes_personal
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

CREATE POLICY "Enable all for tenant users" ON public.reportes_maquinaria
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

CREATE POLICY "Enable all for tenant users" ON public.reportes_combustible
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- 7. Bitacora Operaciones (Mobile/Offline Integration)
CREATE TYPE public.tipo_evento_bitacora AS ENUM (
    'LLEGADA_SITIO',
    'CHECKLIST_INICIO',
    'ARRANQUE_MOTOR',
    'INICIO_TRABAJO',
    'PARADA_OPERATIVA',
    'REINICIO_TRABAJO',
    'CARGA_COMBUSTIBLE',
    'FIN_JORNADA',
    'OTRO'
);

CREATE TABLE IF NOT EXISTS public.bitacora_operaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    
    tipo_evento public.tipo_evento_bitacora NOT NULL,
    fecha_hora_evento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    geolocalizacion JSONB, -- { lat, lng, accuracy }
    lectura_dato NUMERIC, -- Horometro, KM, Galones 
    multimedia_url TEXT,
    observaciones TEXT,
    
    is_active boolean DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.bitacora_operaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for tenant users" ON public.bitacora_operaciones
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

