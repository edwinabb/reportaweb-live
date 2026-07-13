-- Add bubble_id to terceros tables for migration tracking

-- Terceros
ALTER TABLE public.terceros ADD COLUMN IF NOT EXISTS bubble_id TEXT;
CREATE INDEX IF NOT EXISTS idx_terceros_bubble_id ON public.terceros(bubble_id);
ALTER TABLE public.terceros ADD CONSTRAINT uk_terceros_bubble_id UNIQUE (bubble_id);

-- Terceros Contactos
ALTER TABLE public.terceros_contactos ADD COLUMN IF NOT EXISTS bubble_id TEXT;
CREATE INDEX IF NOT EXISTS idx_terceros_contactos_bubble_id ON public.terceros_contactos(bubble_id);
ALTER TABLE public.terceros_contactos ADD CONSTRAINT uk_terceros_contactos_bubble UNIQUE (bubble_id);

-- Terceros Sitios
ALTER TABLE public.terceros_sitios ADD COLUMN IF NOT EXISTS bubble_id TEXT;
CREATE INDEX IF NOT EXISTS idx_terceros_sitios_bubble_id ON public.terceros_sitios(bubble_id);
ALTER TABLE public.terceros_sitios ADD CONSTRAINT uk_terceros_sitios_bubble UNIQUE (bubble_id);

-- Terceros Personal
ALTER TABLE public.terceros_personal ADD COLUMN IF NOT EXISTS bubble_id TEXT;
CREATE INDEX IF NOT EXISTS idx_terceros_personal_bubble_id ON public.terceros_personal(bubble_id);
ALTER TABLE public.terceros_personal ADD CONSTRAINT uk_terceros_personal_bubble UNIQUE (bubble_id);
