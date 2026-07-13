-- profile_detail2 (columnas en profiles) + gastos_usuario (tabla nueva)
--
-- Contexto (2026-04-15):
--   - Bubble `profile_detail2` (114 CISE + 203 GRUAS = ~317) es data suplementaria
--     1:1 con `user` (= profiles): birthday, dirección, contacto de emergencia.
--     `profiles` ya tiene `gender` y `phone`, no duplicar.
--   - Bubble `usuario_gastos` (3,277 CISE, ~0 GRUAS) es un log de gastos diarios
--     por inspección: desayuno, almuerzo, cena, movilidad, otro, total.

BEGIN;

-- ─── 1) Columnas nuevas en profiles (desde profile_detail2) ─────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS birthday DATE,
    ADD COLUMN IF NOT EXISTS direccion TEXT,
    ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre TEXT,
    ADD COLUMN IF NOT EXISTS contacto_emergencia_celular TEXT,
    ADD COLUMN IF NOT EXISTS contacto_emergencia_parentesco TEXT;

-- ─── 2) gastos_usuario (tabla nueva) ────────────────────────────────────
-- Cada record = 1 día de gastos de un usuario ligado a una inspección.
-- id_informe en Bubble apunta a `informes` (= inspecciones en Supabase).
-- id_pregunta en Bubble apunta a una pregunta de formato (no normalizada,
-- se guarda como TEXT ref para eventual resolución).
CREATE TABLE IF NOT EXISTS public.gastos_usuario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    bubble_id TEXT,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    inspeccion_id UUID REFERENCES public.inspecciones(id) ON DELETE SET NULL,
    pregunta_bubble_id TEXT,
    desayuno NUMERIC(10,2) DEFAULT 0,
    almuerzo NUMERIC(10,2) DEFAULT 0,
    cena NUMERIC(10,2) DEFAULT 0,
    movilidad NUMERIC(10,2) DEFAULT 0,
    otro NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT gastos_usuario_tenant_bubble_key UNIQUE (tenant_id, bubble_id)
);

CREATE INDEX IF NOT EXISTS idx_gastos_usuario_tenant ON public.gastos_usuario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gastos_usuario_profile ON public.gastos_usuario(profile_id);
CREATE INDEX IF NOT EXISTS idx_gastos_usuario_inspeccion ON public.gastos_usuario(inspeccion_id);

ALTER TABLE public.gastos_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.gastos_usuario;
CREATE POLICY "tenant_isolation" ON public.gastos_usuario
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

COMMIT;
