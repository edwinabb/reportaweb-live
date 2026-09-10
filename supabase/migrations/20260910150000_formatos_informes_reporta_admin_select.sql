-- Acceso cross-tenant de solo lectura (SELECT) para reporta_admin sobre
-- formatos_informes, para mostrar el conteo de informes por formato en el
-- listado cross-tenant de reporta-admin. Deliberadamente SOLO SELECT (no ALL
-- como en formatos/formatos_versiones/formatos_preguntas/formatos_opciones,
-- migracion 20260910140000) -- es dato operativo real (informes de campo),
-- no solo plantillas, y reporta-admin no necesita editarlo.
-- Aditivo: no reemplaza las policies tenant-scoped existentes.

CREATE POLICY "formatos_informes_reporta_admin_select" ON public.formatos_informes
  FOR SELECT TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);
