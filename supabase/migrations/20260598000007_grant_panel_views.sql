-- Grant Permissions for Sales Panel Views
-- Problem: Panel uses different views than the Valuation page. Those views likely lack permissions.
-- Views: view_ventas_pendiente_valorizar, view_ventas_pendientes_facturar
GRANT SELECT ON public.view_ventas_pendiente_valorizar TO authenticated;
GRANT SELECT ON public.view_ventas_pendientes_facturar TO authenticated;
GRANT SELECT ON public.view_ventas_pendiente_valorizar TO service_role;
GRANT SELECT ON public.view_ventas_pendientes_facturar TO service_role;
-- Also verify they work.
-- If these views rely on RLS-protected tables, the generic RLS fix should cover them IF the view is INVOKER.
-- If DEFIENER, it runs as owner.