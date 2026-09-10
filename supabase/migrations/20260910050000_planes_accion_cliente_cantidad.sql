-- Planes de Acción: Bubble tenía id_cliente/cantidad en cada Plan_de_accion, nunca se migraron
-- como columnas propias (TK-PA6, docs/auditoria-ui/10-planes-accion.md). Confirmado que id_cliente
-- NO es el tenant -- son 31 (GRUAS) + 5 (CISE) clientes reales distintos, ya migrados en `terceros`.
-- Backfill aplicado el 2026-09-10 vía scripts/backfill-planes-accion-cliente-cantidad.ts
-- (434/434 filas, 0 huérfanos de cliente; cantidad no existe en el origen para CISE, esperado).

ALTER TABLE planes_accion ADD COLUMN IF NOT EXISTS cliente_id uuid;
ALTER TABLE planes_accion ADD COLUMN IF NOT EXISTS cantidad integer;
