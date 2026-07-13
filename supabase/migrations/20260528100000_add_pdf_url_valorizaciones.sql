-- Add PDF caching columns to valorizaciones
ALTER TABLE public.valorizaciones
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generado_at TIMESTAMPTZ;
