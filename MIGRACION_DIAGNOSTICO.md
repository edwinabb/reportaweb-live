# Diagnóstico de Migración — Bubble → Supabase

> Última actualización: 2026-04-14 madrugada (post drain parcial Bloque B sobre `reportes_maquinaria.pdf_url` + hallazgo crítico de bucket `reporta-files` inexistente).
> Basado en ejecución de `scripts/audit-mig-full.ts` contra Supabase producción.
> Ver [COMO MIGRAR.md](COMO%20MIGRAR.md) para instrucciones de ejecución y mapeos por tabla.
> Ver [TAREAS_PRIORIZADAS.md](TAREAS_PRIORIZADAS.md) → sección MIG-VALIDACION para el plan de acción.

---

## 1. IDs fijos verificados

| Tenant | Supabase UUID | Bubble ID |
|---|---|---|
| CISE PERU SAC | `1cb97ec7-326c-4376-93ee-ed317d3da51b` | `1596035803087x371442079041323000` |
| GRUAS DEL PACIFICO S.A.C. | `6f4c923a-c3b7-47c2-9dea-2a187f274f73` | `1691779382086x534175713862630160` |

> GCZ **no existe en Supabase** — no fue migrado como tenant. Las `companies` de Supabase son CISE, GRUAS y REPORTA (el propio SaaS).

---

## 2. Estado por tabla — Post A.1..A.5 (2026-04-12)

Columnas: **TID** = tiene `tenant_id` | **BID** = tiene `bubble_id` | **S.Tot** = total Supabase | **Gap** per-tenant (CISE + GRUAS)

### Tablas principales ✅

| Tabla | TID | BID | S.Tot | Gap per-tenant | Estado |
|---|---|---|---|---|---|
| `companies` | — | — | 2 | 0 | ✅ |
| `terceros` | ✅ | ✅ | 614 | 0 | ✅ (CISE 388 + GRUAS 226) |
| `terceros_contactos` | ✅ | ✅ | 810 | — | ✅ (50 sin `tercero_id` en Bubble, saltados) |
| `terceros_sitios` | ✅ | ✅ | 1,616 | **0** ✅ | ✅ A.4 cerrado (CISE 1,381 + GRUAS 235) |
| `maquinarias` | ✅ | ✅ | 260 | 0 | ✅ (CISE 120 + GRUAS 140) |
| `maquinaria_modelos` | ✅ | ✅ | 230 | 0 | ✅ (CISE 100 + GRUAS 130) |
| `maquinaria_tipos_docs` | ✅ | ✅ | 30 | 0 | ✅ (CISE 14 + GRUAS 16) |
| `maquinaria_documentos` | ✅ | ✅ | 230 | -1 GRUAS | ⚠️ 1 doc Bubble sin `maquinaria_id`, NO migrable (aceptado) |
| `servicios` | ✅ | ✅ | 430 | 0 | ✅ (CISE 231 + GRUAS 199) |
| `profiles` | ✅ | ✅ | 318 | — | ✅ (1 admin manual sin `bubble_id`) |
| `cotizaciones` | ✅ | ✅ | 2,555 | 0 | ✅ (CISE 2,297 + GRUAS 258) |
| `cotizaciones_detalle` | ✅ | ✅ | 4,059 | -58 | ⚠️ 58 huérfanos Bubble sin `cotizacion_id`, NO migrables (aceptado) |
| `cotizaciones_matriz_responsabilidad` | ✅ | ✅ | 52,108 | — | ✅ A.3 cerrado (repairdos 30, borrados 1,062 sin FK padre) |
| `planes_accion` | ✅ | ✅ | 386 | 0 | ✅ A.2 migrado (CISE 20 + GRUAS 366) |
| `plantillas` | — | ✅ | 322 | — | ✅ A.1 migrado (161 × 2 tenants) |
| `tareas` | ✅ | ✅ | 13,738 | 0 | ✅ (CISE 4,798 + GRUAS 8,940) |
| `facturas_venta` | ✅ | ✅ | 2,731 | +6 CISE | ✅ A.5: 2 vacíos eliminados |
| `facturas_venta_item` | ✅ | ✅ | 18,393 | -2,737 | ⚠️ A.5: 1,043 fantasma eliminados. Gap restante = huérfanos Bubble documentados |
| `facturas_compra` | ✅ | ✅ | 1,265 | 0 | ✅ (CISE 74 + GRUAS 1,191) |
| `facturas_compra_item` | ✅ | ✅ | 20,761 | 0 | ✅ A.5: 7 fantasma eliminados |
| `reportes_maquinaria` | ✅ | ✅ | 22,197 | 0 | ✅ (CISE 5,541 + GRUAS 16,656) |
| `reportes_usuario` | ✅ | ✅ | 24,974 | 0 | ✅ (CISE 11,604 + GRUAS 13,370) |
| `tasas_cambio` | ✅ | — | 871 | — | ⚠️ Sembrado sin `bubble_id` (0% trazabilidad) |
| `tipos_precio` | ⚠️ | — | 20 | — | ✅ A.5: catálogo global compartido (tenant NULL intencional) |

### Catálogos sembrados (MIG-7) ✅

| Tabla | Registros | Alcance |
|---|---|---|
| `document_types` | 12 | Global |
| `terceros_tipos` | 10 | CISE + GRUAS |
| `sitios_tipo` | 14 | CISE + GRUAS |
| `sitios_ubicacion` | 18 | CISE + GRUAS |
| `tiempo_unidades` | 12 | CISE + GRUAS |
| `servicios_tipo` | 24 | CISE + GRUAS |
| `ubigeo` | 41 | Global (INEI) |
| `paises` | 249 | Global |
| `rubros` | 37 | CISE + GRUAS |

### Tablas eliminadas / obsoletas

| Tabla | Acción |
|---|---|
| `servicios_tipos` (plural) | **OBSOLETA** — pendiente `DROP TABLE servicios_tipos` en SQL Editor (0 registros). |
| `inspecciones` | Queda vacía a propósito. Bubble nunca tuvo instancias rellenadas — las generará la app. |

---

## 3. Archivos (Storage) — Bloque B parcial ⚠️

**Buckets vigentes en Supabase Storage (listado 2026-04-14):**

```text
banca, cotizaciones, doc_maquinarias, doc_usuarios, facturas_compras,
facturas_ventas, logos, maquinarias, reporta-maquinaria-fotos,
reporte-maquinaria, reporte-usuario, usuarios
```

> 🚨 **Hallazgo crítico 2026-04-14**: el bucket `reporta-files` **NO existe**. Toda URL del tipo `…supabase.co/storage/v1/object/public/reporta-files/…` está rota. El script `migrate-files-to-storage.ts` las clasifica como `supa_public` y las salta, ocultando el problema.

**Estado por target (2026-04-14 madrugada):**

| Target | Universo | Migrado legítimo | Errores | URLs rotas (`reporta-files`) | Bucket real | Estado |
|---|---:|---:|---:|---:|---|---|
| `maquinarias.foto_url` | 15 | 15 | 0 | ? | `maquinarias` | 🔍 verificar |
| `maquinaria_documentos.archivo_url` | 224 | 224 | 0 | 0 | `doc_maquinarias` | ✅ |
| `cotizaciones.pdf_url` | 2,224 | 2,224 | 0 | 0 | `cotizaciones` | ✅ |
| `reportes_maquinaria.firma_cliente_url` | 9,864 | ? | ? | ? | `reporta-maquinaria-fotos` | 🔍 verificar |
| `reportes_maquinaria.pdf_url` | 20,783 | ~10,038 | 2 | ~10,743 | `reporte-maquinaria` | ⚠️ |

**Drain `reportes_maquinaria.pdf_url` (2026-04-14):**

- Ejecutado `npx tsx scripts/migrate-files-to-storage.ts --table=reportes_maquinaria_pdf --step=migrate --concurrency=8`.
- Pendientes al arrancar: 9,994. Resultado: **9,992 OK**, **2 err** (HTTP 5xx transitorio en `storage.upload`).
- IDs de error (retry trivial):
  - `c25c481b-ad62-460b-bff4-fe20937b27d9`
  - `cb5e1176-d807-4a01-9d40-45d841bbf44e`
- **10,743 filas saltadas** como `supa_public` apuntan todas al host `wioozisskjjgjjybsoqo.supabase.co` con path `/public/reporta-files/cise-peru-...` → **bucket inexistente, archivos no migrados realmente**.
- Log temporal del run: [scripts/_mig-reportes-maquinaria.log](scripts/_mig-reportes-maquinaria.log) (10,008 líneas).
- `file_migration_log`: 11,447 `done` + 2 `error` al cerrar. NO contiene las 10,743 filas saltadas (nunca se tocaron por el script en esta etapa).

**Tareas pendientes Bloque B (orden sugerido):**

1. **Reintentar los 2 errores** (el script salta `done` y reintenta `error`):

   ```bash
   npx tsx scripts/migrate-files-to-storage.ts --table=reportes_maquinaria_pdf --step=migrate --concurrency=8
   ```

2. **Auditar las ~10,743 URLs rotas** en `reportes_maquinaria.pdf_url`. Opciones:
   - (a) Re-migrar desde Bubble → patch en `classifyUrl` ([scripts/migrate-files-to-storage.ts:176-181](scripts/migrate-files-to-storage.ts#L176-L181)) para detectar `/public/reporta-files/` y tratarlo como `bubble_cdn` forzado; requiere que `bubble_id` siga apuntando al original en Bubble.
   - (b) Verificar si los objetos viven en otro bucket con mismo path (quizás `reporte-maquinaria`) → rewrite SQL del host en DB sin re-descargar.
   - Prioridad: **antes del cutover del 2026-04-19**, si no el 48% de los reportes queda con PDF roto.
3. **Verificar los otros 4 targets** del Bloque B contra el mismo problema. Ya confirmados sanos: `maquinaria_documentos.archivo_url` (→ `doc_maquinarias`) y `cotizaciones.pdf_url` (→ `cotizaciones`). Pendientes: `maquinarias.foto_url` y `reportes_maquinaria.firma_cliente_url`.
4. **Limpiar log temporal**: borrar [scripts/_mig-reportes-maquinaria.log](scripts/_mig-reportes-maquinaria.log) tras cerrar los puntos anteriores. Añadir `scripts/_mig-*.log` a `.gitignore` si no está.

---

## 4. Resumen MIG-VALIDACION (ejecutado 2026-04-12)

### Bloque A — COMPLETADO ✅

| Paso | Alcance | Script | Resultado |
|---|---|---|---|
| A.1 | `formato` → `plantillas` (161 × 2) | `migrate-plantillas.ts` | ✅ 322 (688 secciones, 7,456 preguntas, 0 errores) |
| A.2 | `plan_de_accion` → `planes_accion` (386) | `migrate-planes-accion.ts` | ✅ 20 CISE + 366 GRUAS, 0 FK misses |
| A.3 | `cotizaciones_matriz_responsabilidad` — reparar huérfanos | `fix-matriz-orphans.ts` | ✅ 30 repairdos, 1,062 borrados. Final: 52,108 |
| A.4 | Gaps pequeños | `fix-gaps-mig.ts` | ✅ `terceros_sitios` cerrado (+4), `maquinaria_documentos` y `cotizaciones_detalle` aceptados (NOT NULL en destino) |
| A.5 | Huérfanos sin tenant_id | `fix-orphans-mig.ts` | ✅ 1,052 filas fantasma vacías eliminadas en facturas_*_item; `tipos_precio` mantenido (catálogo global) |

**Totales post A.1..A.5:**

- **117,150+** registros en **23+ tablas** principales
- **Gaps per-tenant cerrados al 100%** en todas las tablas excepto 3 con razón técnica documentada:
  - `maquinaria_documentos` -1 GRUAS (doc sin link)
  - `cotizaciones_detalle` -58 (detalles sin parent)
  - `facturas_venta_item` -2,737 (huérfanos documentados sin valoración padre)

### Bloque B — PENDIENTE 🔴

Migrar ~33,110 archivos de Bubble S3 → Supabase Storage. Ver plan completo en [TAREAS_PRIORIZADAS.md](TAREAS_PRIORIZADAS.md) → Bloque B.

### Bloque C — PENDIENTE ⏳

Verificar con cliente si `/api/1.1/obj` (prod Bubble) tiene los mismos datos que `/version-test/` (dev). Si difiere, re-ejecutar scripts apuntando al entorno correcto.

---

## 5. Bubble types con nombres no obvios (referencia)

| Tabla Supabase | Tipo Bubble real | Campo tenant | Nota |
|---|---|---|---|
| `servicios` | `servicio` (singular) | `tenant_id` | |
| `maquinarias` | `maquinaria` (singular) | `tenant_id` | |
| `maquinaria_documentos` | `maquinaria_documento` (singular) | `tenant_id` | `bubble_id` = composite `${doc._id}_${maqBubbleId}` |
| `terceros` | `tercero` (singular) | `tenant_id` | |
| `profiles` | `user` | `Id_tenant` | |
| `tareas` | `tareas` | `id_empresa` | No-estándar |
| `reportes_maquinaria` | `maquinaria_reporte_horas_new` | `tenant_id` | |
| `reportes_usuario` | `usuario-reporte-horas-new` | `id_empresa` | Guion medio |
| `plantillas` | `formato` (+ `formato_seccion` + `formato_pregunta`) | sin tenant | Duplicado por tenant (161 × 2 = 322) |
| `planes_accion` | `plan_de_accion` = `accion_correctiva` | `id_empresa` | Dos nombres, mismos registros |
| `cotizaciones_matriz_responsabilidad` | `cotizaciones_matriz_responsabilidad` | `tenant_id` | ⚠️ `responsable_empresa` es BOOLEAN, no tenant |
| `terceros_contactos` | `terceros_contactos` | `tenan_id` (typo — falta `t`) | Fallback a tenant del tercero padre |

---

## 6. Registros huérfanos residuales (post A.5)

| Tabla | Count | Naturaleza |
|---|---|---|
| `tipos_precio` | 20 NULL tenant | Catálogo global compartido — intencional, no migrar |
| `cotizaciones_detalle` | 58 en Bubble sin padre | Garbage origen, NOT NULL en destino — no migrable |
| `maquinaria_documentos` | 1 en Bubble sin link | Garbage origen — no migrable |
| `facturas_venta_item` | 2,737 huérfanos per-tenant | `valoracion_id` sin padre en Bubble — documentado |

---

## 7. Nota sobre entorno Bubble

> ⚠️ Todos los scripts usan el entorno **desarrollo** de Bubble (`/version-test/`).
> Antes de la migración final de producción, confirmar con el cliente que dev y prod tienen los mismos datos.
> URL producción Bubble: `https://reporta.bubbleapps.io/api/1.1/obj` (sin `/version-test`).
