-- Fix Companies RLS for Authenticated Users
-- Problem: Authenticated users lost access to 'companies' table because we removed the permissive "anon" policy without replacing it for them.
-- Solution: Add a policy allowing Authenticated users to see their own company (or all active ones).
-- Option A: Authenticated users can see ALL active companies (like Anon).
-- This is simplest and ensures profile joins work smoothly.
CREATE POLICY "Authenticated Active Companies" ON public.companies FOR
SELECT TO authenticated USING (is_active = true);
-- Option B: Keep it stricter (only their own tenant).
-- CREATE POLICY "User Tenant Access" ON public.companies ... USING (id = get_auth_tenant_id());
-- But since Anon can see all active companies (for login), it makes no sense to restrict Authenticated users more than Anon.
-- So Option A is logical and safe.
-- Also ensure Profiles is readable by self (standard, likely already exists but let's be sure).
-- Checking if we need to touch profiles. Usually not unless we broke it.