-- Map Bubble IDs to existing Companies in Supabase
-- This allows the migration script to filter by tenant_id correctly.
UPDATE public.companies
SET bubble_id = '1596035803087x371442079041323000'
WHERE name = 'CISE PERU SAC';
UPDATE public.companies
SET bubble_id = '1691779382086x534175713862630160'
WHERE name = 'GRUAS DEL PACIFICO S.A.C.';
-- Ensure the column exists and is unique (from previous step 20260201100000)
-- If not yet run, this script will fail until then.