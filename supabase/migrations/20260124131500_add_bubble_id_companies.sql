ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS bubble_id text UNIQUE;