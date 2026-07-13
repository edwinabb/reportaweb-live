
-- Migration: Add unique constraints to catalog tables for idempotent migration
ALTER TABLE public.rubros ADD CONSTRAINT rubros_tenant_nombre_unique UNIQUE (tenant_id, nombre);
ALTER TABLE public.plazos_pago ADD CONSTRAINT plazos_pago_tenant_nombre_unique UNIQUE (tenant_id, nombre);
ALTER TABLE public.formas_pago ADD CONSTRAINT formas_pago_tenant_nombre_unique UNIQUE (tenant_id, nombre);
ALTER TABLE public.job_titles ADD CONSTRAINT job_titles_tenant_name_unique UNIQUE (tenant_id, name);
ALTER TABLE public.areas ADD CONSTRAINT areas_tenant_name_unique UNIQUE (tenant_id, name);

-- Ensure cotizaciones_configuracion has a unique constraint on tenant_id
ALTER TABLE public.cotizaciones_configuracion ADD CONSTRAINT cotizaciones_config_tenant_unique UNIQUE (tenant_id);
