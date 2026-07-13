-- FUNCTION: get_auth_tenant_id
-- Purpose: Securely retrieve the tenant_id for the current auth user, bypassing RLS recursion.
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_tenant_id() TO service_role;

-- UPDATE POLICIES FOR document_types
-- Drop existing policies to replace them with secure ones
DROP POLICY IF EXISTS "Read access for authenticated users" ON public.document_types; -- Old/Global
DROP POLICY IF EXISTS "Read access for users in tenant" ON public.document_types;
DROP POLICY IF EXISTS "Insert access for users in tenant" ON public.document_types;
DROP POLICY IF EXISTS "Update access for users in tenant" ON public.document_types;
DROP POLICY IF EXISTS "Soft delete access for users in tenant" ON public.document_types;

-- 1. Read Policy (Select)
CREATE POLICY "Read access for users in tenant" ON public.document_types
FOR SELECT
TO authenticated
USING (
  -- Allow if global (null user) OR global (null tenant) OR tenant matches
  -- Note: existing data might have null created_by for seeds.
  tenant_id IS NULL 
  OR tenant_id = get_auth_tenant_id()
);

-- 2. Insert Policy
CREATE POLICY "Insert access for users in tenant" ON public.document_types
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- 3. Update Policy
CREATE POLICY "Update access for users in tenant" ON public.document_types
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- 4. Delete Policy (Soft Delete updates is_active)
-- Actually soft delete is an UPDATE, but if we have DELETE policy:
CREATE POLICY "Delete access for users in tenant" ON public.document_types
FOR DELETE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
);
