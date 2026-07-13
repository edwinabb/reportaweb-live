-- Migration: Update app_role enum with new roles
-- Target: 'reporta_admin', 'admin_tenant', 'planner', 'viewer', 'customer', 'supervisor', 'member'
-- Note: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block in some contexts.
-- If this script fails in a transaction, it might need to be run manually or separated.
DO $$ BEGIN -- Add 'planner' after 'admin_tenant'
IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'planner'
        AND enumtypid = 'public.app_role'::regtype
) THEN ALTER TYPE public.app_role
ADD VALUE 'planner'
AFTER 'admin_tenant';
END IF;
-- Add 'viewer' after 'planner'
IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'viewer'
        AND enumtypid = 'public.app_role'::regtype
) THEN ALTER TYPE public.app_role
ADD VALUE 'viewer'
AFTER 'planner';
END IF;
-- Add 'customer' after 'viewer' (or before supervisor, as requested)
IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'customer'
        AND enumtypid = 'public.app_role'::regtype
) THEN ALTER TYPE public.app_role
ADD VALUE 'customer'
AFTER 'viewer';
END IF;
-- Ensuring 'supervisor' and 'member' exist (already do)
END $$;