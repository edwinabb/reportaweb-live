# Pendientes por resolver — Campos con comportamiento inesperado
**Uso:** Revisar uno a uno con el desarrollador antes del cutover.

---

## P-001 · `terceros.logo_url` — Script reportó "Rows with URL: 0" en Bubble

| Campo | Detalle |
|-------|---------|
| **Tabla Supabase** | `terceros` |
| **Columna** | `logo_url` |
| **Script** | `migrate-files-to-storage.ts --table=terceros_logo` |
| **Evidencia** | Log 2026-05-23: `Rows with URL: 0 / Pending: 0` — terminó en 2 segundos |
| **Causa raíz** | `migrate-terceros-bubble.ts` leía `t.logo` pero el campo Bubble se llama `logo_url` (tipo file). Nunca se pobló `terceros.logo_url` en Supabase. |
| **Resultado** | CISE: 247 logos migrados ✅. GRUAS: 1 tercero tenía texto placeholder en lugar de URL — sin logo real. |
| **Estado** | ✅ Resuelto |

---

## P-002 · `facturas_venta.pdf_factura_url` — Sin poblar

| Campo | Detalle |
|-------|---------|
| **Tabla** | `facturas_venta` |
| **Columna** | `pdf_factura_url` |
| **Columnas OK** | `facturas_venta.pdf_valorizacion` ✅ (2,610 filas — fixDbFromLog), `facturas_compra.pdf_factura` ✅ (1,235), `facturas_compra.pdf_valorizacion` ✅ (1,264) |
| **Resultado** | CISE: 716 PDFs ✅. GRUAS: 1,434 PDFs ✅. Total: 2,150 migrados, 0 errores. |
| **Script** | `patch-facturas-venta-pdf.ts` — campo Bubble: `pdf_factura`. Integrado en fase `patches` del orchestrator. |
| **Estado** | ✅ Resuelto |

---

## P-003 · `reportes_maquinaria` — `valorizacion_compra` y `valorizacion_venta` como Bubble IDs

| Campo | Detalle |
|-------|---------|
| **Tabla** | `reportes_maquinaria` |
| **Columnas** | `valorizacion_compra` (TEXT), `valorizacion_venta` (TEXT) |
| **Evidencia** | Contienen strings tipo `1705956236024x111563751262257150` — Bubble IDs, no UUIDs de Supabase |
| **Afectados** | GRUAS: 8,465 / 15,462 registros. CISE: 269 / 4,376 registros |
| **Estado app** | App móvil NO usa valorizaciones ✅ |
| **Estado web** | Analizado 2026-05-23. Los IDs son `facturas_compra/venta.bubble_id` — semántica diferente al nuevo sistema. |
| **Resolución** | Sin fix necesario. Paradigma cambió: Bubble = ID de factura ya existente; nuevo web = código de lote previo a factura. Reportes históricos quedan "congelados" como VALORADO, no reingresables al flujo nuevo (correcto). Único efecto: mensajes de error muestran Bubble ID crudo si alguien intenta re-valorizar (UX menor, no es blocker). |
| **Estado** | ✅ Resuelto — comportamiento esperado por cambio de paradigma |

---

## P-004 · `maquinarias.foto_url` — 5.6% cobertura

| Campo | Detalle |
|-------|---------|
| **Tabla** | `maquinarias` |
| **Columna** | `foto_url` |
| **Evidencia** | 15/267 maquinarias con foto (5.6%) |
| **Conclusión** | ✅ Confirmado en Bubble: solo 15 maquinarias tenían foto cargada. Dato correcto. |
| **Estado** | ✅ Resuelto — sin acción |

---

## P-005 · Ventas/Compras — pagos, bancos y valorizaciones sin migrar o sin confirmar — 🔴 Pendiente confirmar en Bubble (2026-09-10)

| Campo | Detalle |
|-------|---------|
| **`cobros_venta` (Ventas)** | 0 filas en PROD, tabla que la app realmente lee. Pagos migrados quedaron en `factura_venta_pagos` (521 filas), nunca leída por el código. 0 de 3.130 `facturas_venta` muestran algún pago registrado. |
| **`facturas_compra_pagos` (Compras)** | Sí es la tabla correcta (tiene `bubble_id`), pero solo 20/1.473 facturas (1,4%) tienen pago — nunca verificado contra una cifra real de Bubble. |
| **`bancos`** | 0 filas en TODO el sistema (ningún tenant). Nunca migrada — bloquea registrar cobros nuevos, no solo el histórico. |
| **`valorizaciones`** | 752 filas, 100% de CISE — GRUAS tiene 0, a pesar de ser el tenant con más facturación real. Asimetría sin explicación documentada. 0 filas de Compra en todo el sistema (todas son Venta). |
| **Detalle completo** | `docs/auditoria-ui/residuales-pagos-facturacion.md` |
| **Estado** | 🔴 Abierto — pendiente confirmar en Bubble (`reporta.la`, tenant GRUAS) los 4 puntos antes de decidir backfill/migración. |

## Cómo revisar

Para cada pendiente, verificar directamente en el panel de Bubble:
1. Ir al tipo de dato correspondiente
2. Ver el nombre exacto del campo y su tipo
3. Ver si tiene datos en registros reales de CISE/GRUAS
4. Actualizar este archivo con la conclusión y acción a tomar

## P-006 · `profiles.role` — perfiles de Bubble nunca mapeados — 🟢 Resuelto (2026-09-13)

| Campo | Detalle |
|---|---|
| **Hallazgo** | En Bubble cada usuario tiene perfil AdminEmpresa / AdminSistema / Colaborador / Gestor / Integrante / Proveedor (Opciones Internas → Usuarios Interno). La migración (`scripts/sync-fase1-usuarios.ts`) no lo mapea: GRUAS quedó con 236 `member` + 1 `reporta_admin` y **0 `admin_tenant`**; CISE con 1 `admin_tenant`. |
| **Impacto** | Al cutover nadie de GRUAS podía administrar usuarios/configuración. |
| **Acción** | Mapeo confirmado por el usuario (DUDA OI-06b, `docs/auditoria-ui/14-opciones-internas.md`): AdminEmpresa/AdminSistema→`admin_tenant`, Gestor→`supervisor`, Colaborador/Integrante→`member` (sin cambio, ya lo eran). Ejecutado vía Bubble Data API (`User.profile` por `bubble_id`) + `UPDATE` directo en PROD — TEST no tiene perfiles migrados (`bubble_id` en 0 filas). |
| **Verificación** | CISE: 8 `admin_tenant` (antes 1). GRUAS: 11 `admin_tenant` + 1 `supervisor` (antes 0 y 0), `reporta_admin` de `info@reporta.la` sin tocar. Proveedor: 0 usuarios reales hoy en CISE/GRUAS, sin mapeo pendiente (el enum `app_role` no tiene un valor equivalente — `customer` es el concepto opuesto, alguien a quien se le vende, no a quien se le compra — anotar si aparece el primer caso real). |
| **Estado** | 🟢 Resuelto y aplicado en PROD 2026-09-13. |

## P-007 · Numeración de cotizaciones no continúa la de Bubble — 🔴 ALTA (2026-09-13)

| Campo | Detalle |
|---|---|
| **Hallazgo** | Bubble numera por tenant con prefijo+secuencia+sufijo (`CT`·291·`-2023`; CISE va por `CT279-2026`). v3 `generateNumeroCotizacion` (`lib/actions/cotizaciones.ts`) genera `CT 2026-0001`: formato distinto, el `like` no matchea los migrados, y toma último por `created_at` en vez del máximo. `companies_consecutives` existe (1 fila vacía por tenant) y ningún código la lee. `tareas_codigo_contador` y `formatos_correlativos` también vacías. |
| **Impacto** | La primera cotización nueva en v3 sale `CT 2026-0001` en vez de `CT280-2026`; posible colisión de códigos y quiebre de la serie del cliente. |
| **Acción** | TK-OI7: reescribir `generateNumeroCotizacion` para calcular el máximo real desde `cotizaciones.numero` (no un contador cacheado — Bubble sigue creando cotizaciones en producción). Formato confirmado por el usuario 2026-09-13: `CT-XXXX-YYYY`, reinicio 1 de enero hora Lima. Plan de implementación completo en `docs/superpowers/plans/2026-09-13-tk-oi7-numeracion-cotizaciones.md`. |
| **Estado** | 🟡 Plan listo (2026-09-13), pendiente ejecutar. |
