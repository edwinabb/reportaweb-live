-- Secure Companies RLS for Login/Public Access
-- Recommendation: Allow anonymous access ONLY to active companies.
-- This prevents exposing inactive or deleted tenants while allowing login validation.
-- 1. Drop the overly permissive "true" policy if it exists
DROP POLICY IF EXISTS "companies anon" ON public.companies;
DROP POLICY IF EXISTS "Public Active Companies" ON public.companies;
-- 2. Create the new secure policy
CREATE POLICY "Public Active Companies" ON public.companies FOR
SELECT TO anon USING (is_active = true);
-- Note: Authenticated users/service_role usually have their own policies.
-- Ideally ensure authenticated users also have access (e.g. via is_admin or membership).
-- Assuming transaction/admin policies exist elsewhere.