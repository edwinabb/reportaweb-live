---
name: Patrones de queries Supabase en reportaweb3
description: Reglas técnicas aprendidas trabajando con el schema Supabase — FK ambiguos, joins, nombres de campos, enums
type: feedback
originSessionId: f5936be3-5903-4103-8660-45412a0df52e
---
# Patrones de queries Supabase

## FK ambiguo en `planes_accion.maquinaria_id` — usar FK explícito

**Regla:** al hacer join sobre `planes_accion.maquinaria_id`, siempre usar `maquinaria:maquinarias!planes_accion_maquinaria_id_fkey(...)` en el select string. NO usar `maquinaria:maquinarias(...)` a secas.

**Why:** el FK `planes_accion_maquinaria_id_fkey` está referenciado por 3 relaciones en el schema — la tabla `maquinarias` real **y** las views `view_valoraciones_compras` + `view_valoraciones_ventas`. Sin el FK explícito, Supabase rechaza la query por ambigüedad y `error` silencioso devuelve `[]` (sin warning visible). Durante el bloque 2.7 esto me costó ~30 min de debugging — al principio parecía que los datos simplemente no existían.

**How to apply:** vale para cualquier tabla cuyo FK apunte a una tabla que tenga views encima. Patrón general: `fieldName:Target!exact_fk_name(cols)`. El nombre exacto del FK está en `types/supabase.ts` (buscar `foreignKeyName:`). En caso de duda, **siempre logear el `error`** en las queries nuevas (`console.error('[nombreQuery] error:', error)`) — el silencio de Supabase es traicionero.

## `getTareas` en `lib/actions/planificacion.ts` tiene un join roto

**Regla:** si necesitás asignaciones de tareas, no confíes en `tarea.asignaciones` del resultado de `getTareas()`. Usá `getAvailability()` directamente.

**Why:** el select es `asignaciones:asignaciones(*)` pero la tabla real se llama `tareas_recursos`. El alias sintáctico `alias:fk_name(*)` busca una FK llamada `asignaciones` que no existe, así que el campo siempre viene vacío. Detectado durante 2.5. Pendiente como deuda §3.4.

**How to apply:** para implementar algo que necesite asignaciones, importar `getAvailability(startIso, endIso)` que sí está correcta. La fix definitiva del join requiere cambiar el select a `asignaciones:tareas_recursos(*)` o disambiguar por FK.

## `profiles` no tiene `avatar_url` ni `full_name`

**Regla:** para mostrar un profile, usar `first_name + last_name` (concatenar) o `email` como fallback. Para avatar, solo iniciales (no hay foto).

**Why:** el schema `profiles` tiene `first_name`, `last_name`, `email`, `doc_number`, `phone`, `birthday`, `direccion`, `contacto_emergencia_*`. No tiene `avatar_url` ni `full_name` (a pesar de que varios snippets viejos intenten usarlos — señal de refactor pendiente).

**How to apply:** helpers estándar: `profileLabel(first, last, email)` devuelve `"First Last"` o `email` o `"Sin nombre"`; `profileInitials(first, last, email)` devuelve 2 chars o 1. Ya implementados en [components/planes/planes-columns.tsx](components/planes/planes-columns.tsx) y el detail page — reusar el patrón.

## Enum `maquinaria_propietario`: `'propio' | 'tercero'`

**Regla:** al filtrar maquinarias por pertenencia, usar literalmente `'propio'` o `'tercero'`. Ventas = `'propio'`, Compras = `'tercero'`.

**Why:** views de panel (`view_ventas_pendiente_valorizar`, `view_compras_pendiente_valorizar`, etc.) dependen de este filtro. Si alguien agrega un tercer valor al enum sin actualizar las views, se rompen silenciosamente.

**How to apply:** para cualquier view nueva relacionada con reportes/valorizaciones, hacer `INNER JOIN maquinarias m ON r.maquinaria_id = m.id AND m.propietario = 'propio'` (ventas) o `'tercero'` (compras).

## Storage bucket para fotos de planes/inspecciones

**Regla:** evidencias de planes de acción se suben a `reporta-maquinaria-fotos` bajo path `planes-accion/{tenant_id}/{plan_id}/{timestamp}.{ext}`.

**Why:** no hay bucket dedicado `planes-accion-evidencias`. Reutilizamos el bucket existente en [lib/actions/planes.ts](lib/actions/planes.ts) (`EVIDENCIA_BUCKET`). Los 5 buckets oficiales son: `maquinarias`, `doc_maquinarias`, `cotizaciones`, `reporte-maquinaria`, `reporta-maquinaria-fotos` + `doc_usuarios`.

**How to apply:** si se quiere bucket dedicado en el futuro, crear `planes-accion-evidencias` en Supabase dashboard y cambiar la const `EVIDENCIA_BUCKET` — el path structure ya está preparado.

## `tareas.sitio` — columna es `sitio TEXT NULL`, no `sitio_nombre`

**Regla:** al seleccionar campos de localización en la tabla `tareas`, usar la columna `sitio` (TEXT, nullable). No existe `sitio_nombre`.

**Why:** en v1.8.5 (mayo 2026) el TAREAS_SELECT de la app (`lib/queries/tareas.ts`) usaba `sitio_nombre` que no existe. Esto generaba un **error silencioso** — PostgREST devolvía 0 resultados en lugar de error visible, haciendo que el panel no mostrara ninguna tarea. El bug se manifestó especialmente porque muchas tareas tienen `sitio = NULL` y eso era legítimo; el campo simplemente no existe con ese nombre.

**How to apply:** en `mapTarea` usar `sitio_nombre: raw.sitio ?? null`. Si se añaden campos nuevos del schema de `tareas`, verificar los nombres exactos en Supabase Studio antes de incluirlos en el select string — un typo en el select no arroja error, simplemente filtra todas las filas.

## Join aliases de Supabase devuelven arrays por default

**Regla:** al tipar el resultado de un join que esperás 1:1, castear via `unknown` y acceder defensivamente con optional chaining.

**Why:** Supabase JS client devuelve un objeto para many-to-one en runtime, pero los types generados lo tipan como array `[]`. Casting directo falla con "neither type sufficiently overlaps." Al castear via `unknown` (p.ej. `data as unknown as MyShape[]`), tsc lo acepta y en runtime funciona si la relación es many-to-one.

**How to apply:** ejemplos en [lib/actions/planes.ts](lib/actions/planes.ts) (`getPlanesAccion`, `getPlanesAggregates`). Usar `row.maquinaria?.nombre` en vez de `row.maquinaria.nombre` para tolerar ambos casos.
