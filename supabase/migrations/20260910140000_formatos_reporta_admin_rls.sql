-- Acceso cross-tenant de solo reporta_admin a Formatos (para reporta-admin app).
-- Aditivo: no reemplaza las policies tenant-scoped existentes (rls_select, rls_insert,
-- rls_update, tenant_isolation_select), que siguen protegiendo el acceso normal desde
-- reportaweb3. Mismo patron que sdt_reporta_admin_only en system_document_templates.

CREATE POLICY "formatos_reporta_admin_all" ON public.formatos
  FOR ALL TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  WITH CHECK ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);

CREATE POLICY "formatos_versiones_reporta_admin_all" ON public.formatos_versiones
  FOR ALL TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  WITH CHECK ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);

CREATE POLICY "formatos_preguntas_reporta_admin_all" ON public.formatos_preguntas
  FOR ALL TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  WITH CHECK ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);

CREATE POLICY "formatos_opciones_reporta_admin_all" ON public.formatos_opciones
  FOR ALL TO authenticated
  USING ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role)
  WITH CHECK ((SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'reporta_admin'::app_role);
