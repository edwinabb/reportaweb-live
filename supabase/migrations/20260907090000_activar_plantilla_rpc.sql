-- RPC atómica para activar una plantilla desactivando la anterior en la misma
-- transacción (fix del final whole-branch review del plan reporta-admin:
-- 2 UPDATEs secuenciales desde la app podían dejar un tenant+tipo sin
-- ninguna plantilla activa si el segundo UPDATE fallaba a mitad de camino,
-- lo cual apaga en silencio la generación de PDFs del bridge de Bubble).
CREATE OR REPLACE FUNCTION public.activar_plantilla(p_id uuid, p_tenant_id uuid, p_tipo text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.system_document_templates
     SET is_active = false, updated_by = p_user_id, updated_at = now()
   WHERE tenant_id = p_tenant_id AND tipo = p_tipo AND is_active = true AND id <> p_id;

  UPDATE public.system_document_templates
     SET is_active = true, updated_by = p_user_id, updated_at = now()
   WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activar_plantilla(uuid, uuid, text, uuid) TO authenticated;
