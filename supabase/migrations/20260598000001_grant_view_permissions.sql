-- Grant permissions for the new view
GRANT SELECT ON public.view_valoraciones_ventas TO authenticated;
GRANT SELECT ON public.view_valoraciones_ventas TO service_role;
GRANT SELECT ON public.view_valoraciones_ventas TO anon;
-- Optional if needed, but usually not for dashboards
-- Ensure RLS doesn't block (Views run as owner usually, unless SECURITY INVOKER)
-- By default views are SECURITY DEFINER (owner's rights) in some Postgres setups OR INVOKER.
-- In Supabase/Postgres 15+, standard views are INVOKER.
-- If INVOKER, user needs SELECT on underlying tables.
-- User HAS access to 'reportes_maquinaria' via RLS? 
-- Let's assume standard RLS is fine. If not, we might need to SECURITY DEFINER the view + set owner to postgres.
-- But first, let's just GRANT SELECT on the view, as that's the most common missing step.
-- Optional: Force owner to postgres to ensure it bypasses RLS if we wanted that (but we want tenant filtering!)
-- So SECURITY INVOKER is correct (default).
-- The issue is likely just the GRANT.