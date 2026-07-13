
-- Add geolocation columns to terceros_sitios
ALTER TABLE public.terceros_sitios 
ADD COLUMN IF NOT EXISTS latitud NUMERIC,
ADD COLUMN IF NOT EXISTS longitud NUMERIC;
