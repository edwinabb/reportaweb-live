-- Add missing columns to tareas table to support application logic
ALTER TABLE public.tareas 
ADD COLUMN IF NOT EXISTS cliente_nombre TEXT,
ADD COLUMN IF NOT EXISTS sitio TEXT,
ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES public.terceros_contactos(id);

-- Add index for contacto_id
CREATE INDEX IF NOT EXISTS idx_tareas_contacto ON public.tareas(contacto_id);

-- No RLS update needed as existing policies cover the table rows
