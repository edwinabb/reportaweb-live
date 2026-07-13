ALTER TABLE public.cotizaciones_configuracion
ADD COLUMN IF NOT EXISTS texto_introduccion TEXT,
ADD COLUMN IF NOT EXISTS texto_notas_precios TEXT,
ADD COLUMN IF NOT EXISTS texto_aceptacion TEXT,
ADD COLUMN IF NOT EXISTS texto_forma_pago_1 TEXT,
ADD COLUMN IF NOT EXISTS texto_forma_pago_2 TEXT,
ADD COLUMN IF NOT EXISTS imagen_banco_url TEXT,
ADD COLUMN IF NOT EXISTS firma_autorizada_usuario_id UUID,
ADD COLUMN IF NOT EXISTS firma_imagen_url TEXT;

COMMENT ON COLUMN public.cotizaciones_configuracion.texto_introduccion IS 'Introductory text for the quote';
COMMENT ON COLUMN public.cotizaciones_configuracion.texto_notas_precios IS 'Default text for price notes';
COMMENT ON COLUMN public.cotizaciones_configuracion.texto_aceptacion IS 'Text for offer acceptance section';
COMMENT ON COLUMN public.cotizaciones_configuracion.texto_forma_pago_1 IS 'First block of payment terms';
COMMENT ON COLUMN public.cotizaciones_configuracion.texto_forma_pago_2 IS 'Second block of payment terms';
COMMENT ON COLUMN public.cotizaciones_configuracion.imagen_banco_url IS 'URL for the bank accounts image';
COMMENT ON COLUMN public.cotizaciones_configuracion.firma_autorizada_usuario_id IS 'User ID of the authorized signer';
COMMENT ON COLUMN public.cotizaciones_configuracion.firma_imagen_url IS 'URL for the signature image';
