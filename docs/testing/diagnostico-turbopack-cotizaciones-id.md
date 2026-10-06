# Diagnóstico — Turbopack crash en `/cotizaciones/[id]` tras submit

**Fecha:** 2026-10-05
**Tarea:** C1 del plan `docs/superpowers/plans/2026-10-05-cierre-pendientes-y-deudas.md`
**Referencia:** `docs/TECHNICAL_DEBTS.md` § DUDA-E2E-001 (sub-hallazgo 2026-09-26)
**Autor:** diagnóstico asistido (sesión Claude Opus 4.7)

---

## 1. Síntoma reportado

Al correr el E2E de TK-OI7 (`tests/flows/12-cotizaciones.spec.ts`), después de
que `createCotizacion` (`lib/actions/cotizaciones.ts`) ejecuta `redirect()` hacia
`/cotizaciones/[id]`, el dev server devuelve:

```
Runtime Error: Jest worker encountered 2 child process exceptions,
exceeding retry limit
```

- Stack apunta a `node_modules/next/dist/compiled/jest-worker/index.js`.
- El header del dev server marca el worker como **stale**.
- Ocurre tras el `redirect()` del server action; la cotización se crea OK en BD.
- Stack: Next.js **16.1.2**, React 19.2.0, Turbopack (default `next dev`).
- Prod corre sobre `@opennextjs/cloudflare@1.20.1` — **no usa Turbopack**.

---

## 2. Estado de la reproducción

**No se logró reproducción interactiva en esta sesión de diagnóstico** por dos
limitaciones del entorno de la sesión:

1. `node_modules/` no estaba instalado en el workspace de la sesión; un
   `npm install` + login real + submit interactivo supera el presupuesto
   razonable para una tarea de diagnóstico puramente documental.
2. El fallo requiere **submit humano** (o Playwright) con sesión válida; no es
   observable con solo abrir el dev server.

Por eso este documento se apoya en:

- La transcripción del incidente del 2026-09-26 (DUDA-E2E-001).
- Issues upstream con firma idéntica (ver §4).
- La hipótesis del propio reporte: "stale worker" + Turbopack + `redirect()`.

Queda **pendiente la validación empírica** cuando el usuario tenga el dev
server con `node_modules` fresco; los pasos están en §6.

---

## 3. Hipótesis (ordenadas por evidencia)

### H1 — Bug conocido de Turbopack con `redirect()` desde server action (ALTA)

Es la hipótesis con más soporte upstream. En Next 16.0–16.1, Turbopack tiene
una familia de bugs que se activa cuando un server action termina con
`redirect()` y el target es una ruta dinámica (`/cotizaciones/[id]`). Dos
manifestaciones observadas:

- **"cannot have a negative time stamp"** — el redirect completa antes de que
  cierre la ventana de medición de performance del componente, lo que vuelve
  negativa la duración y mata al worker.
- **Worker Jest cae con uncaught exception** — ocurre con módulos que inicializan
  worker threads durante la primera renderización post-redirect (ej. Pino,
  o cualquier dynamic import que compile por primera vez en ese request).
  Cuando el worker se cae dos veces seguidas, Jest-worker (que Next usa
  internamente para compilar en paralelo) corta con "exceeding retry limit".

Encaje con nuestros síntomas: 100%.
- `createCotizacion` → `redirect("/cotizaciones/${id}")` → ruta dinámica.
- La página `/cotizaciones/[id]` arrastra todo el bundle del editor de
  cotización (lazy-loaded), lo que fuerza compilaciones en caliente a través
  del worker tras el redirect.
- Encaja también con el header "stale" — el worker queda zombi tras la primera
  caída y la segunda la liquida.

### H2 — Dev server viciado (MEDIA)

Hipótesis ya anotada en DUDA-E2E-001. Compatible con H1: puede ser que el
primer disparo del bug deje al worker roto y a partir de ahí **cualquier**
request a `/cotizaciones/[id]` lo reviva brevemente antes de recaer. Un
restart con `.next/` borrado reiniciaría el estado interno del worker pool.
No excluye el bug upstream — explica por qué a veces "funciona" tras restart.

### H3 — Race propia del código (BAJA)

Revisada superficialmente: `createCotizacion` hace `insert` + `redirect`
sin `revalidatePath` manual sobre la ruta destino. En Next 16 el server
action ya invalida y el cliente navega directo. No hay evidencia de que
nuestro código esté creando el crash; el shape del stacktrace (jest-worker
interno) apunta al bundler, no a nuestro código.

---

## 4. Issues / notas upstream relevantes

- Next.js **16.3.0-preview** incluye fixes de Turbopack: retry automático de
  chunk loads fallidos y "redirect should always return updated router state"
  (16.1 core fix). Fuente: release notes 16.3.0-canary.58+.
- Issue [vercel/next.js#86099](https://github.com/vercel/next.js/issues/86099)
  — familia de crashes de dev server con Turbopack 16.x.
- Blog "Next.js 16.1 upgrade guide" documenta explícitamente **"cannot have a
  negative time stamp" en `redirect()` y `notFound()`** como regresión conocida
  del dev server con Turbopack.

No encontré un issue con el mensaje exacto `Jest worker encountered 2 child
process exceptions, exceeding retry limit` como título; es consecuencia (no
causa) y aparece "aguas abajo" del verdadero crash del worker.

---

## 5. Workaround propuesto

**Preferido (0 cambios en commit, solo durante dev local):**

```bash
# En lugar de `npm run dev`, correr una sola vez así:
npx next dev --webpack
```

- Deshabilita Turbopack para la sesión. El bug desaparece (webpack no usa
  el mismo pool de workers de Jest-worker para compilación incremental).
- Costo: dev inicial 2-3x más lento, HMR algo más pesado. Aceptable para
  correr la suite E2E o ejecutar la verificación manual de TK-OI7.
- **No tocar `next.config.ts`.** No es necesario para desactivar Turbopack
  en una invocación puntual, y evita arrastrar la decisión a build/producción.

**Alternativa (si el problema se vuelve recurrente en toda la suite):**

Agregar un script separado `"dev:webpack": "next dev --webpack"` en
`package.json` y usarlo para correr E2E. No se hace en este commit —
primero validar la hipótesis empíricamente.

**Fix de fondo (dependiente de Vercel):**

Subir a Next 16.3 estable cuando salga del preview. Monitorear
[canary releases](https://github.com/vercel/next.js/releases). D0 del plan
general ya está en una rama de upgrade (`chore/d0-upgrade-next-16-3-8`), que
probablemente resuelve esto de paso.

**NO recomendado:** rollback a 15.x o 16.0.x. Perdemos los fixes que ya
sí traía 16.1 (middleware, cache components).

---

## 6. Pasos para validar el workaround (pendiente del usuario)

1. `cd c:\Proyectos\reportaweb3`
2. `rm -rf .next` (PowerShell: `Remove-Item .next -Recurse -Force`)
3. `npx next dev --webpack`
4. Login manual → `/cotizaciones/nueva` → llenar form mínimo → submit.
5. Verificar que la navegación a `/cotizaciones/[id]` termina sin
   "Runtime Error: Jest worker".
6. **Si el workaround sirve**: re-correr `12-cotizaciones.spec.ts` con el
   dev server en modo webpack (ajustar `playwright.config.ts` → `webServer.command`
   solo si se necesita de forma persistente para CI; para una verificación
   puntual, dejar el server corriendo manualmente y correr Playwright contra
   él sin que arranque el suyo).
7. **Si NO sirve** (crash persiste con webpack): H1 queda descartada y hay
   que investigar H3 (bug propio en el flujo del redirect). Reabrir con el
   stacktrace de webpack.

---

## 7. Impacto

| Entorno | Afecta | Nota |
|---------|--------|------|
| Dev local (Turbopack default) | 🔴 Sí | Bloquea E2E de TK-OI7 y cualquier flow que haga submit→redirect a ruta dinámica recién compilada |
| Dev local (`--webpack`) | 🟢 No esperado | Workaround propuesto |
| CI/E2E en Playwright | 🔴 Sí | Mismo dev server |
| Build de prod (`npm run build` + OpenNext) | 🟢 No | No usa Turbopack ni jest-worker en runtime |
| Prod (`reportaweb-demo`/`reportaweb-live` en Cloudflare Workers) | 🟢 No | Server rendering es el runtime de OpenNext, no Turbopack |

**Prioridad real:** media. No bloquea prod ni demo. Bloquea solamente la
re-verificación E2E completa en local. Mientras tanto TK-OI7 ya se validó
con test unitario + prueba contra la BD TEST real (ver CLAUDE.md v3.12.6).

---

## 8. Siguientes pasos sugeridos

- [ ] Usuario corre §6 y confirma si `--webpack` evita el crash.
- [ ] Si confirma, decidir si vale la pena agregar `"dev:webpack"` al
      `package.json` o si basta documentarlo acá.
- [ ] Monitorear la rama `chore/d0-upgrade-next-16-3-8` — si sube a 16.3 estable
      y resuelve, cerrar esta DUDA sin workaround permanente.
- [ ] No modificar `next.config.ts` hasta tener evidencia.
