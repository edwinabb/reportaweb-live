# Plan de Migración — 2026-05-31

**Generado:** 2026-05-31
**Cutover ya ejecutado:** 2026-05-30 22:00 (parcial — quedan tablas vacías)
**Supabase PROD:** `fqwhagryqkkhbgznxtwf`
**Bubble API base (LIVE):** `https://reporta.la/api/1.1/obj` · Token: `BUBBLE_API_TOKEN` en `.env.local`
**Tenants objetivo (solo 2):** CISE `1cb97ec7-326c-4376-93ee-ed317d3da51b` · GRUAS `6f4c923a-c3b7-47c2-9dea-2a187f274f73`

> NOTA: Scripts existentes usan por defecto `BUBBLE_API_URL=https://reporta.la/version-test/api/1.1/obj`. Como Bubble está en estado `version-test = live` per memoria del proyecto, ambos endpoints sirven los mismos datos. Conservar `.env.local` como está; pero el endpoint LIVE confirmado funcional es el `/api/1.1/obj` directo (verificado 2026-05-31).

---

## Estado al momento del análisis

### Token Bubble — Verificación
✓ Token `5532c3bb4891ccf5c49e69a6cf30b8e7` válido en `https://reporta.la/api/1.1/obj`
✗ Token NO funciona contra `/version-test/...` (responde 404 Type not found para todo). Los scripts usan version-test → si éstos fallan, exportar `BUBBLE_API_URL=https://reporta.la/api/1.1/obj` antes de correr.

### Tabla resumen — Bubble vs Supabase

| Bubble type | Campo tenant | CISE Bubble | GRUAS Bubble | Total Bubble | Supabase tabla | CISE Sup | GRUAS Sup | Δ CISE | Δ GRUAS |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|
| `tercero` | tenant_id | 399 | 232 | 687 | `terceros` | **0** | **0** | **399** | **232** |
| `terceros_contactos` | (sin tenant) | — | — | 884 | `terceros_contactos` | **0** | **0** | — | — |
| `terceros_sitios` | tenant_id | 1450 | 244 | 1957 | `terceros_sitios` | **0** | **0** | **1450** | **244** |
| `maquinaria` | tenant_id | 128 | 140 | 282 | `maquinarias` | 128 | 140 | 0 | 0 |
| `maquinaria_documento` | tenant_id | 52 | 189 | 244 | `maquinaria_documentos` | **0** | **0** | **52** | **189** |
| `Maquinaria_reporte_horas_new` | tenant_id | 5775 | 18417 | 24193 | `reportes_maquinaria` | 5383 | 17367 | 392 | 1050 |
| `usuario-reporte-horas-new` | id_empresa | 12160 | 14883 | 27044 | `reportes_personal` | 12050 | 14707 | 110 | 176 |
| `informes` | id_empresa | 10103 | 3693 | 13796 | `inspecciones` | 10092 | 3655 | 11 | 38 |
| `informe_respuesta` | id_empresa | 207096 | 110782 | 317878 | `inspecciones_detalles` | **0** | **0** | **207k** | **111k** |
| `tareas` | id_empresa | 4961 | 9499 | 14461 | `tareas` | 4936 | 9454 | 25 | 45 |
| `Cotizaciones` | tenant_id | 2375 | 269 | 2644 | `cotizaciones` | 2357 | 224 | 18 | 45 |
| `cotizaciones_detalle` | tenant_id | 3542 | 716 | 4258 | `cotizaciones_detalle` | **0** | **0** | **3542** | **716** |
| `facturas_venta` | tenant_id | 1338 | 1575 | 2914 | `facturas_venta` | 1330 | 1559 | 8 | 16 |
| `facturas_venta_item` | tenant_id | 5522 | 17511 | 23033 | `facturas_venta_item` | 4478 | 15454 | 1044 | 2057 |
| `factura_venta_pagos` | tenant_id | 524 | 3 | 527 | `factura_venta_pagos` | 521 | 0 | 3 | **3** |
| `facturas_compra` | tenant_id | 74 | 1290 | 1364 | `facturas_compra` | 74 | 1287 | 0 | 3 |
| `facturas_compra_item` | tenant_id | 5152 | 17512 | 22663 | `facturas_compra_item` | 5130 | 17376 | 22 | 136 |
| `facturas_compra_pagos` | tenant_id | 22 | 0 | 22 | `facturas_compra_pagos` | 22 | 0 | 0 | 0 |
| `plan_de_accion` | id_empresa | 20 | 385 | 405 | `planes_accion` | **0** | **0** | **20** | **385** |
| `plan_de_accion_avance` | id_empresa | 0 | 44 | 44 | `planes_accion_avances` | **0** | **0** | 0 | **44** |
| `maquinaria_horas-valorizaciones` | id_empresa | 752 | 0 | 752 | `valorizaciones` | **0** | 0 | **752** | 0 |
| `usuario_gastos` | id_empresa | 3277 | 0 | 3277 | `gastos_usuario` | **0** | 0 | **3277** | 0 |
| `formato` | id_empresa | 5 | 1 | 6 | `formatos` | **0** | **0** | **3 checklist** | **1 checklist** |
| EPP (no existe en Bubble) | — | — | — | — | `sst_epp_*` | — | — | (módulo nuevo, no migrar) |

### Bubble types NO encontrados (descartados)
- `valorizaciones` / `valorizacion` → en Bubble es `maquinaria_horas-valorizaciones` (encontrado vía script)
- `gasto_usuario` / `gastos_usuario` → en Bubble es `usuario_gastos` (encontrado vía script)
- `tarea_recurso` / `tareas_recursos` → embebido en `tareas.SupplierPersonal` (lista). Ya existen 12303 CISE + 24158 GRUAS en Supabase
- `epp_item`, `epp_entrega` → NO existen en Bubble. Módulo SST 100% nativo en Supabase, NO migrar
- `formato_informe`, `formatos_informes_respuestas` → NO existen como tipos top-level. `informe_respuesta` agrupa respuestas
- `sst_capacitacion`, `sst_incidente`, `sst_ats_*` → módulos nuevos, NO migrar

### Estado archivos (file_migration_log)
- `reportes_personal.pdf_url`: 24223/24227 OK (4 errores)
- `reportes_maquinaria.pdf_url`: 22496/22502 OK (6 errores)
- `reportes_maquinaria.foto_reporte_escrito_url`: 21628/21633 OK (5 errores)
- `inspecciones.archivo_pdf_url`: 12204/12208 OK (4 errores)
- `reportes_maquinaria.firma_cliente_url`: 10103/10108 OK (5 errores)
- Facturas: 100% OK

---

## Bloqueantes a resolver ANTES de ejecutar

1. **CRÍTICO — `terceros` está vacío en producción** pero hay `cotizaciones` y `facturas_venta` con `cliente_id` y `tareas` con `tercero_id` que referenciarán huérfanos. Validar si FK están deshabilitadas en prod o si los registros migrados usan ID nulo. Sin esto, todo el módulo Comercial / Tareas mostrará "cliente desconocido".
2. **CRÍTICO — `cotizaciones_detalle` vacío** ⇒ las 2581 cotizaciones migradas no tienen líneas. PDFs e importes mostrarán cero.
3. **CRÍTICO — `inspecciones_detalles` vacío** ⇒ las 13747 inspecciones migradas no muestran respuestas (núcleo del módulo de checklists).
4. **Identificar manualmente los 3 IDs de Bubble** de los formatos checklist a migrar (2 CISE + 1 GRUAS). El total en Bubble es 6 formatos (5 CISE + 1 GRUAS); de esos solo se quieren los checklist operacionales. Lista candidatos vía:
   ```bash
   curl -H "Authorization: Bearer $BUBBLE_API_TOKEN" \
     "https://reporta.la/api/1.1/obj/formato?limit=10" | jq '.response.results[] | {_id, codigo, nombre, id_empresa, tipo}'
   ```
   Anotar los 3 `_id` y pasarlos como flag al script.
5. **Confirmar que `BUBBLE_API_URL` en `.env.local`** funciona — si script falla con 404, cambiar a `https://reporta.la/api/1.1/obj`.
6. **Snapshot pre-migración** — antes de cualquier escritura, `pg_dump --schema-only` no aplica (es Supabase managed), pero sí ejecutar:
   ```sql
   CREATE TABLE _backup_pre_2026_05_31_tareas AS SELECT * FROM tareas;
   CREATE TABLE _backup_pre_2026_05_31_cotizaciones AS SELECT * FROM cotizaciones;
   -- (idem para inspecciones, facturas_venta, facturas_compra, reportes_*)
   ```

---

## Orden de ejecución (fases)

Total estimado: **~6–9 horas** (mayoritariamente I/O hacia Bubble + uploads de archivos).

| # | Fase | Estimado |
|---|------|---------:|
| 0 | Pre-flight (backups, env, verificar token) | 15 min |
| 1 | Terceros + contactos + sitios | 30 min |
| 2 | Maquinaria documentos | 10 min |
| 3 | Cotizaciones detalle | 30 min |
| 4 | Formatos checklist (3) + preguntas/opciones | 20 min |
| 5 | Inspecciones detalles (respuestas) | 90 min |
| 6 | Planes de acción + avances | 15 min |
| 7 | Valorizaciones (solo CISE) | 15 min |
| 8 | Gastos usuario (solo CISE) | 20 min |
| 9 | Fix pagos GRUAS — `factura_venta_pagos` | 5 min |
| 10 | Delta tablas ya migradas (desde 2026-05-23) | 45 min |
| 11 | Delta archivos faltantes (errores en file_migration_log) | 30 min |
| 12 | Verificación final + FKs huérfanos | 30 min |

---

### Fase 0: Pre-flight — Estimado: 15 min

**⚠️ CRÍTICO — `.env.local` ya actualizado (2026-05-31) a PROD:**
- `BUBBLE_API_TOKEN` = `5532c3bb...` (token LIVE válido ✅)
- `BUBBLE_API_URL` = `https://reporta.la/api/1.1/obj` (LIVE ✅)
- `NEXT_PUBLIC_SUPABASE_URL` = `https://fqwhagryqkkhbgznxtwf.supabase.co` (PROD Brazil ✅)
- `SUPABASE_SERVICE_ROLE_KEY` = clave service_role PROD ✅

**Valores TEST para restaurar al finalizar:**
```
BUBBLE_API_TOKEN="ca0bd77f30ec59a15bc82b5fbfc3dc03"
BUBBLE_API_URL="https://reporta.la/version-test/api/1.1/obj"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpb296aXNza2pqZ2pqeWJzb3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk0MDIzOCwiZXhwIjoyMDg4NTE2MjM4fQ.Z8SaPSGt99UJQoJuOv_mIIEfP5yivYiVYXe8a7xRLJ4"
NEXT_PUBLIC_SUPABASE_URL="https://wioozisskjjgjjybsoqo.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpb296aXNza2pqZ2pqeWJzb3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NDAyMzgsImV4cCI6MjA4ODUxNjIzOH0.W5SR9XUMYp0SQ485LxhGuP4aHv5QEVjZWIjdVZ9fK3w"
```

**Comandos:**
```powershell
cd C:\Proyectos\reportaweb3

# 1. Verificar token Bubble LIVE
Invoke-RestMethod -Uri "https://reporta.la/api/1.1/obj/Companies?limit=1" `
  -Headers @{Authorization="Bearer 5532c3bb4891ccf5c49e69a6cf30b8e7"} | Select-Object -ExpandProperty response | Select-Object count
# Esperado: count ≥ 2
```

**Backups (ejecutar vía MCP Supabase — project_id fqwhagryqkkhbgznxtwf):**
```sql
CREATE TABLE IF NOT EXISTS _bk_cotizaciones        AS SELECT * FROM cotizaciones;
CREATE TABLE IF NOT EXISTS _bk_inspecciones        AS SELECT * FROM inspecciones;
CREATE TABLE IF NOT EXISTS _bk_facturas_venta      AS SELECT * FROM facturas_venta;
CREATE TABLE IF NOT EXISTS _bk_facturas_compra     AS SELECT * FROM facturas_compra;
CREATE TABLE IF NOT EXISTS _bk_tareas              AS SELECT * FROM tareas;
CREATE TABLE IF NOT EXISTS _bk_reportes_maquinaria AS SELECT * FROM reportes_maquinaria;
CREATE TABLE IF NOT EXISTS _bk_reportes_personal   AS SELECT * FROM reportes_personal;
CREATE TABLE IF NOT EXISTS _bk_facturas_venta_item AS SELECT * FROM facturas_venta_item;
CREATE TABLE IF NOT EXISTS _bk_facturas_compra_item AS SELECT * FROM facturas_compra_item;
```

**Verificación:** 
```sql
SELECT 'cotizaciones' t, (SELECT COUNT(*) FROM _bk_cotizaciones) bk, (SELECT COUNT(*) FROM cotizaciones) orig
UNION ALL SELECT 'tareas', (SELECT COUNT(*) FROM _bk_tareas), (SELECT COUNT(*) FROM tareas)
UNION ALL SELECT 'inspecciones', (SELECT COUNT(*) FROM _bk_inspecciones), (SELECT COUNT(*) FROM inspecciones);
-- Esperado: bk = orig para cada fila
```

---

### Fase 1: Terceros + contactos + sitios — Estimado: 30 min

**Tablas afectadas:** `terceros`, `terceros_contactos`, `terceros_sitios`
**Dependencias:** Fase 0
**Bubble tipos:** `tercero` (tenant_id), `terceros_contactos` (sin tenant — vincular por id_tercero), `terceros_sitios` (tenant_id)

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-terceros-bubble.ts
# Si el script no soporta target=prod, alternativa:
dotenv -e .env.local -- npx tsx scripts/migrate-terceros-full.ts
```

**Verificación:**
```sql
SELECT 'terceros' t, COUNT(*) total,
  COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b') cise,
  COUNT(*) FILTER (WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73') gruas,
  COUNT(bubble_id) con_bid
FROM terceros
UNION ALL SELECT 'terceros_contactos', COUNT(*), COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b'), COUNT(*) FILTER (WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73'), COUNT(bubble_id) FROM terceros_contactos
UNION ALL SELECT 'terceros_sitios', COUNT(*), COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b'), COUNT(*) FILTER (WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73'), COUNT(bubble_id) FROM terceros_sitios;
-- Esperado: terceros≈631 (399+232), contactos≈884, sitios≈1694 (1450+244)
```

**Riesgo:** Tareas / cotizaciones / facturas ya migradas tienen `cliente_id`/`tercero_id` apuntando a UUIDs derivados de `tercero._id`. Si el script genera UUIDs nuevos (con `uuid_generate_v5(bubble_id)`), debe coincidir. Si no, quedan huérfanos.
**Mitigación:** Verificar antes que el script usa hashing determinístico desde `bubble_id`. Si no, ejecutar paso post-fase:
```sql
-- Reparar tareas si tercero_id quedó huérfano
UPDATE tareas t SET tercero_id = nt.id
FROM terceros nt
JOIN (SELECT bubble_id, _client_id FROM _bk_tareas WHERE tercero_bubble_id IS NOT NULL) bk
  ON bk.bubble_id = nt.bubble_id
WHERE t.bubble_id = bk._client_id;
```

---

### Fase 2: Maquinaria documentos — Estimado: 10 min

**Tablas afectadas:** `maquinaria_documentos`
**Dependencias:** Fase 0 (las 268 maquinarias ya existen)
**Bubble tipo:** `maquinaria_documento` (tenant_id)

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-maquinaria-bubble.ts --step documentos
```

**Verificación:**
```sql
SELECT COUNT(*) total, COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b') cise,
  COUNT(*) FILTER (WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73') gruas,
  COUNT(maquinaria_id) con_fk
FROM maquinaria_documentos;
-- Esperado: total≈241, cise≈52, gruas≈189, con_fk = total
```

**Riesgo:** algún documento referencia `tipo_doc_id` o `maquinaria_id` huérfano.
**Mitigación:** correr `--step inspect` antes; revisar reportes de unmapped. Aplicar segunda pasada con `--step documentos` después de mapear faltantes.

---

### Fase 3: Cotizaciones detalle — Estimado: 30 min

**Tablas afectadas:** `cotizaciones_detalle`
**Dependencias:** Fase 1 (terceros), cotizaciones ya migradas
**Bubble tipo:** `cotizaciones_detalle` (tenant_id)

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-cotizaciones-detalle.ts
```

**Verificación:**
```sql
SELECT COUNT(*) total,
  COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b') cise,
  COUNT(*) FILTER (WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73') gruas,
  COUNT(DISTINCT cotizacion_id) cotz_con_lineas
FROM cotizaciones_detalle;
-- Esperado: total≈4258, cise≈3542, gruas≈716, cotz_con_lineas ≤ 2581
-- FK huérfanas:
SELECT COUNT(*) huerfanos FROM cotizaciones_detalle cd
LEFT JOIN cotizaciones c ON c.id = cd.cotizacion_id WHERE c.id IS NULL;
-- Esperado: 0
```

**Riesgo:** `servicio_id` huérfanos si servicios no fue migrado completo.
**Mitigación:** dejar `servicio_id` NULL si no resuelve; `descripcion` se preserva.

---

### Fase 4: Formatos checklist (3 específicos) — Estimado: 20 min

**Tablas afectadas:** `formatos`, `formatos_versiones`, `formatos_preguntas`, `formatos_opciones`
**Dependencias:** Fase 0
**Bubble tipo:** `formato` (id_empresa) + secciones (`formato_seccion`) + preguntas (`formato_pregunta`)

**IDs confirmados (2026-05-31):**

| Tenant | Versión | Bubble ID |
|--------|---------|-----------|
| CISE | V1 | `1595542112449x409080868229087200` |
| CISE | V2 | `1619551534519x827573097185935400` |
| GRUAS DEL PACIFICO | — | `1734793744908x241014863998484500` |

**Comando:**
**Nota:** Los 3 IDs ya están hardcodeados en `scripts/migrate-formatos-templates.ts` líneas 48–66 (FORMAT_GROUPS). No requiere flags extra.

```powershell
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-formatos-templates.ts --step=inspect
dotenv -e .env.local -- npx tsx scripts/migrate-formatos-templates.ts --step=migrate
```

**Verificación:**
```sql
SELECT f.codigo, f.nombre, f.tenant_id, COUNT(p.id) preguntas
FROM formatos f LEFT JOIN formatos_preguntas p ON p.formato_id = f.id
GROUP BY f.id, f.codigo, f.nombre, f.tenant_id;
-- Esperado: exactamente 3 filas con preguntas > 0
```

**Riesgo:** importar formatos no-checklist contamina UI.
**Mitigación:** restringir por allowlist de `_id`. NO usar `--force` salvo re-run.

---

### Fase 5: Inspecciones detalles (respuestas) — Estimado: 90 min

**Tablas afectadas:** `inspecciones_detalles`
**Dependencias:** Fases 1 + 4 (terceros + formatos preguntas con `pregunta_bubble_id`)
**Bubble tipo:** `informe_respuesta` (id_empresa) — ~318k registros

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-informe-respuesta.ts --target=prod --step=inspect
dotenv -e .env.local -- npx tsx scripts/migrate-informe-respuesta.ts --target=prod --step=all --run
```

**Verificación:**
```sql
SELECT COUNT(*) total,
  COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b') cise,
  COUNT(*) FILTER (WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73') gruas,
  COUNT(DISTINCT inspeccion_id) insp_con_respuestas,
  COUNT(*) FILTER (WHERE pregunta_bubble_id IS NOT NULL) con_preg_bid
FROM inspecciones_detalles;
-- Esperado: total≈317.878k, cise≈207k, gruas≈111k, insp_con_respuestas ≤ 13747
```

**Riesgo:** Volumen — 318k inserts. Posible rate-limit Bubble (50ms entre llamadas). Memoria del proceso si carga todo en RAM.
**Mitigación:** correr en chunks por tenant (`--tenant=CISE` luego `--tenant=GRUAS` si el script soporta), monitorear; reintentar con `--step=migrate` si interrumpido (idempotente por `bubble_id`).

---

### Fase 6: Planes de acción + avances — Estimado: 15 min

**Tablas afectadas:** `planes_accion`, `planes_accion_responsables`, `planes_accion_avances`
**Dependencias:** Fase 5 (avances apuntan a inspecciones_detalles via `inspeccion_detalle_id`)
**Bubble tipos:** `plan_de_accion` (id_empresa), `plan_de_accion_avance` (id_empresa)

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-planes-accion.ts --step=schema
dotenv -e .env.local -- npx tsx scripts/migrate-planes-accion.ts --step=migrate
```

**Verificación:**
```sql
SELECT 'planes_accion' t, COUNT(*),
  COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b') cise,
  COUNT(*) FILTER (WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73') gruas
FROM planes_accion
UNION ALL SELECT 'planes_accion_avances', COUNT(*),
  COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b'),
  COUNT(*) FILTER (WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73')
FROM planes_accion_avances;
-- Esperado: planes_accion≈405 (20+385), avances≈44
```

**Riesgo:** `inspeccion_id` o `inspeccion_detalle_id` huérfano si Fase 5 incompleta.
**Mitigación:** correr Fase 5 al 100% antes; reparar con UPDATE post-hoc usando `informe_bubble_id`.

---

### Fase 7: Valorizaciones (solo CISE) — Estimado: 15 min

**Tablas afectadas:** `valorizaciones`
**Dependencias:** Fase 0 (reportes_maquinaria ya migrado)
**Bubble tipo:** `maquinaria_horas-valorizaciones` (id_empresa) — 752 CISE / 0 GRUAS

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-valorizaciones.ts --step=inspect
dotenv -e .env.local -- npx tsx scripts/migrate-valorizaciones.ts --step=migrate
```

**Verificación:**
```sql
SELECT COUNT(*) total, COUNT(reporte_maquinaria_id) con_fk,
  COUNT(*) FILTER (WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b') cise
FROM valorizaciones;
-- Esperado: total≈752, con_fk=total, cise=total
```

**Riesgo:** `id_maquinaria_horas` (Bubble) no encuentra reporte_maquinaria correspondiente.
**Mitigación:** los reportes_maquinaria de CISE ya están en 5383 / 5775 (392 faltantes). Ejecutar primero la Fase 10 delta de reportes_maquinaria CISE.

---

### Fase 8: Gastos usuario (solo CISE) — Estimado: 20 min

**Tablas afectadas:** `gastos_usuario`
**Dependencias:** Fase 5 (gastos referencian `inspeccion_id` y `pregunta_bubble_id`)
**Bubble tipo:** `usuario_gastos` (id_empresa) — 3277 CISE / 0 GRUAS

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-usuario-gastos.ts --step=inspect
dotenv -e .env.local -- npx tsx scripts/migrate-usuario-gastos.ts --step=migrate
```

**Verificación:**
```sql
SELECT COUNT(*) total, COUNT(inspeccion_id) con_insp, COUNT(profile_id) con_user,
  SUM(total) suma_gastos
FROM gastos_usuario
WHERE tenant_id::text='1cb97ec7-326c-4376-93ee-ed317d3da51b';
-- Esperado: total≈3277, con_insp y con_user > 95%
```

**Riesgo:** `id_usuario` Bubble → `profile_id` Supabase mapping puede fallar.
**Mitigación:** dejar `profile_id` NULL si no resuelve; preservar `bubble_id`.

---

### Fase 9: Fix pagos GRUAS — Estimado: 5 min

**Tablas afectadas:** `factura_venta_pagos` (filtro GRUAS)
**Dependencias:** ninguna
**Bubble tipo:** `factura_venta_pagos` (tenant_id) — 3 GRUAS

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
dotenv -e .env.local -- npx tsx scripts/migrate-facturas-pagos.ts --step=venta
```

**Verificación:**
```sql
SELECT COUNT(*) FROM factura_venta_pagos
WHERE tenant_id::text='6f4c923a-c3b7-47c2-9dea-2a187f274f73';
-- Esperado: 3 (actualmente 0)
```

**Riesgo:** re-procesa CISE (idempotente por bubble_id, sin riesgo).

---

### Fase 10: Delta de tablas ya migradas — Estimado: 45 min

Estrategia: cada script soporta `--limit` y filtra por `bubble_id` con upsert. Para tablas con created_at máximo ya conocido, pasar `--from=<fecha>` donde el script lo soporta; donde no, el upsert por `bubble_id` evita duplicados al re-correr.

**Último `created_at` por tabla (corte para delta):**
| Tabla | CISE último | GRUAS último | Δ aproximada |
|---|---|---|---:|
| tareas | 2026-05-22 19:48 | 2026-05-22 21:23 | 25+45=70 |
| cotizaciones | 2026-05-20 23:06 | 2026-04-30 22:20 | 18+45=63 |
| inspecciones | 2026-05-17 13:34 | 2026-05-22 23:09 | 11+38=49 |
| reportes_maquinaria | 2026-05-21 22:15 | 2026-05-23 01:27 | 392+1050=1442 (incluye gap) |
| reportes_personal | 2026-05-23 01:15 | 2026-05-23 01:43 | 110+176=286 |
| facturas_venta | 2026-05-21 22:17 | 2026-05-19 16:40 | 8+16=24 |
| facturas_compra | 2024-10-31 (CISE old) | 2026-05-22 19:27 | 0+3=3 |
| facturas_venta_item | — | — | ~3.1k (parents OK) |
| facturas_compra_item | — | — | ~158 |

**Comandos (en orden):**
```bash
cd C:\Proyectos\reportaweb3
# Tareas delta
dotenv -e .env.local -- npx tsx scripts/migrate-tareas-bubble.ts
# Cotizaciones delta (cabeceras)
dotenv -e .env.local -- npx tsx scripts/migrate-cotizaciones-bubble.ts
# Inspecciones delta (solo cabeceras; respuestas ya cubiertas en F5 con upsert)
dotenv -e .env.local -- npx tsx scripts/migrate-inspecciones.ts --target=prod --step=all
# Reportes maquinaria + personal delta
dotenv -e .env.local -- npx tsx scripts/migrate-reportes-maquinaria-v2.ts
dotenv -e .env.local -- npx tsx scripts/migrate-reportes-personal.ts
# Facturas items delta
dotenv -e .env.local -- npx tsx scripts/migrate-facturas-items.ts --step=all
```

**Verificación general:**
```sql
SELECT 'tareas' t, COUNT(*) FROM tareas WHERE tenant_id::text IN ('1cb97ec7-326c-4376-93ee-ed317d3da51b','6f4c923a-c3b7-47c2-9dea-2a187f274f73')
UNION ALL SELECT 'cotizaciones', COUNT(*) FROM cotizaciones WHERE tenant_id::text IN ('1cb97ec7-326c-4376-93ee-ed317d3da51b','6f4c923a-c3b7-47c2-9dea-2a187f274f73')
UNION ALL SELECT 'reportes_maquinaria', COUNT(*) FROM reportes_maquinaria WHERE tenant_id::text IN ('1cb97ec7-326c-4376-93ee-ed317d3da51b','6f4c923a-c3b7-47c2-9dea-2a187f274f73')
UNION ALL SELECT 'reportes_personal', COUNT(*) FROM reportes_personal WHERE tenant_id::text IN ('1cb97ec7-326c-4376-93ee-ed317d3da51b','6f4c923a-c3b7-47c2-9dea-2a187f274f73');
-- Comparar con totales Bubble esperados ±5
```

**Riesgo:** scripts pueden re-procesar todo, generar carga API.
**Mitigación:** upsert por `bubble_id` (idempotente). Si script soporta `--from=2026-05-22`, usarlo.

---

### Fase 11: Delta de archivos faltantes — Estimado: 30 min

**Tablas afectadas:** `reportes_personal.pdf_url`, `reportes_maquinaria.{pdf_url,foto_reporte_escrito_url,firma_cliente_url}`, `inspecciones.archivo_pdf_url`
**Dependencias:** Fase 10
**Faltantes:** ~24 archivos en estado `error` + cualquier nuevo de delta

**Comando:**
```bash
cd C:\Proyectos\reportaweb3
# Re-intentar errores en file_migration_log y nuevos
dotenv -e .env.local -- npx tsx scripts/migrate-files-to-storage.ts --table=reportes_personal --step=migrate --target=prod
dotenv -e .env.local -- npx tsx scripts/migrate-files-to-storage.ts --table=reportes_maquinaria --step=migrate --target=prod
dotenv -e .env.local -- npx tsx scripts/migrate-files-to-storage.ts --table=inspecciones --step=migrate --target=prod
dotenv -e .env.local -- npx tsx scripts/migrate-files-to-storage.ts --table=maquinaria_documentos --step=migrate --target=prod
dotenv -e .env.local -- npx tsx scripts/migrate-files-to-storage.ts --table=cotizaciones --step=migrate --target=prod
```

**Verificación:**
```sql
SELECT table_name, field, status, COUNT(*)
FROM file_migration_log
WHERE status IN ('error','pending')
GROUP BY 1,2,3
ORDER BY 4 DESC;
-- Esperado: cero o muy pocos errores con causa conocida (URL Bubble dead)
```

**Riesgo:** algunas URLs originales en Bubble ya están en bucket `reporta-files` retirado.
**Mitigación:** marcar como `dead` y aceptar; documentar en `DEUDA_TECNICA.md`.

---

### Fase 12: Verificación final + FKs huérfanos — Estimado: 30 min

#### 12a — FK orphan check (todos los `referencias → terceros`, `formatos`, `planes_accion`)

```sql
-- Huérfanos hacia terceros
SELECT 'cotizaciones.cliente_id' col, COUNT(*) huerfanos FROM cotizaciones c
LEFT JOIN terceros t ON t.id = c.cliente_id WHERE c.cliente_id IS NOT NULL AND t.id IS NULL
UNION ALL SELECT 'tareas.tercero_id', COUNT(*) FROM tareas x
LEFT JOIN terceros t ON t.id = x.tercero_id WHERE x.tercero_id IS NOT NULL AND t.id IS NULL
UNION ALL SELECT 'facturas_venta.cliente_id', COUNT(*) FROM facturas_venta x
LEFT JOIN terceros t ON t.id = x.cliente_id WHERE x.cliente_id IS NOT NULL AND t.id IS NULL
UNION ALL SELECT 'facturas_compra.proveedor_id', COUNT(*) FROM facturas_compra x
LEFT JOIN terceros t ON t.id = x.proveedor_id WHERE x.proveedor_id IS NOT NULL AND t.id IS NULL
UNION ALL SELECT 'reportes_maquinaria.cliente_id', COUNT(*) FROM reportes_maquinaria x
LEFT JOIN terceros t ON t.id = x.cliente_id WHERE x.cliente_id IS NOT NULL AND t.id IS NULL
UNION ALL SELECT 'inspecciones.cliente_id', COUNT(*) FROM inspecciones x
LEFT JOIN terceros t ON t.id = x.cliente_id WHERE x.cliente_id IS NOT NULL AND t.id IS NULL
-- Huérfanos hacia formatos
UNION ALL SELECT 'inspecciones.formato_id', COUNT(*) FROM inspecciones x
LEFT JOIN formatos f ON f.id = x.formato_id WHERE x.formato_id IS NOT NULL AND f.id IS NULL
-- Huérfanos hacia planes_accion
UNION ALL SELECT 'planes_accion_avances.plan_id', COUNT(*) FROM planes_accion_avances x
LEFT JOIN planes_accion p ON p.id = x.plan_id WHERE p.id IS NULL
UNION ALL SELECT 'planes_accion_responsables.plan_id', COUNT(*) FROM planes_accion_responsables x
LEFT JOIN planes_accion p ON p.id = x.plan_id WHERE p.id IS NULL;
-- Esperado: todos = 0
```

#### 12b — Conteos finales vs Bubble (re-correr la query de la tabla resumen)

#### 12c — Smoke test UI
- Web → /comercial/cotizaciones → abrir una cotización → ver detalle líneas + cliente
- Web → /inspecciones/[id] → ver respuestas
- Web → /maquinaria → tab Documentos → ver archivos
- Web → /tareas → ver tarea con tercero
- App → Tab Plan → tareas con tercero visible

#### 12d — Resumen ejecutivo
```sql
SELECT 'OK' status, NOW() at TIME ZONE 'America/Lima' fin;
-- + capturar snapshot de conteos en docs/cutover-may31-final.md
```

---

## Sección especial: FKs a verificar post-migración

| Tabla referenciante | Columna FK | Tabla referenciada | Riesgo en migración |
|---|---|---|---|
| `cotizaciones` | `cliente_id` | `terceros` | ALTO — terceros vacío |
| `cotizaciones` | `contacto_id` | `terceros_contactos` | ALTO |
| `cotizaciones` | `sitio_id` | `terceros_sitios` | ALTO |
| `cotizaciones_detalle` | `cotizacion_id` | `cotizaciones` | MED |
| `cotizaciones_detalle` | `servicio_id` | `servicios` | MED |
| `cotizaciones_detalle` | `tarea_id` | `tareas` | BAJO |
| `tareas` | `tercero_id` | `terceros` | ALTO |
| `tareas` | `sitio_id` | `terceros_sitios` | ALTO |
| `tareas_recursos` | `tarea_id` | `tareas` | BAJO |
| `inspecciones` | `cliente_id` | `terceros` | ALTO |
| `inspecciones` | `formato_id` | `formatos` | ALTO — formatos vacío |
| `inspecciones` | `maquinaria_id` | `maquinarias` | OK |
| `inspecciones_detalles` | `inspeccion_id` | `inspecciones` | MED |
| `inspecciones_detalles` | `pregunta_bubble_id` | (texto, no FK) | OK — usar para join post-formatos |
| `facturas_venta` | `cliente_id` | `terceros` | ALTO |
| `facturas_venta_item` | `factura_venta_id` | `facturas_venta` | OK |
| `facturas_compra` | `proveedor_id` | `terceros` | ALTO |
| `factura_venta_pagos` | `factura_venta_id` | `facturas_venta` | OK |
| `reportes_maquinaria` | `maquinaria_id` | `maquinarias` | OK |
| `reportes_maquinaria` | `cliente_id` | `terceros` | ALTO |
| `valorizaciones` | `reporte_maquinaria_id` | `reportes_maquinaria` | MED |
| `gastos_usuario` | `inspeccion_id` | `inspecciones` | MED |
| `gastos_usuario` | `profile_id` | `profiles` | BAJO |
| `maquinaria_documentos` | `maquinaria_id` | `maquinarias` | OK |
| `maquinaria_documentos` | `tipo_doc_id` | `maquinaria_tipos_docs` | MED |
| `planes_accion` | `inspeccion_id` | `inspecciones` | MED |
| `planes_accion_avances` | `plan_id` | `planes_accion` | MED |

Query maestra de huérfanos en sección 12a.

---

## Sección especial: Archivos

Estrategia para campos URL que pueden quedar NULL:

| Tabla.campo | Fuente Bubble | Estrategia |
|---|---|---|
| `inspecciones.archivo_pdf_url` | `informes.archivo_web` | Fase 11 re-run; si Bubble null → mantener null y regenerar con Gotenberg si la inspección lo permite |
| `reportes_maquinaria.pdf_url` | `Maquinaria_reporte_horas_new.pdf_url` | Fase 11 re-run |
| `reportes_maquinaria.foto_reporte_escrito_url` | idem | Fase 11 re-run |
| `reportes_maquinaria.firma_cliente_url` | idem | Fase 11 re-run |
| `reportes_personal.pdf_url` | `usuario-reporte-horas-new.pdf_url` | Fase 11 re-run |
| `cotizaciones.pdf_url` | `Cotizaciones.pdf_url` | Re-correr `migrate-cotizaciones-pdfs.ts` después de Fase 1/3 |
| `maquinaria_documentos.archivo_url` | `maquinaria_documento.archivo` | Cubierto en Fase 2 (script descarga durante migración) |
| `terceros.logo_url` | `tercero.logo` | Cubierto en Fase 1 |
| `inspecciones_detalles.foto_url` | `informe_respuesta.foto` | Cubierto en Fase 5 |
| `planes_accion_avances.fotos` (jsonb) | `plan_de_accion_avance.fotos` | Cubierto en Fase 6 |

Para campos donde el archivo en Bubble apunta a bucket retirado (`reporta-files`): script `migrate-files-to-storage.ts` detecta `isDeadSupaUrl` y los marca; aceptar como pérdida y documentar.

---

## Verificación final

Después de las 12 fases, ejecutar:

```sql
-- 1. Conteos finales
\i scripts/verify-cutover-final.sql  -- o ejecutar query de la "Tabla resumen"

-- 2. Sin huérfanos (sección 12a)

-- 3. file_migration_log saneada
SELECT status, COUNT(*) FROM file_migration_log GROUP BY 1;
-- Esperado: success >> error

-- 4. Bubble_id coverage por tabla
SELECT 'terceros' t, COUNT(*)-COUNT(bubble_id) sin_bid FROM terceros
UNION ALL SELECT 'cotizaciones_detalle', COUNT(*)-COUNT(bubble_id) FROM cotizaciones_detalle
UNION ALL SELECT 'inspecciones_detalles', COUNT(*)-COUNT(bubble_id) FROM inspecciones_detalles
UNION ALL SELECT 'planes_accion', COUNT(*)-COUNT(bubble_id) FROM planes_accion
UNION ALL SELECT 'valorizaciones', COUNT(*)-COUNT(bubble_id) FROM valorizaciones
UNION ALL SELECT 'gastos_usuario', COUNT(*)-COUNT(bubble_id) FROM gastos_usuario;
-- Esperado: todos = 0
```

Smoke test web/app per fase 12c.

---

## Rollback

### Granular por tabla (preferido)
Si Fase N falla:
```sql
-- Restaurar SOLO la tabla afectada
TRUNCATE <tabla> RESTART IDENTITY CASCADE;
INSERT INTO <tabla> SELECT * FROM _bk_<tabla>;
-- O reemplazo selectivo solo de filas nuevas:
DELETE FROM <tabla> WHERE created_at > '2026-05-31 00:00:00';
```

### Total
Restaurar todas las tablas backupeadas en Fase 0:
```sql
BEGIN;
TRUNCATE terceros, terceros_contactos, terceros_sitios,
         cotizaciones_detalle, inspecciones_detalles,
         planes_accion, planes_accion_avances,
         valorizaciones, gastos_usuario,
         maquinaria_documentos, formatos
RESTART IDENTITY CASCADE;
-- Para tablas que ya tenían datos antes y solo se hizo delta:
DELETE FROM tareas WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM cotizaciones WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM inspecciones WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM reportes_maquinaria WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM reportes_personal WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM facturas_venta WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM facturas_venta_item WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM facturas_compra WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM facturas_compra_item WHERE created_at > '2026-05-31 00:00:00';
DELETE FROM factura_venta_pagos WHERE created_at > '2026-05-31 00:00:00';
COMMIT;
```

### Storage RLS (referencia memoria)
Si hay problema subiendo imágenes: `supabase/rollback/storage_rls_rollback_20260522.sql`.

### Limpieza tras éxito
```sql
DROP TABLE _bk_terceros, _bk_cotizaciones, _bk_inspecciones,
           _bk_facturas_venta, _bk_facturas_compra, _bk_tareas,
           _bk_reportes_maquinaria, _bk_reportes_personal;
```
