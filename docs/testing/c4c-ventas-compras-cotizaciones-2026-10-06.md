# FASE C4-c — Specs Ventas / Compras / Cotizaciones

**Fecha:** 2026-10-06 · **Branch:** `chore/fase-c-c4c-ventas-compras-cotizaciones` · **Base:** master `b5d6a4a`

## Specs del grupo

| Spec | Clasif. C2 | Resultado hoy |
|---|---|---|
| `12-cotizaciones.spec.ts` | (a)(c)(e) | 5 passed / 6 failed — **TODAS las 6 fallas son auth** |
| `15-ventas.spec.ts` | (c) | no corrido (categoría c = auth block) |
| `16-compras.spec.ts` | (c) | no corrido |
| `25-pre-cutover-cotizacion-full.spec.ts` | (c)(d) | no corrido |
| `26-cotizaciones-panel.spec.ts` | (c) | no corrido |
| `30-pre-cutover-ventas-full.spec.ts` | (c) | no corrido |
| `31-pre-cutover-compras-full.spec.ts` | (c) | no corrido |
| `33-pre-cutover-ciclo-venta.spec.ts` | (c) | no corrido |
| `34-pre-cutover-ciclo-compra.spec.ts` | (c) | no corrido |

## Hallazgo 1 — Turbopack ya **NO crashea** en `/cotizaciones/[id]` con Next 16.3.8 ✅

Objetivo prioritario del brief. **Confirmado**: en los logs del `[WebServer]` NO aparece `Jest worker encountered 2 child process exceptions`, `cannot have a negative time stamp`, ni ningún crash de Turbopack. D0 cerró ese síntoma. El test TK-OI7 falla por auth, no por crash de bundler.

El test estaba sin `.fixme` ni `.skip` — ya corre; no hubo que destaparlo.

## Hallazgo 2 — El inventario C2 malinterpretó la regla 6b del template v1.2

El inventario marcó `12-cotizaciones` como (a) por "embudo de la columna Estado — v1.2 regla 6b: sin columna Estado. Probable rot."

**Verificado en código** (`components/cotizaciones/cotizaciones-columns.tsx:84-99`): la columna Estado en Cotizaciones SIGUE existiendo con `ColumnFilterHeader title="Estado"` y 6 opciones (`Borrador`, `Enviada`, `Aprobada`, `Rechazada`, `Vencida`, `Aplazada`). **La regla 6b aplica a Estado = Activo/Inactivo (soft-delete)**, NO a estado-de-negocio multi-valor. Son conceptos distintos.

Conclusión: **el test `embudo de la columna Estado muestra las 6 opciones` es estructuralmente correcto** y no necesita cambio. No lo toqué.

## Hallazgo 3 — Auth está rota (DUDA-E2E-001 reproducida)

Las 6 fallas de `12-cotizaciones` son todas la misma cascada: el `page.goto('/cotizaciones')` o `/cotizaciones/nueva` **redirige a `/login`** aunque el spec declare `test.use({ storageState: '.auth/admin.json' })`.

Evidencia (`error-context.md` de TK-OI7):

```yaml
- heading "Planifica, reporta y valoriza en minutos" [level=1]
- heading "Bienvenido" [level=2]
- textbox "Correo Electrónico"
- button "Iniciar Sesión"
```

Admin.json tiene cookie única `sb-oyrokyyaeaeqzlsgxtto-auth-token` para `localhost/`, expires `1825896807` (año 2027). Setup corre y pasa (`setup-admin` 1 passed en 11s). Pero cuando el project `chromium` o `chromium-admin` corre un spec, la cookie no autentica — vuelve al login.

Hipótesis no verificada:
- La cookie puede estar siendo rechazada por `SameSite`/scope en el redirect.
- `proxy.ts` (middleware Node) puede estar refrescando con `Invalid Refresh Token` (visto en el log del webServer de la 1ª corrida: ~40× `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`).
- Puede ser efecto secundario de D0 (next 16.3.8 cambió algo en el cookie handling de middleware). Pero C2bis dijo haber visto 1 test pasar — tal vez fue el setup, no el spec.

**Fuera del scope de C4-c.** Requiere diagnóstico profundo tipo C1 pero sobre auth, no sobre bundler.

## Archivos tocados en esta rama

Solo documentación (este archivo). **Cero cambios en specs ni en helpers ni en código de app** — ninguna rotura concreta de v1.2 que arreglar en este grupo.

## Operación pendiente de otro agente/sesión

- **Auth E2E** — nueva tarea tipo C1-de-auth para diagnosticar por qué `.auth/admin.json` no autoriza las requests contra el dev server. Posibles pistas:
  1. Comparar `cookies` del admin.json real con los que el server escribe cuando un usuario hace login manual en el browser.
  2. Chequear `proxy.ts` (ex-`middleware.ts`) por reglas que invaliden la sesión al cambiar de ruta.
  3. Confirmar en los logs del webServer si cada request de spec cae en `AuthApiError: Invalid Refresh Token`.
  4. Verificar que `TEST_ADMIN_EMAIL` (= `e2e-admin@reporta.la`) tiene un `profiles.tenant_id` válido en TEST, porque si no, al login+redirect el middleware puede patearlo a `/`.

- Specs no corridos (15/16/25/26/30/31/33/34) — intactos; se verifican tras resolver auth.
