
-- Drop old constraints that might interfere with new structure
ALTER TABLE public.servicios DROP CONSTRAINT IF EXISTS servicios_categoria_check;
ALTER TABLE public.servicios DROP CONSTRAINT IF EXISTS servicios_unidad_medida_check;

-- Ensure tipo_servicio has a flexible check if needed, or remove it
ALTER TABLE public.servicios DROP CONSTRAINT IF EXISTS servicios_tipo_servicio_check;

-- Optional: Add a more inclusive one
-- ALTER TABLE public.servicios ADD CONSTRAINT servicios_tipo_servicio_check 
-- CHECK (tipo_servicio IN ('ALQUILER', 'SERVICIO', 'PRODUCTO', 'APOYO LOGISTICO', 'OTROS'));
