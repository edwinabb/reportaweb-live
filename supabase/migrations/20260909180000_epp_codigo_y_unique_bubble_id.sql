-- Módulo EPP: agrega la columna `codigo` que Bubble sí traía (sst_epp_info1.codigo) y no
-- existía en el schema, y agrega UNIQUE(bubble_id) a sst_epp_entrega/sst_epp_item para poder
-- hacer upsert idempotente por bubble_id (mismo patrón que el resto de tablas migradas).
-- Ya aplicada manualmente en TEST (oyrokyyaeaeqzlsgxtto) y PROD (fqwhagryqkkhbgznxtwf) el
-- 2026-09-09 como parte de la migración de datos EPP de GRUAS. Ver
-- docs/auditoria-ui/08-epp.md.

ALTER TABLE sst_epp_config ADD COLUMN IF NOT EXISTS codigo text;

ALTER TABLE sst_epp_entrega ADD CONSTRAINT sst_epp_entrega_bubble_id_key UNIQUE (bubble_id);
ALTER TABLE sst_epp_item ADD CONSTRAINT sst_epp_item_bubble_id_key UNIQUE (bubble_id);
