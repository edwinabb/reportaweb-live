-- FIX PROFILES RLS FOR UPDATE
-- Allow editing profiles within the same tenant

DROP POLICY IF EXISTS "Profiles - Tenant Isolation" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - Update Self" ON public.profiles;

CREATE POLICY "Profiles - Tenant Isolation - Select" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR tenant_id = get_auth_tenant_id()
);

-- Crucial: Allow UPDATE for any profile in the same tenant
CREATE POLICY "Profiles - Tenant Isolation - Update" ON public.profiles
FOR UPDATE TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- Ensure DELETE (if ever used) also respects tenant
CREATE POLICY "Profiles - Tenant Isolation - Delete" ON public.profiles
FOR DELETE TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
);
