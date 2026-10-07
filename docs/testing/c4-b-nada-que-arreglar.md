# FASE C4-b — Grupo Planificación / Informes / EPP: nada que arreglar por template v1.2

**Fecha:** 2026-10-06 · **Branch:** `chore/fase-c-c4b-planificacion-informes-epp` · **Base:** master `b5d6a4a`.

## Resumen

El inventario estático de C2 (`docs/testing/inventario-e2e-2026-10.md`) marcó **1 spec de este grupo como roto por template v1.2 (categoría (a))**: `42-pre-cutover-navegacion.spec.ts` (sin breadcrumb). Al correrlo en vivo tras C2bis + C3 + D0:

```
10 passed (19.0s)
```

El spec está escrito defensivamente — usa `.isVisible({ timeout: X })` + `[INFO]` logs en vez de hard-asserts sobre breadcrumbs. No requiere cambios.

## Specs del grupo corridos

| Spec | Rol | Resultado |
|---|---|---|
| 42-pre-cutover-navegacion | admin | ✅ 10/10 pass |
| 06-ver-reportes | planner | ❌ failing — ver nota (c) abajo |
| 07-epp-alertas-emails | planner | ❌ failing — ver nota (c) |
| 13-planes-accion | planner/viewer | ❌ failing — ver nota (c) |
| 14-epp-completo | admin | ❌ failing — ver nota (c) |

**No corridos (quedan como futuro trabajo):** 08-formatos-informes, 24-pre-cutover-epp-full, 26-pre-cutover-planificacion-full, 27-pre-cutover-reportes-full, 28-pre-cutover-informes-full, 29-pre-cutover-planes-full, 36-pre-cutover-epp-extra, 40-pre-cutover-informes-checklist.

## Nota (c): fallas de dev-server / env — NO template v1.2

Los specs que fallaron (16 fallos en el batch 06/07/13/14) **no fallan por selectores v1.2**. Todos coinciden en `net::ERR_CONNECTION_REFUSED` o `redirect to /login?redirect=/epp` tras minutos de corrida. Causa raíz detectada durante C4-b:

1. **`.env.local` no tiene `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`** — están comentados en el bloque PROD de ese archivo. `next dev` standalone falla con `Your project's URL and Key are required to create a Supabase client!`.
2. El `webServer` que C2bis agregó a `playwright.config.ts` funciona porque Playwright carga `.env.test` y lo pasa al subprocess del dev server (ahí sí están las vars).
3. **Múltiples dev servers vivos al mismo tiempo** (restos de C2bis + mi arranque) chocan en puerto 3000 → Next elige 3002 → el segundo quit inmediato → Playwright se queda sin server a los pocos minutos de la corrida.
4. El `/epp` redirect-to-login observado en spec 14 (que usa `.auth/admin.json` fresco) sucedió DESPUÉS de que el dev server local muriera; cuando ocurre `ERR_CONNECTION_REFUSED`, los tests subsiguientes también fallan de forma colateral.

## Conclusión

- **Nada que arreglar en código de specs para este grupo** por template v1.2.
- Lo que resta cae en **(c) infra**: estabilizar el ciclo `webServer + .env` para que la suite complete sin que el dev server muera (varios tests concurrentes del template v1.2 cargan datasets de 13k filas en Turbopack dev — esperable que estrese el server). Fuera de scope v1.2; apuntar como C4-b-residual para un plan de "estabilidad de dev server bajo carga de E2E" si vuelve a aparecer.

## Recomendación operacional

1. Levantar solo UN dev server (`npm run dev`), aislado, antes de correr el bloque.
2. Correr siempre con `TEST_NO_SERVER=1` cuando ya se tiene dev server externo para evitar el choque de puertos.
3. Para `npm run dev` standalone: agregar `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.local` apuntando a TEST (ya existe TEST en `.env.test` pero `next dev` no lee `.env.test` por default — solo lee `.env.local` + `.env.development.local`).

## Confirmación específica para C4

- **Spec 42 (único marcado (a) para este grupo):** verde sin tocar.
- **5 specs rotos por v1.2 que el inventario C2 priorizó:** 12 (Ventas/Compras/Cot), 21/22/23 (Users/Maq/Terc), 42 (nav). De los 5, el único de C4-b era 42 → cerrado. Los otros 4 corresponden a C4-a (21/22/23) y C4-c (12). Este grupo contribuye 0 fixes de template v1.2.
