-- FUNCTION: is_admin
-- Purpose: Check if the current authenticated user has administrative privileges.
-- Logic: Returns TRUE if the user's role contains "admin" (e.g., 'reporta_admin', 'admin_tenant').
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
DECLARE current_role app_role;
BEGIN -- 1. Check if user is authenticated
IF auth.uid() IS NULL THEN RETURN FALSE;
END IF;
-- 2. Fetch role from profiles
SELECT role INTO current_role
FROM public.profiles
WHERE id = auth.uid();
-- 3. Return true if role contains "admin"
-- Cast enum to text for loose matching
RETURN current_role::text LIKE '%admin%';
EXCEPTION
WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;