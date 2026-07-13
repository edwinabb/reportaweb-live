-- Migration: Agrega /inspecciones a sistema_recursos y hace seed de cargo_permisos
-- Fecha: 2026-05-06

-- 1. Insertar el nuevo recurso
INSERT INTO public.sistema_recursos (nombre, ruta_base, seccion, orden)
VALUES ('Inspecciones', '/inspecciones', 'Operaciones', 9)
ON CONFLICT (ruta_base) DO NOTHING;

-- 2. Seed cargo_permisos para todos los cargos activos en ambos tenants
DO $seed$
DECLARE
    r_cargo      RECORD;
    v_recurso_id UUID;
BEGIN
    SELECT id INTO v_recurso_id
    FROM public.sistema_recursos
    WHERE ruta_base = '/inspecciones';

    IF v_recurso_id IS NULL THEN
        RETURN;
    END IF;

    FOR r_cargo IN
        SELECT id, tenant_id
        FROM public.job_titles
        WHERE is_active = TRUE
          AND tenant_id IN (
              '1cb97ec7-326c-4376-93ee-ed317d3da51b',  -- CISE
              '6f4c923a-c3b7-47c2-9dea-2a187f274f73'   -- GRUAS
          )
    LOOP
        INSERT INTO public.cargo_permisos
            (tenant_id, cargo_id, recurso_id, puede_ver, puede_ingresar, puede_editar, puede_eliminar)
        VALUES
            (r_cargo.tenant_id, r_cargo.id, v_recurso_id, TRUE, TRUE, TRUE, FALSE)
        ON CONFLICT ON CONSTRAINT cargo_permisos_unique DO NOTHING;
    END LOOP;
END;
$seed$;
