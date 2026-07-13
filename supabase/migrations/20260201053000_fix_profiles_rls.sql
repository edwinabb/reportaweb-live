-- Fix Profiles RLS
-- Problem: Users cannot see their own profile data (name, tenant link) in the UI.
-- Solution: Add explicit policies for fetching own profile and profiles within the same tenant.
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can see profiles in own tenant" ON public.profiles;
DROP POLICY IF EXISTS "Read access for authenticated users" ON public.profiles;
-- 1. See Own Profile (Critical for Login/Header)
CREATE POLICY "Users can see own profile" ON public.profiles FOR
SELECT TO authenticated USING (auth.uid() = id);
-- 2. See Profiles in Same Tenant (Using Helper Function)
CREATE POLICY "Users can see profiles in own tenant" ON public.profiles FOR
SELECT TO authenticated USING (
        tenant_id::text = get_auth_tenant_id()::text
        OR is_admin() -- Admins allow all
    );
-- Note: 'profiles' table usually has tenant_id.
-- Ensure get_auth_tenant_id() is accessible (it is).