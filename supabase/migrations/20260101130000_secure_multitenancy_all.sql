-- CONSOLIDATED SECURE MULTITENANCY
-- Target Tables: profiles, profile_details, job_titles, document_types, user_documents

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles - Standard Access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles - Update Self" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all" ON public.profiles; -- Potential old policy

CREATE POLICY "Profiles - Tenant Isolation" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR tenant_id = get_auth_tenant_id()
);

CREATE POLICY "Profiles - Update Self" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 2. PROFILE DETAILS
ALTER TABLE public.profile_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profile Details - Tenant Isolation" ON public.profile_details;
CREATE POLICY "Profile Details - Tenant Isolation" ON public.profile_details
FOR SELECT TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
);

-- 3. JOB TITLES (Cargos)
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Job Titles - Tenant Isolation" ON public.job_titles;
CREATE POLICY "Job Titles - Tenant Isolation" ON public.job_titles
FOR ALL TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- 4. DOCUMENT TYPES
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read access for users in tenant" ON public.document_types;
DROP POLICY IF EXISTS "Insert access for users in tenant" ON public.document_types;
DROP POLICY IF EXISTS "Update access for users in tenant" ON public.document_types;

CREATE POLICY "Document Types - Tenant Isolation" ON public.document_types
FOR ALL TO authenticated
USING (
  tenant_id = get_auth_tenant_id() OR tenant_id IS NULL
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- 5. USER DOCUMENTS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Documents - Tenant Isolation" ON public.user_documents;
CREATE POLICY "User Documents - Tenant Isolation" ON public.user_documents
FOR ALL TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- 6. COMPANIES (Ensuring header logo/name works)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "Companies - View Own" ON public.companies
FOR SELECT TO authenticated
USING (
  id = get_auth_tenant_id()
);
