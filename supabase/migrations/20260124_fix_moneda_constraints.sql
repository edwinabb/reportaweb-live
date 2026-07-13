-- Migration to remove strict CHECK constraints on currency fields
-- This allows transitioning to UUIDs from precios_monedas table
-- 1. Servicios
ALTER TABLE public.servicios DROP CONSTRAINT IF EXISTS servicios_moneda_check;
-- 2. Cotizaciones
ALTER TABLE public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_moneda_check;
-- 3. Tasas de Cambio
ALTER TABLE public.tasas_cambio DROP CONSTRAINT IF EXISTS tasas_cambio_moneda_origen_check;
ALTER TABLE public.tasas_cambio DROP CONSTRAINT IF EXISTS tasas_cambio_moneda_destino_check;
-- Note: We keep columns as TEXT to support existing data and transition IDs.
-- In the future, these can be changed to UUID referencing public.precios_monedas(id).