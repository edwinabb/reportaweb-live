
-- Create plantillas table
CREATE TABLE IF NOT EXISTS public.plantillas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    estructura jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create inspecciones table
CREATE TABLE IF NOT EXISTS public.inspecciones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    codigo_interno text,
    maquinaria_id uuid REFERENCES public.maquinarias(id),
    conductor_id uuid REFERENCES public.profiles(id),
    supervisor_id uuid REFERENCES public.profiles(id),
    plantilla_id uuid REFERENCES public.plantillas(id),
    
    horometro_actual numeric,
    kilometraje_actual numeric,
    nivel_tanque_gasolina numeric,
    
    fecha_inspeccion timestamptz DEFAULT now(),
    estado text DEFAULT 'COMPLETADO',
    tiene_fallas boolean DEFAULT false,
    ubicacion_gps jsonb,
    firma_supervisor_url text,
    firma_conductor_url text,
    
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create inspecciones_detalles table
CREATE TABLE IF NOT EXISTS public.inspecciones_detalles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    inspeccion_id uuid REFERENCES public.inspecciones(id) ON DELETE CASCADE,
    
    categoria text,
    item text,
    orden int DEFAULT 0,
    
    estado text, -- OK, FALLA, NO_APLICA
    prioridad text, -- ALTA, MEDIA, BAJA
    comentario text,
    foto_url text,
    opciones_respuesta jsonb, -- snapshot
    
    created_at timestamptz DEFAULT now()
);

-- Create planes_accion table
CREATE TABLE IF NOT EXISTS public.planes_accion (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    inspeccion_id uuid REFERENCES public.inspecciones(id),
    inspeccion_detalle_id uuid REFERENCES public.inspecciones_detalles(id),
    
    descripcion_problema text,
    accion_correctiva_propuesta text,
    
    responsable_id uuid REFERENCES public.profiles(id),
    fecha_limite timestamptz,
    prioridad text,
    estado text DEFAULT 'PENDIENTE', -- PENDIENTE, EN_PROCESO, CERRADO
    
    evidencia_cierre_url text,
    fecha_cierre timestamptz,
    comentario_cierre text,
    
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies (Simplified for now, assuming tenant isolation)
ALTER TABLE public.plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspecciones_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_accion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for users based on tenant_id" ON public.plantillas
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

CREATE POLICY "Enable all for users based on tenant_id" ON public.inspecciones
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

CREATE POLICY "Enable all for users based on tenant_id" ON public.inspecciones_detalles
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

CREATE POLICY "Enable all for users based on tenant_id" ON public.planes_accion
    USING (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));
