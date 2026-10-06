# Plan — P-005 Backfill de `cobros_venta` para CISE

**Fecha:** 2026-09-26 · **Autor:** análisis desde este chat (no ejecutado sin aprobación)

## Contexto (verificado hoy contra PROD)

`docs/auditoria-ui/residuales-pagos-facturacion.md` (10-sep) detectó que
`cobros_venta` está vacía en PROD y los pagos migrados quedaron en
`factura_venta_pagos` (staging), que la app **nunca lee**. Los números
verificados hoy contra `fqwhagryqkkhbgznxtwf` siguen iguales:

| Métrica | Valor |
|---|---|
| `cobros_venta` (destino) | 0 filas |
| `factura_venta_pagos` (staging) | **521 filas**, todas de CISE |
| Filas listas para backfill directo | **513** (99%) |
| Filas huérfanas (FK a `facturas_venta`) | **0** |
| Cobertura del backfill sobre `facturas_venta` de CISE | 465 de 1.410 (33%) |
| Rango temporal | 2022-07-08 → 2024-10-15 |
| Tipos de pago | TRANSFER (416) · FACTORING (93) · NOTA DE CRÉDITO (12) |
| Moneda | USD (única — pero cada fila tiene `monto_sol` y `monto_usd`) |
| Pagos migrados de GRUAS | **0** (staging vacío para GRUAS) |

## Divide y vencerás

- **Lo que puede hacerse sin Bubble** — backfill de los 513 pagos válidos de
  CISE desde staging a `cobros_venta`. Es un `INSERT ... SELECT` puro en SQL
  con mapeo de columnas. Los otros 8 (edge cases) se documentan y se dejan
  para revisión manual.
- **Lo que necesita Bubble** — la migración de los pagos de **GRUAS** (ninguno
  fue extraído del origen en su momento) y la migración de `bancos` (Hallazgo 3).

Este plan cubre solo la primera parte. La segunda queda como P-005-B, con
dependencias en `docs/pendientes_por_resolver.md`.

## Mapeo de columnas (staging → destino)

| `cobros_venta` (NOT NULL salvo mención) | Origen desde `factura_venta_pagos` |
|---|---|
| `id` uuid | `gen_random_uuid()` (nuevo id) |
| `factura_venta_id` uuid | `factura_venta_id` (ya validado, 0 huérfanas) |
| `tenant_id` uuid | `tenant_id` (todos CISE) |
| `fecha_cobro` date | `fecha_cobro::date` (staging tiene timestamp) |
| `monto` numeric | `CASE moneda WHEN 'USD' THEN monto_usd ELSE monto_sol END` |
| `moneda` text | `moneda` (todos 'USD') |
| `tipo` text | `tipo_pago` |
| `banco_id` uuid NULLABLE | **NULL** (bancos vacía; texto original va a `comentarios`) |
| `comentarios` text NULLABLE | `COALESCE(comentarios, '') \|\| CASE WHEN banco IS NOT NULL THEN ' [Banco: ' \|\| banco \|\| ']' ELSE '' END` (para preservar la info textual) |
| `is_active` boolean | `TRUE` |
| `created_at` timestamp | `COALESCE(created_at, fecha_cobro, now())` |
| `created_by` uuid NULLABLE | **NULL** (staging guarda text, no uuid) |
| `updated_at` timestamp NULLABLE | `updated_at` |
| `updated_by` uuid NULLABLE | `updated_by` |

## Idempotencia

El backfill se ejecuta contra una tabla vacía (0 filas hoy), así que no hay
riesgo de duplicados en la primera corrida. Para re-corridas, si alguna vez
se necesitan, filtrar por `WHERE NOT EXISTS (SELECT 1 FROM cobros_venta cv
WHERE cv.factura_venta_id = p.factura_venta_id AND cv.fecha_cobro =
p.fecha_cobro::date AND cv.monto = ...)`.

## SQL propuesto (NO ejecutar sin aprobar)

```sql
BEGIN;

-- Backfill de los 513 pagos válidos de CISE desde el staging.
-- Los 8 restantes (1 sin monto, edge cases) quedan fuera y se anotan.
INSERT INTO cobros_venta (
  id, factura_venta_id, tenant_id, fecha_cobro, monto, moneda, tipo,
  banco_id, comentarios, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  p.factura_venta_id,
  p.tenant_id,
  p.fecha_cobro::date,
  CASE p.moneda
    WHEN 'USD' THEN p.monto_usd
    WHEN 'SOL' THEN p.monto_sol
    ELSE COALESCE(p.monto_usd, p.monto_sol)
  END AS monto,
  p.moneda,
  p.tipo_pago,
  NULL::uuid AS banco_id,
  COALESCE(p.comentarios, '')
    || CASE WHEN p.banco IS NOT NULL AND p.banco <> ''
            THEN ' [Banco (Bubble): ' || p.banco || ']'
            ELSE '' END,
  TRUE,
  COALESCE(p.created_at, p.fecha_cobro, now()),
  p.updated_at
FROM factura_venta_pagos p
WHERE p.factura_venta_id IS NOT NULL
  AND p.tenant_id IS NOT NULL
  AND p.fecha_cobro IS NOT NULL
  AND p.moneda IS NOT NULL
  AND p.tipo_pago IS NOT NULL
  AND (
    (p.moneda = 'USD' AND COALESCE(p.monto_usd, 0) > 0)
    OR (p.moneda = 'SOL' AND COALESCE(p.monto_sol, 0) > 0)
    OR COALESCE(p.monto_usd, 0) > 0
    OR COALESCE(p.monto_sol, 0) > 0
  );

-- Verificaciones (deben devolver 513, 465, 0):
SELECT COUNT(*) AS insertadas FROM cobros_venta;
SELECT COUNT(DISTINCT factura_venta_id) AS facturas_con_cobro FROM cobros_venta;
SELECT COUNT(*) AS con_banco FROM cobros_venta WHERE banco_id IS NOT NULL;

-- Si todo OK: COMMIT; si algo raro: ROLLBACK;
-- COMMIT;
```

## Efecto esperado en la UI

Después del backfill:

- CISE: 465 de 1.410 facturas de venta pasan a mostrar cobro parcial/total.
  El `monto_pagado_factura` derivado por `lib/actions/ventas.ts` líneas 843+
  refleja el total.
- Los 8 pagos no migrados quedan en `factura_venta_pagos` (staging) pero no
  se ven en la app — documentar en `pendientes_por_resolver.md § P-005`.
- GRUAS: sigue con 0 cobros (no cambia, no había en staging tampoco).
- `banco_id` queda NULL para los 513: el nombre de banco original se preserva
  entre corchetes en `comentarios`, listo para relinkear cuando se migre
  `bancos`.

## Riesgos

- **Cambio destructivo/irreversible en PROD** — un INSERT masivo de 513 filas
  en `cobros_venta`, tabla observada por la app en cada carga del módulo
  Ventas. Rollback: `DELETE FROM cobros_venta WHERE created_at BETWEEN ...`
  (por eso el `INSERT` fija `created_at` desde `p.fecha_cobro`, para que sea
  distinto de cualquier cobro genuino posterior). Mejor: correr dentro de
  transacción, revisar counts, y solo entonces `COMMIT`.
- **Asimetría CISE vs GRUAS agravada** — CISE queda con cobros, GRUAS
  completamente sin. Es peor la asimetría visible que la actual (ambos en 0),
  pero refleja el estado real de la migración. Debe cerrarse pronto con el
  fetch de Bubble para GRUAS.
- **Info de banco textual dentro de comentarios** — no ideal, pero es la
  única forma de no perderla hasta que `bancos` se migre. Al migrar
  `bancos`, se puede hacer un update que parsee `comentarios` para
  extraer el nombre y linkear `banco_id`.

## Qué NO hace este plan (P-005-B, requiere Bubble)

1. Migrar los pagos de venta de GRUAS (no están en staging, hay que extraerlos
   de Bubble).
2. Verificar contra Bubble la cobertura de `facturas_compra_pagos` (22 filas,
   1,4% cobertura — puede ser gap de migración o real).
3. Migrar `bancos` (0 filas hoy) para poder linkear `banco_id` de los cobros
   y para desbloquear el formulario de "Registrar cobro" en la UI.
4. Confirmar en Bubble si GRUAS tuvo alguna vez `valorizaciones` separadas
   de la factura (hoy tiene 0, CISE tiene 752).

## Decisiones pendientes

- ¿Ejecuto el SQL de arriba contra PROD ahora, o esperamos a tener los
  bancos y pagos de GRUAS listos para hacer todo junto en una sola ventana
  de mantenimiento?
- Si se ejecuta ahora, ¿comunicamos a CISE que sus cobros históricos ya se
  ven en el nuevo sistema? (Van a notarlo la próxima vez que entren.)
