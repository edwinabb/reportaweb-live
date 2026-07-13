-- EPP Fase 5 — Motor de alertas de vencimiento
--
-- Función `generate_epp_alerts` que escanea sst_epp_item y genera alertas
-- pendientes en sst_epp_alerta, actualizando también el estado_vigencia
-- del item.
--
-- Idempotente: gracias al UNIQUE partial index
-- (item_id, nivel) WHERE gestionado = FALSE creado en la migración inicial,
-- un insert duplicado hace no-op (ON CONFLICT DO NOTHING).
--
-- Invocación:
--   - manual: SELECT * FROM generate_epp_alerts();   -- todos los tenants
--   - manual: SELECT * FROM generate_epp_alerts('{tenant_uuid}');
--   - automática: ver bloque pg_cron al final (opcional).

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_epp_alerts(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
    inserted_d30 INT,
    inserted_d15 INT,
    inserted_vencido INT,
    items_marked_vencido INT,
    items_marked_pronto INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inserted_d30 INT := 0;
    v_inserted_d15 INT := 0;
    v_inserted_vencido INT := 0;
    v_items_marked_vencido INT := 0;
    v_items_marked_pronto INT := 0;
BEGIN
    -- 1) Insert alertas VENCIDO para items ya vencidos
    WITH vencidos AS (
        SELECT i.id, i.tenant_id
        FROM public.sst_epp_item i
        WHERE i.estado_vigencia IN ('VIGENTE', 'PRONTO')
          AND i.fecha_vencimiento < CURRENT_DATE
          AND (p_tenant_id IS NULL OR i.tenant_id = p_tenant_id)
    ),
    ins AS (
        INSERT INTO public.sst_epp_alerta (tenant_id, item_id, nivel)
        SELECT tenant_id, id, 'VENCIDO' FROM vencidos
        ON CONFLICT DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_inserted_vencido FROM ins;

    -- 2) Insert alertas D15
    WITH proximos15 AS (
        SELECT i.id, i.tenant_id
        FROM public.sst_epp_item i
        WHERE i.estado_vigencia IN ('VIGENTE', 'PRONTO')
          AND i.fecha_vencimiento >= CURRENT_DATE
          AND i.fecha_vencimiento <= CURRENT_DATE + INTERVAL '15 days'
          AND (p_tenant_id IS NULL OR i.tenant_id = p_tenant_id)
    ),
    ins AS (
        INSERT INTO public.sst_epp_alerta (tenant_id, item_id, nivel)
        SELECT tenant_id, id, 'D15' FROM proximos15
        ON CONFLICT DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_inserted_d15 FROM ins;

    -- 3) Insert alertas D30 (entre 16 y 30 días)
    WITH proximos30 AS (
        SELECT i.id, i.tenant_id
        FROM public.sst_epp_item i
        WHERE i.estado_vigencia IN ('VIGENTE', 'PRONTO')
          AND i.fecha_vencimiento > CURRENT_DATE + INTERVAL '15 days'
          AND i.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days'
          AND (p_tenant_id IS NULL OR i.tenant_id = p_tenant_id)
    ),
    ins AS (
        INSERT INTO public.sst_epp_alerta (tenant_id, item_id, nivel)
        SELECT tenant_id, id, 'D30' FROM proximos30
        ON CONFLICT DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_inserted_d30 FROM ins;

    -- 4) Marcar items VENCIDO (después de haber insertado alertas)
    WITH upd AS (
        UPDATE public.sst_epp_item
           SET estado_vigencia = 'VENCIDO'
         WHERE estado_vigencia IN ('VIGENTE', 'PRONTO')
           AND fecha_vencimiento < CURRENT_DATE
           AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_items_marked_vencido FROM upd;

    -- 5) Marcar items PRONTO (≤30 días pero aún no vencidos)
    WITH upd AS (
        UPDATE public.sst_epp_item
           SET estado_vigencia = 'PRONTO'
         WHERE estado_vigencia = 'VIGENTE'
           AND fecha_vencimiento >= CURRENT_DATE
           AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days'
           AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_items_marked_pronto FROM upd;

    RETURN QUERY SELECT v_inserted_d30, v_inserted_d15, v_inserted_vencido, v_items_marked_vencido, v_items_marked_pronto;
END;
$$;

COMMENT ON FUNCTION public.generate_epp_alerts(UUID) IS
    'Escanea sst_epp_item y genera alertas en sst_epp_alerta + actualiza estado_vigencia. Idempotente.';

-- Permitir ejecución desde supabase-js (service role ya tiene acceso, pero dejamos explícito)
GRANT EXECUTE ON FUNCTION public.generate_epp_alerts(UUID) TO service_role;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- OPCIONAL: schedule diaria vía pg_cron
-- Requiere habilitar la extensión pg_cron desde Supabase Dashboard
-- (Database → Extensions → pg_cron → Enable).
--
-- Después correr estos bloques en SQL Editor:
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
--   -- Desagendar anterior si existe (idempotente)
--   SELECT cron.unschedule('epp-alertas-diario')
--     WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'epp-alertas-diario');
--
--   -- Agenda: todos los días a las 10:00 UTC = 05:00 Perú (GMT-5)
--   SELECT cron.schedule(
--       'epp-alertas-diario',
--       '0 10 * * *',
--       $$ SELECT public.generate_epp_alerts() $$
--   );
-- ─────────────────────────────────────────────────────────────
