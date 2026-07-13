-- Fix RLS: habilitar ENABLE ROW LEVEL SECURITY en tablas EPP y reportes_usuario.
--
-- Contexto:
--   Las políticas rls_select/insert/update con tenant isolation ya existían en producción
--   (aplicadas directamente en Studio, no vía migrations). Lo que faltaba era el
--   ENABLE ROW LEVEL SECURITY en las 5 tablas sst_epp_* — sin él, las políticas
--   existentes no tenían efecto.
--
--   reportes_usuario, maquinaria_documentos y maquinaria_tipos_docs ya tenían
--   RLS habilitado + rls_* policies correctas en prod. Los DROP/CREATE de esta
--   migration son idempotentes (IF EXISTS / IF NOT EXISTS).
--
-- Estado final esperado: todas las tablas con rowsecurity=true + rls_select/insert/update.

ALTER TABLE public.sst_epp_entrega    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_epp_item       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_epp_movimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_epp_alerta     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_epp_reporte    ENABLE ROW LEVEL SECURITY;

-- Limpiar la política permisiva original de reportes_usuario (USING true).
-- Si ya fue reemplazada por rls_select en prod, este DROP es no-op.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.reportes_usuario;
