-- Migration: Create missing Services tables
-- Run in Supabase SQL Editor
-- 1. servicios_tipos
CREATE TABLE IF NOT EXISTS public.servicios_tipos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    -- link to companies or tenants
    nombre text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text,
    bubble_id text UNIQUE
);
-- 2. servicios
CREATE TABLE IF NOT EXISTS public.servicios (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    codigo text,
    nombre text,
    tipo_servicio text,
    -- Stores name or ID of type? Storing name for simplicity or relations?
    -- Ideally 'tipo_servicio_id' referencing servicios_tipos(id). 
    -- But existing code references 'tipo_servicio' (string). 
    -- Migration script 'migrate-cotizaciones-bubble.ts' maps 'tipo_servicio' from Bubble.
    -- We'll add 'tipo_servicio_id' as optional for future FK.
    moneda text DEFAULT 'USD',
    toneladas text,
    imagen_url text,
    cantidad_precios numeric,
    -- Embedded prices (Legacy Bubble structure)
    precio_1_valor numeric,
    precio_1_tipo text,
    precio_1_campo_adicional text,
    precio_2_valor numeric,
    precio_2_tipo text,
    precio_2_campo_adicional text,
    precio_3_valor numeric,
    precio_3_tipo text,
    precio_3_campo_adicional text,
    precio_3_no_aplica boolean,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text,
    bubble_id text UNIQUE
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_servicios_bubble_id ON public.servicios(bubble_id);
CREATE INDEX IF NOT EXISTS idx_servicios_tipos_bubble_id ON public.servicios_tipos(bubble_id);