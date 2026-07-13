# RUNBOOK — Cutover Domingo Bubble → Supabase Producción

> **Audiencia:** quien ejecute la migración final.
> **Actualizado:** 2026-04-15 (re-programado de 2026-04-19 → 2026-04-26 por pendientes de UI + inspecciones)
> **Fecha objetivo del cutover:** domingo **2026-04-26**

---

## TL;DR

Un solo comando:

```bash
BUBBLE_API_URL=https://reporta.la/api/1.1/obj npx tsx scripts/migrate-all-prod.ts
```

Corre **19 fases** en orden, escribe log completo a `logs/migrate-all-prod-<timestamp>.log`.
Si cualquier fase falla, imprime el `--from=<faseId>` exacto para retomar.

---

## ETA estimado: ~3 h 30 min – 4 h 30 min

> Dress-rehearsal contra `version-test` (2026-04-16): **40m 15s**, 19/19 OK.
> Prod será más lento por Bloque B (33K archivos download+upload con concurrency=8, ~60-90 min).

| Fase | Contenido | version-test | Prod est. |
|---|---|---:|---:|
| `mig2a` | terceros base | 3s | 3 min |
| `mig2b` | terceros_contactos + terceros_sitios | 6m 42s | 7 min |
| `mig2c` | maquinaria: modelos / tipos_docs / maquinarias / documentos | 7m 56s | 10 min |
| `mig2d` | servicios + usuarios | 2m 1s | 3 min |
| `mig3` | cotizaciones (2,555) + detalle (4,059) | 46s | 5 min |
| `mig4` | facturas venta/compra + items (~45k) | 4m 26s | 15 min |
| `mig4b` | pagos facturas (543) | 6s | 1 min |
| `mig5` | tareas (13,738) | 1m 29s | 5 min |
| `mig6` | reportes maquinaria + usuario (~47k) | 4m 59s | 20 min |
| `mig6b` | valorizaciones (752) | 14s | 1 min |
| `mig7` | catálogos locales (131 seeds) | 8s | 1 min |
| `blockA` | plantillas + planes_accion + fixes | 1m 51s | 5 min |
| `inspecciones` | Bubble informes → inspecciones + link planes | 2m 44s | 5 min |
| `profileDetail` | profile_detail2 → profiles UPDATE | 20s | 1 min |
| `gastos` | usuario_gastos → gastos_usuario (3,277) | 23s | 1 min |
| `batch2` | user_docs + maq_horas + informe_obj + cot_rechazo + svc_precios | 1m 35s | 5 min |
| `respuestas` | informe_respuesta 2026 → inspecciones_detalles (25K) | 2m 41s | 5 min |
| **`blockB`** | **~33k archivos a Storage con concurrency=8** | 38s* | **~60–90 min** |
| `audit` | audit-mig-full.ts (5 partes) | 1m 6s | 10 min |
| **Total** | **19 fases** | **40m 15s** | **~3 h 30 min – 4 h 30 min** |

> *blockB en version-test es rápido porque los archivos ya están en Storage (upsert no-op).

### Por qué Bloque B toma ~1 h y no 9 h

El bench del drain secuencial mostró 34 archivos/min → 9 h totales.
Con `--concurrency=8` (worker pool) se paraleliza download+upload:
`~33,000 archivos / (34 × 8) ≈ 60 min` (techo práctico por latencia de upload).

Es el mayor lever. Nunca correr Bloque B sin `--concurrency`.

---

## Pre-requisitos (una sola vez antes del domingo)

1. **Aplicar migrations SQL pendientes** via Supabase dashboard → SQL Editor:
   - `supabase/migrations/20260410000000_add_pin_rate_limiting.sql`
   - `supabase/migrations/20260412000000_add_plantillas_bubble_id.sql`
   - `supabase/migrations/20260412000100_add_planes_accion_bubble_id.sql`
   - `supabase/migrations/20260412000200_create_file_migration_log.sql`
2. **Verificar que existen los 5 buckets Storage:**
   `maquinarias`, `doc_maquinarias`, `cotizaciones`, `reporte-maquinaria`, `reporta-maquinaria-fotos`
3. **`.env.local` con credenciales de producción:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BUBBLE_API_TOKEN`
4. **(Opcional pero recomendado)** dress-rehearsal en versión test durante la semana:
   ```bash
   npx tsx scripts/migrate-all-prod.ts
   ```
   (sin `BUBBLE_API_URL` cae al default `version-test`)

---

## El día del cutover — paso a paso

### 0. Confirmar ventana y anunciar

- Avisar a CISE y GRUAS que el sistema va a estar "solo lectura" durante la ventana.
- Horario sugerido: **domingo madrugada**, 00:00–06:00 local.

### 1. Snapshot de Supabase actual (rollback plan)

En el dashboard de Supabase → Database → Backups: crear snapshot manual.
Nombrarlo `pre-cutover-2026-04-26` (o fecha real).
Si algo sale mal: restore desde este punto.

### 2. Limpiar `file_migration_log` (opcional)

Si corriste Bloque B contra test recientemente, limpiá el log para no confundir status:

```sql
TRUNCATE public.file_migration_log;
```

### 3. Lanzar el orchestrator

```bash
cd /c/Proyectos/reportaweb3
BUBBLE_API_URL=https://reporta.la/api/1.1/obj npx tsx scripts/migrate-all-prod.ts 2>&1 | tee logs/cutover-$(date +%Y%m%d-%H%M).log
```

**Importante:** `BUBBLE_API_URL` debe apuntar al endpoint **prod** (sin `/version-test/`).

El orchestrator imprime:

```
╔══════════════════════════════════════════════════════╗
║  ▶ MIG-2a — terceros base                            ║
╚══════════════════════════════════════════════════════╝

$ npx tsx scripts/migrate-terceros-bubble.ts
...
  ↳ exit=0  (2m 14s)
  Phase mig2a done in 2m 14s
```

Al final imprime el summary con tiempos por fase.

### 4. Si una fase falla

El orchestrator aborta y te dice:

```
  ❌ Phase mig5 failed on command: scripts/migrate-tareas-mig5.ts
  Aborting. To resume: --from=mig5
```

Diagnosticá el error en el log, arreglalo y re-lanzá desde esa fase:

```bash
BUBBLE_API_URL=https://reporta.la/api/1.1/obj npx tsx scripts/migrate-all-prod.ts --from=mig5
```

(Todos los scripts son idempotentes vía `bubble_id`, re-correr no duplica.)

### 5. Post-cutover — verificación

El `audit` final imprime conteos Bubble vs Supabase por tabla y por tenant. Revisar que:

- **Parte 1** — Cobertura `bubble_id`: todas las tablas en 100% (excepto catálogos locales sin padre Bubble).
- **Parte 3** — Huérfanos `tenant_id`: cero en tablas con tenant.
- **Parte 4** — Archivos: `~0` pending en Bubble/S3 (columna "S3/Bubble" debería ser 0 excepto ruido marginal de filas sin archivo en Bubble).
- **Parte 5** — Por tenant: gaps en `0 ✅` o justificados en `COMO MIGRAR.md`.

### 6. Rotar claves Supabase

Una vez confirmado que la app funciona contra los datos nuevos:

- Supabase dashboard → Settings → API → rotar `anon` key y `service_role` key.
- Actualizar `.env.local`, `.env.production`, y variables de entorno en el hosting (Vercel/etc.).

### 7. Anunciar el cierre de ventana

- Mensaje a CISE y GRUAS: sistema operativo en producción Supabase.
- Mantener Bubble en modo read-only por 7 días como salvaguarda antes de desactivarlo definitivamente.

---

## Comandos útiles durante el cutover

### Ver progreso de Bloque B en vivo

```bash
# En otra terminal, mientras corre blockB:
watch -n 10 "npx tsx -e \"
  import('@supabase/supabase-js').then(({createClient}) => {
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    s.from('file_migration_log').select('*', {count:'exact', head:true}).eq('status','done').then(r => console.log('done:', r.count));
  })
\""
```

### Correr una sola fase (debug)

```bash
BUBBLE_API_URL=https://reporta.la/api/1.1/obj \
  npx tsx scripts/migrate-all-prod.ts --phase=mig6
```

### Dry-run (muestra comandos sin ejecutar)

```bash
npx tsx scripts/migrate-all-prod.ts --dry-run
```

---

## Fases del orchestrator — detalle

| ID | Label | Scripts invocados |
|---|---|---|
| `mig2a` | terceros base | `migrate-terceros-bubble.ts` |
| `mig2b` | contactos + sitios | `migrate-terceros-contactos.ts`, `migrate-sitios-full.ts` |
| `mig2c` | maquinaria | `migrate-maquinaria-bubble.ts --step {modelos,tipos_docs,maquinarias,documentos}` |
| `mig2d` | servicios + usuarios | `migrate-services.ts`, `migrate-users.ts` |
| `mig3` | cotizaciones | `migrate-cotizaciones-detalle.ts`, `migrate-cotizaciones-gap.ts` |
| `mig4` | facturas | `migrate-facturas-items.ts --step=all` |
| `mig5` | tareas | `migrate-tareas-mig5.ts` |
| `mig6` | reportes | `migrate-reportes-mig6.ts --step=all` |
| `mig7` | catálogos seed | `seed-catalogos-mig7.ts` |
| `blockA` | fixes post-MIG | `migrate-plantillas.ts`, `migrate-planes-accion.ts`, `fix-matriz-orphans.ts`, `fix-gaps-mig.ts`, `fix-orphans-mig.ts` |
| `blockB` | archivos | `migrate-files-to-storage.ts --table={maquinarias,maquinaria_documentos,cotizaciones,reportes_maquinaria_firma,reportes_maquinaria_pdf} --concurrency=8` |
| `audit` | verificación | `audit-mig-full.ts` |

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Bubble prod tiene campos distintos que test | Media | Dress-rehearsal con `--phase=mig2a` primero; si falla, inspeccionar Bubble schema antes de continuar. |
| Supabase Storage 502 transitorios | Baja | Script ya retry-ea descargas; errores se re-intentan al re-correr el script (el log usa estado `error` que no es `done`). |
| Ventana se excede | Baja | Monitor progreso por fase; si `mig6` o `blockB` se extiende, el resto del sistema ya está migrado (solo faltarían PDFs). |
| Credenciales prod incorrectas | Media | Doble-check de `.env.local` antes de empezar, con una corrida `--phase=audit` (no modifica nada, solo lee). |
| Bubble API token vencido | Baja | Probar con un fetch manual contra `/api/1.1/obj/tercero?limit=1` antes de empezar. |

---

## Contacto de emergencia

- Supabase support: dashboard → Support → abrir ticket con el snapshot ID de paso 1.
- Bubble support: solo si hay un bug en su API (ej. 500 repetido). Poco probable.
- Rollback total: restaurar snapshot de paso 1 desde Supabase dashboard; volver a apuntar el frontend al Bubble original.
