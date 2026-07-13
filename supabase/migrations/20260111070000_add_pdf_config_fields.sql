ALTER TABLE public.cotizaciones_configuracion
ADD COLUMN IF NOT EXISTS forma_pago1 TEXT,
ADD COLUMN IF NOT EXISTS forma_pago2 TEXT,
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS despedida TEXT,
ADD COLUMN IF NOT EXISTS mostrar_firma BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.cotizaciones_configuracion.forma_pago1 IS 'Default Billing Terms for new quotes';

COMMENT ON COLUMN public.cotizaciones_configuracion.banco IS 'Default Bank Info for new quotes';
COMMENT ON COLUMN public.cotizaciones_configuracion.despedida IS 'Default sign-off for new quotes';
