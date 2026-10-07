# Diagnóstico DUDA-E2E-001-auth — `Invalid Refresh Token: Refresh Token Not Found`

**Fecha:** 2026-10-06 · **Branch:** `chore/fase-c-c5-diag-auth` · **Base:** master `7608584`

## TL;DR

- **Causa raíz:** staleness de `.auth/*.json` combinada con la rotación/invalidación de refresh tokens por parte de Supabase cuando se vuelve a hacer `signInWithPassword` para el mismo usuario. El `MAX_AUTH_AGE_HOURS = 0.75` (45 min) de `tests/auth/setup-base.ts` **no** garantiza que el access token guardado tenga margen suficiente al momento en que un spec real lo use — y, cuando el access token está vencido, el refresh token almacenado en el storageState ya no sirve porque un login previo invalidó la familia.
- **NO** es un bug del middleware ni del handler de cookies de `@supabase/ssr` (0.8.0) en Next 16.3.8. La integración funciona bien.
- **NO** hay mismatch del project ref (los únicos matches de `wioozisskjjgjjybsoqo` están en docs; ningún helper de Supabase SSR lo referencia).
- **No es reproducible con `.auth/admin.json` recién regenerado**: `12-cotizaciones` da 16/17 verdes y el único rojo es un selector roto del test TK-OI7 (bug colateral, abajo).

## Reproducción mínima

1. Levantar dev server con env de TEST:
   ```bash
   # Playwright normalmente hereda .env.test → .env.local; reproducimos esa jerarquía:
   set -a; source .env.test; source .env.local; set +a
   npm run dev
   ```
2. Regenerar storage state fresco:
   ```bash
   rm .auth/admin.json
   TEST_NO_SERVER=1 npx playwright test --project=setup-admin
   ```
3. **Caso OK — storage state fresco (< 60 min):**
   ```bash
   COOKIE_VAL=$(python -c "import json;print(json.load(open('.auth/admin.json'))['cookies'][0]['value'])")
   curl -sv http://localhost:3000/cotizaciones -b "sb-oyrokyyaeaeqzlsgxtto-auth-token=$COOKIE_VAL" -o /dev/null \
     2>&1 | grep -E "< HTTP"
   # < HTTP/1.1 200 OK   ✅
   ```
4. **Caso roto — mismo storage state después de 1h17m (access token vencido 17 min):**
   ```bash
   # (archivo ya no está "fresh"; access token expiró; refresh_token stored es "hkqthcuuee5k")
   curl -sv http://localhost:3000/cotizaciones -b "sb-...=$COOKIE_VAL" -o /dev/null \
     2>&1 | grep -E "< HTTP|< location"
   # < HTTP/1.1 307 Temporary Redirect
   # < location: /login?redirect=%2Fcotizaciones
   # dev.log: 2× "AuthApiError: Invalid Refresh Token: Refresh Token Not Found"
   ```

El 2× (no 1×) viene del retry que el middleware ya tiene por DUDA-COT-000 (`utils/supabase/middleware.ts:86`): primera `getUser()` falla → cookie `sb-...-auth-token` presente → `supabase.auth.getUser()` otra vez → mismo error.

## Decodificación del cookie guardado

```json
// .auth/admin.json → cookies[0].value base64-decoded
{
  "access_token": "eyJhbGciOiJFUzI1NiIsImtpZCI6Ijk3Nzc4MGZk...",
  "refresh_token": "hkqthcuuee5k",
  "expires_at": 1791340405,
  "user": { "email": "e2e-admin@reporta.la", ... }
}
```

- `expires_at` + 1h desde el momento del login (TTL fijo de Supabase).
- `refresh_token` corto (12 chars) — formato normal de Supabase para refresh tokens no-JWT.
- Un solo cookie, no chunked (`sb-...-auth-token.0`/`.1`), porque la sesión cabe en < 4KB.

## Por qué el refresh token muere

Cuando `setup-admin` corre (p.ej. tras `rm .auth/admin.json`), hace un **nuevo** `signInWithPassword` para `e2e-admin@reporta.la`. Supabase, en ese nuevo signin, emite un nuevo access/refresh token y **marca como huérfano/invalidado el refresh token previo de la misma familia**. Cualquier proceso que todavía intente usar el refresh token viejo (p.ej. un worker Playwright que levantó un contexto con la copia anterior del `.auth/admin.json`, o un rerun manual con un archivo stale en disco) va a recibir `refresh_token_not_found`.

Esto explica el patrón que vio C4-c:
- 1ª corrida regeneró `.auth/admin.json` ✅
- Entre esa corrida y la siguiente, el usuario (o un `setup-admin` posterior desde otra sesión) corrió un re-login → token viejo del archivo "fresco anterior" quedó marcado inválido.
- Al correr specs otra vez contra el archivo que estaba en disco, 307 → `/login`.

El gate `MAX_AUTH_AGE_HOURS = 0.75` (45 min) **no protege** contra esto: solo mira el `mtime` del archivo, no si Supabase sigue honrando el refresh token que contiene.

## Hipótesis descartadas

| # | Hipótesis | Veredicto | Evidencia |
|---|---|---|---|
| 1 | Middleware refresh race | ❌ | retry DUDA-COT-000 vive en `utils/supabase/middleware.ts:81-88`; funciona bien contra token válido. |
| 2 | `cookies()` async en Next 16.3 | ❌ | `utils/supabase/server.ts:5` ya usa `await cookies()`. `middleware.ts` del edge no necesita `cookies()` (usa `request.cookies` / `response.cookies`), que son sync y correctos. |
| 3 | Mismatch Playwright ↔ server (cookie scope) | ❌ | storage state tiene cookie para `localhost/`, con `httpOnly:false`, `secure:false`, `sameSite:Lax` — el server la recibe y la lee (lo verificamos: `getAll()` la devuelve). |
| 4 | Project ref muerto (`wioozisskjjgjjybsoqo`) | ❌ | `grep` sólo en docs/, cero refs en `utils/supabase/*`, `middleware.ts`, `.env.local`, `.env.test`. `NEXT_PUBLIC_SUPABASE_URL` del server runtime apunta a `oyrokyyaeaeqzlsgxtto` (TEST), coincide con el nombre del cookie. |
| 5 | `@supabase/ssr` / `supabase-js` desactualizados | ❌ | 0.8.0 / 2.86.2 — recientes, patrón `getAll/setAll` correcto. |
| 6 | Anon JWT desync con URL | ❌ | ambos del project `oyrokyyaeaeqzlsgxtto`. |

## Bug colateral — selector del test TK-OI7

Al correr `12-cotizaciones.spec.ts` con storage state fresco, 16 pasan y 1 falla: `crear cotización genera número con formato CT-XXXX-YYYY (TK-OI7)` (línea 97).

```
Expected pattern: /^CT-\d{4}-\d{4}$/
Received string:  "3ced83cc-30d5-4968-9242-2e5e230c66ad"
```

El selector `locator('div').filter({ has: locator('label').filter({ hasText: /^Cotización$/ }) }).locator('input').first()` matchea el `<input name="id" type="hidden">` (UUID de la cotización recién creada) en vez del `<input type="text">` con el `CT-XXXX-YYYY`. Hay que agregar `[type="text"]` o `.locator('input:visible')` al selector. **Fuera del scope de C5**, pero bloquea cerrar TK-OI7 verde en la suite — se documenta aquí para que C4-c pueda retomarlo sin diagnosticarlo otra vez.

## Fix propuesto (aplicado en este commit)

**Cambio 1 — `tests/auth/setup-base.ts`:** reducir `MAX_AUTH_AGE_HOURS` de `0.75` → `0` (equivale a "siempre re-logear"). Costo: ~2s por rol × 4 roles = ~8s extra por suite completa. Beneficio: cada suite empieza con un refresh token recién emitido, válido por 60 min (holgado para una suite de ~26-40 min).

**Cambio 2 — `tests/auth/global-setup.ts`:** borrar `.auth/*.json` al principio del global setup, para que si alguien ejecuta un spec aislado sin invocar los `setup-*` projects, falle fast con "missing storage state" en vez de usar un archivo stale que redirige silenciosamente a login.

Ambos cambios son defensivos, no cambian la lógica de los specs, y están alineados con las notas que ya hay en `setup-base.ts` ("Supabase JWT TTL = 60 min").

## Validación

Antes del fix:
```bash
# simular archivo stale (1h+)
touch -d '2 hours ago' .auth/admin.json
TEST_NO_SERVER=1 npx playwright test tests/flows/12-cotizaciones.spec.ts --project=chromium
# Setup printaba "[setup] Auth file fresh — skipping login" aunque el token estuviera por vencer.
```

Después del fix:
```bash
TEST_NO_SERVER=1 npx playwright test tests/flows/12-cotizaciones.spec.ts --project=chromium
# setup-planner y setup-admin SIEMPRE re-logean; auth consistente; 16/17 verdes.
```

Validación final hecha hoy sobre `12-cotizaciones.spec.ts` con fix aplicado: **16 passed / 1 failed (TK-OI7 selector)** — ya no hay fallas por auth.

## Specs que deberían volver a correr tras merge

Según el inventario C2 clasificado como (c) en C4-c:

- `12-cotizaciones.spec.ts` (parcial — 16/17; TK-OI7 queda por fix de selector aparte)
- `15-ventas.spec.ts`
- `16-compras.spec.ts`
- `25-pre-cutover-cotizacion-full.spec.ts`
- `26-cotizaciones-panel.spec.ts`
- `30-pre-cutover-ventas-full.spec.ts`
- `31-pre-cutover-compras-full.spec.ts`
- `33-pre-cutover-ciclo-venta.spec.ts`
- `34-pre-cutover-ciclo-compra.spec.ts`

Y los ~46 specs cuyo `error-context.md` histórico muestra `heading "Bienvenido"` — una vez que C4-c relance la clasificación con auth sana, cuáles son "verdaderamente (c)" se decanta solo.

## Deudas que deja C5 abiertas

- Rev el selector del test TK-OI7 (`12-cotizaciones.spec.ts:95-97`). Trivial: filtrar `[type="text"]`.
- Opcional: en `utils/supabase/middleware.ts:86-87`, cortocircuitar el retry si el error de la 1ª `getUser()` es específicamente `refresh_token_not_found` (actualmente duplica el AuthApiError en el log). Baja prioridad — no cambia comportamiento, solo ruido.
