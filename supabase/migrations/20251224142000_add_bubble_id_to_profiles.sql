
-- Migration: Add bubble_id to profiles for audit mapping
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS bubble_id TEXT;

-- Add index for fast lookups during migration
CREATE INDEX IF NOT EXISTS idx_profiles_bubble_id ON public.profiles(bubble_id);

COMMENT ON COLUMN public.profiles.bubble_id IS 'ID original del usuario en Bubble para vinculación de auditoría.';
