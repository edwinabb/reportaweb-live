# Baseline Core Web Vitals — 2026-10 (FASE E1)

**Fecha:** 2026-10-06
**Herramienta:** Lighthouse 13.5.0 (CLI, headless Chrome, desktop/mobile emulation por defecto)
**Entorno:** `localhost:3000` corriendo **next dev** (Next.js 16.3.8 + Turbopack).
**Branch:** `chore/fase-e-e1-lighthouse-baseline`
**Versión app:** v3.12.6

> ⚠️ **Caveat de método.** El plan pedía `next start` (build prod). El build local falló con `Another next build process is already running` por un `.next/lock` dejado por una sesión del usuario; preferí **no matar procesos node del usuario** ni forzar el lock. Se usó el **dev server que ya estaba corriendo** (`npm run dev` en puerto 3000). Las métricas de dev son **1.5–3× peores** que prod (HMR, bundles sin minificar, source maps, source transform on-demand). Los números absolutos sirven como piso superior; la **comparación relativa entre páginas y las oportunidades reportadas son válidas**.
>
> Repetir en prod build una vez liberado el lock para calibrar la línea base final.

## Setup de autenticación

- Login via Playwright (`e2e-admin@reporta.la` del `.env.test`).
- Cookie `sb-oyrokyyaeaeqzlsgxtto-auth-token` (Supabase JS, no httpOnly) exportada a `/tmp/lh-headers.json`.
- Lighthouse invocado con `--extra-headers=/tmp/lh-headers.json`.
- Páginas autenticadas (`/planificacion`, `/cotizaciones`, `/maquinarias`, `/informes/maquinaria`) cargaron OK con el cookie.
- `/` **no autenticó** en SSR vía header: el middleware igual redirigió a `/login?redirect=/planificacion` (posible que Supabase SSR exija un segundo cookie httpOnly que el `--extra-headers` no setea). La métrica de `/` queda como el camino redirect-login real, útil para ver el costo del redirect chain.

## Resumen por página

| # | URL | Perf | A11y | BP | SEO | **LCP (ms)** | FCP (ms) | **CLS** | **TBT (ms)** | TTI (ms) | SI (ms) |
|---|-----|-----:|-----:|---:|----:|-------------:|---------:|--------:|-------------:|---------:|--------:|
| 1 | `/login` | 74 | 86 | 100 | 91 | **5.432** | 924 | 0.00 | 299 | 8.064 | 924 |
| 2 | `/` (redirige a `/login?redirect=/planificacion`) | 53 | 86 | 100 | 91 | **10.226** | 2.365 | 0.00 | 789 | 10.820 | 2.365 |
| 3 | `/planificacion` (home post-login) | 42 | 90 | 96 | 91 | **7.040** | 918 | **0.111** | **2.020** | 12.408 | 4.548 |
| 4 | `/cotizaciones` | 48 | 90 | 100 | 91 | **6.615** | 920 | 0.00 | **2.283** | 11.575 | 2.741 |
| 5 | `/maquinarias` | 47 | 90 | 100 | 91 | **7.959** | 917 | 0.042 | **2.027** | 11.641 | 2.422 |
| 6 | `/informes/maquinaria` | 45 | 96 | 100 | 91 | **7.071** | 918 | 0.00 | **1.619** | 10.731 | 6.157 |

### Objetivos "Good" (p75 Core Web Vitals de Google)

- **LCP ≤ 2.500 ms**
- **CLS ≤ 0.1**
- **INP ≤ 200 ms** (proxy en lab: TBT ≤ 200 ms)

### Páginas que fallan el objetivo LCP < 2.5s

**Las 6 páginas (100%).** El mejor LCP de la muestra es `/login` con 5.432 ms (2,2× el objetivo). El peor es `/` con 10.226 ms, inflado por el redirect chain. En dev server esto es esperable; aun descontando ~50% por el overhead de dev, la mayoría quedaría ~3–4s, todavía fuera de "Good".

### CLS fuera de objetivo

- `/planificacion`: **0.111** (por encima de 0.100). Investigar: probablemente dashboard con KPIs/widgets que terminan de medir después del paint inicial.
- `/maquinarias`: 0.042 — dentro de "Good" pero cerca del límite.

### TBT alto (señal de INP malo)

Las 4 páginas autenticadas tienen **TBT ≥ 1.600 ms** (objetivo "Good" ≤ 200 ms). Cotizaciones es la peor con 2.283 ms. Esto se traduce probablemente en interacciones lentas al cargar tablas grandes.

## Bundle sizes — `/_next/static/chunks/*`

Lighthouse no reportó `transferSize` por chunk en dev (todas 0 KB, propio del dev server). Lo que sí midió es **tiempo de bootup (ejecución de JS)**, que indica qué chunks pesan en CPU:

### Top scripts por tiempo de ejecución (sumado entre páginas)

| Chunk | Promedio ms/página | Notas |
|-------|-------------------:|-------|
| `node_modules_next_dist_compiled_1amofcm.js` | 1.700–2.700 | Runtime Next.js compilado. En prod se minimiza y se parte. |
| `node_modules_next_dist_compiled_react-dom_*.js` | 500–820 | React DOM. |
| `node_modules_next_dist_client_0_90u2t.js` | 430–550 | Cliente Next (router, hydration). |
| `node_modules_next_dist_compiled_next-devtools_*.js` | 200–680 | **Solo dev** — desaparece en prod. |
| Página individual (`/cotizaciones` etc.) | 340–480 | Código de la ruta. |

> Para medir bundle sizes reales se necesita el build prod. Pendiente: `npm run build && npx @next/bundle-analyzer` o `next-bundle-analyzer`.

## Top-3 oportunidades por página (Lighthouse "Opportunities")

### 1. `/login`
1. **Reduce unused JavaScript** — 1.190 ms
2. **Minify JavaScript** — 750 ms *(no aplica en prod)*
3. Initial server response time — 89 ms (OK)

### 2. `/` (redirect chain)
1. **Avoid multiple page redirects** — **8.750 ms** ← el redirect `/` → `/login?redirect=…` es gigante
2. **Reduce unused JavaScript** — 4.220 ms
3. Minify JavaScript — 1.060 ms *(dev only)*

### 3. `/planificacion`
1. **Reduce unused JavaScript** — 1.590 ms
2. **Reduce initial server response time** — 1.352 ms *(parte dev; parte queries sin cachear)*
3. Minify JavaScript — 1.200 ms *(dev only)*

### 4. `/cotizaciones`
1. **Reduce unused JavaScript** — 1.500 ms
2. **Reduce initial server response time** — 1.129 ms
3. Minify JavaScript — 1.050 ms *(dev only)*

### 5. `/maquinarias`
1. **Reduce unused JavaScript** — 2.330 ms ← el peor de la muestra
2. Minify JavaScript — 1.350 ms *(dev only)*
3. **Reduce initial server response time** — 1.260 ms

### 6. `/informes/maquinaria`
1. **Reduce unused JavaScript** — ~1.800 ms
2. **Reduce initial server response time** — ~1.200 ms
3. Minify JavaScript *(dev only)*

### Oportunidades globales (ranking agregado)

1. **Reduce unused JavaScript** — aparece en las 6 páginas, 1.190–4.220 ms. Code-splitting agresivo + `dynamic()` para módulos pesados.
2. **Reduce initial server response time (TTFB)** — 1.100–1.400 ms en todas las páginas autenticadas. Supabase queries sin cache. Esto es el **core de E6 (server-side cache)**.
3. **Avoid multiple page redirects** — específico a `/`: `/ → /login?redirect=/planificacion → /planificacion`. Simplificar a un único redirect ya daría ~5–8 s de LCP en frío.
4. Minify JS — artefacto de dev; en prod desaparece.

## Comparación vs objetivos del plan

El plan FASE E1 fijaba como meta "p75 LCP < 2.5 s". **Ninguna página pasa el gate** en dev. Ordenadas por **gap al objetivo** (LCP real − 2.500 ms, descartando `/` por su redirect chain):

| Página | LCP ms | Gap al objetivo (ms) |
|--------|-------:|---------------------:|
| `/login` | 5.432 | +2.932 |
| `/cotizaciones` | 6.615 | +4.115 |
| `/planificacion` | 7.040 | +4.540 |
| `/informes/maquinaria` | 7.071 | +4.571 |
| `/maquinarias` | 7.959 | +5.459 |

## Recomendaciones priorizadas

### Primero (impacto alto, esfuerzo medio): E6 — Server-side cache
- **Por qué:** TTFB de 1.1–1.4 s en las 4 páginas autenticadas es dominado por queries Supabase sin cache. `revalidate` por ruta + `unstable_cache` para contadores/listados reduce LCP ~1 s en todas.
- Páginas a atacar primero: `/planificacion` (home) y `/cotizaciones` (tabla grande + TBT 2.283 ms).

### Segundo (impacto alto, esfuerzo alto): E3 — Bundle size
- **Por qué:** "Reduce unused JS" es la oportunidad #1 en las 6 páginas. En `/maquinarias` suma 2.3 s. Candidatos: TanStack Table, Radix (importar granular), DataGrid de cotizaciones, iconos Lucide (importar nombrados), librería de charts si existe en home.
- Acción concreta: correr `next build && @next/bundle-analyzer` para ver qué pesa, apuntar módulos > 50 KB gz.

### Tercero (impacto medio, esfuerzo bajo): E2 — SWR cache cliente
- **Por qué:** reduce TBT (navegaciones post-primera) y evita refetch al volver a una tabla. No mejora LCP del primer load pero sí la percepción de velocidad en el flujo real del usuario.

### Cuarto (quick win): fix CLS de `/planificacion`
- 0.111 está en zona "Needs improvement". Reservar altura de widgets/KPIs del dashboard (skeleton con dimensiones fijas) para bajar a < 0.1.

### Quinto (quick win): redirect chain de `/`
- Hoy: `/` → `/login?redirect=/planificacion` → (login) → `/planificacion`. Si el usuario está autenticado, `/` debería ir directo a `/planificacion` en SSR, no pasar por `/login`. Ahorra ~1.5 s de LCP en navegaciones a la raíz.

## Para la próxima medición

1. Correr contra **build prod** (`next start`) — matar lock de `.next/lock` o rebuild limpio.
2. Agregar **mobile throttling** explícito (default de Lighthouse CLI es mobile, pero verificar; dev server + mobile = peor caso).
3. Agregar INP real medido por web-vitals en producción (Lighthouse lab solo da TBT como proxy).
4. Snapshot de bundle real: `ANALYZE=1 npm run build` con `@next/bundle-analyzer` para tener tamaños gz por chunk.

---

**Reportes crudos (no versionados, en `./lh-reports/`):**
- `01-login.json`
- `02-home.json`
- `03-planificacion.json`
- `04-cotizaciones.json`
- `05-maquinarias.json`
- `06-informes-maquinaria.json`
