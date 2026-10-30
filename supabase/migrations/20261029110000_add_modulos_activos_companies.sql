-- Agrega columna modulos_activos a companies para control de módulos por tenant.
-- NULL = todos los módulos visibles (comportamiento legacy, backwards compat).
-- Array no-null = solo esos módulos habilitados para el tenant.
-- Primer módulo controlado: 'formatos' (Gestión Formatos).

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS modulos_activos TEXT[];

-- Habilitar formatos para CISE y GRUAS (ambos lo usan actualmente).
UPDATE public.companies
SET modulos_activos = ARRAY['formatos']
WHERE id IN (
    '1cb97ec7-326c-4376-93ee-ed317d3da51b', -- CISE
    '6f4c923a-c3b7-47c2-9dea-2a187f274f73'  -- GRUAS
);
