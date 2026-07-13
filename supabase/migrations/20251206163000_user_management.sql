
-- ENUMS
CREATE TYPE app_role AS ENUM ('reporta_admin', 'admin_tenant', 'supervisor', 'member');
CREATE TYPE doc_type AS ENUM ('DNI', 'CE', 'PASSPORT', 'RUC', 'OTHER');

-- FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    -- Try to get the user ID, default to null if not available (e.g., migration)
    BEGIN
        NEW.updated_by = auth.uid();
    EXCEPTION WHEN OTHERS THEN
        NEW.updated_by = null;
    END;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION set_created_by_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to get the user ID, default to null if not available
    BEGIN
        NEW.created_by = auth.uid();
    EXCEPTION WHEN OTHERS THEN
        NEW.created_by = null;
    END;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- BASE TABLE: COMPANIES (Tenants)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ruc TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

-- CATALOGS (Job Titles, Areas, Branches)
CREATE TABLE public.job_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

CREATE TABLE public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

-- MAIN TABLE: PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.companies(id), -- Nullable initially to allow signup before assignment, or enforce if invite-only
    role app_role DEFAULT 'member',
    email TEXT,
    doc_number TEXT,
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

-- EXTENSION TABLE: PROFILE DETAILS
CREATE TABLE public.profile_details (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    middle_name TEXT,
    second_last_name TEXT,
    doc_type doc_type DEFAULT 'DNI',
    nationality TEXT,
    birth_date DATE,
    photo_url TEXT,
    signature_url TEXT,
    job_title_id UUID REFERENCES public.job_titles(id),
    area_id UUID REFERENCES public.areas(id),
    branch_id UUID REFERENCES public.branches(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

-- TEAMS SYSTEM
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    leader_id UUID REFERENCES public.profiles(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.companies(id) NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_type TEXT DEFAULT 'standard', -- 'standard' or 'assistant'
    joined_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

-- APPLY TRIGGERS (Auto-update audit fields)
-- Helper macro not available, so repeating trigger application
CREATE TRIGGER update_companies_modtime BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_job_titles_modtime BEFORE UPDATE ON public.job_titles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_areas_modtime BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_branches_modtime BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_profile_details_modtime BEFORE UPDATE ON public.profile_details FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teams_modtime BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_team_members_modtime BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS (Row Level Security) - Basic Multitenancy
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- EXAMPLE POLICY (You can refine these later)
-- "Users can view data from their own tenant"
-- Requires a helper function to get current user's tenant, avoiding infinite recursion on profiles
