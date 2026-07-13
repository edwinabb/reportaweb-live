-- Utilidad para check-pre-cutover: verifica existencia de un trigger por nombre.
-- Necesario porque information_schema.routines no es accesible vía PostgREST.
CREATE OR REPLACE FUNCTION public.check_trigger_exists(p_trigger_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = p_trigger_name
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_trigger_exists(TEXT) TO authenticated, service_role;
