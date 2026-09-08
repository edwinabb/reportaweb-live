-- Recorrido Fases 1-5: agregar UNIQUE(bubble_id) donde faltaba, para poder hacer
-- delta-sync idempotente. profiles y servicios ya lo tenian (indice unico sin
-- nombre de constraint formal, detectado via pg_indexes). areas/plazos_pago
-- nunca lo tuvieron. bancos no tenia ni la columna (tabla nunca usada).

ALTER TABLE areas ADD CONSTRAINT areas_bubble_id_key UNIQUE (bubble_id);
ALTER TABLE plazos_pago ADD CONSTRAINT plazos_pago_bubble_id_key UNIQUE (bubble_id);
ALTER TABLE bancos ADD COLUMN IF NOT EXISTS bubble_id text;
ALTER TABLE bancos ADD CONSTRAINT bancos_bubble_id_key UNIQUE (bubble_id);
