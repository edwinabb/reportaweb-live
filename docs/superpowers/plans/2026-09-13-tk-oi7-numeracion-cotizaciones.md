# TK-OI7 — Numeración de cotizaciones `CT-XXXX-YYYY` — Plan de Implementación

> **Para agentes que ejecuten esto:** REQUIRED SUB-SKILL: superpowers:test-driven-development para
> `parseNumeroCotizacion`/`generateNumeroCotizacion` (Task 1). El resto son cambios pequeños y
> acotados, no requieren subagent-driven-development completo.

**Goal:** Corregir `generateNumeroCotizacion` (`lib/actions/cotizaciones.ts`) para que genere
números con el formato exacto **`CT-XXXX-YYYY`** (consecutivo de 4 dígitos, reinicia a `0001` cada
1 de enero, hora de Lima) y calcule el siguiente número correctamente contra los datos reales —
hoy genera `CT 2026-0001`, un formato distinto al migrado desde Bubble (`CT099-2026`,
`CT 279-2026`, etc.), y su búsqueda (`.split('-')[1]`) parsea mal esos formatos heredados.

**Contexto:** Hallazgo de la auditoría de Opciones Internas (`docs/auditoria-ui/14-opciones-internas.md`
§ TK-OI7, `docs/pendientes_por_resolver.md` § P-007). Formato confirmado por el usuario 2026-09-13:
`CT-XXXX-YYYY`. El usuario también confirmó (misma fecha) que "Duplicar" debe generar un número
nuevo y limpio del consecutivo del año, no un sufijo de revisión sobre el original.

**Arquitectura — por qué NO se usa `companies_consecutives`:** Esa tabla existe (1 fila vacía por
tenant, `documento_tipo='COTIZACION'`) pero **Bubble sigue siendo el sistema en producción para
CISE** — sigue creando cotizaciones ahí, y el delta-sync las trae a `cotizaciones` con su propia
numeración. Confirmado en datos (2026-09-13): CISE tiene cotizaciones con `bubble_id` no nulo
creadas (sincronizadas) el `2026-09-03` con número `CT 279-2026`. Un contador cacheado en
`companies_consecutives` se desincronizaría en cuanto Bubble cree una cotización nueva después de
sembrarlo. La única fuente de verdad confiable es el **máximo real** en `cotizaciones.numero` en el
momento de generar, igual que ya hace `peekNextCodigoValorizacion` en `lib/actions/ventas.ts` (mismo
patrón "peek sin lock", con la nota de la vulnerabilidad de carrera ya aceptada en ese código).
`companies_consecutives` queda sin usar — no se propone borrarla en este plan (fuera de alcance),
pero se documenta como candidata a limpieza futura (Regla 2 del checklist de auditoría).

**Alcance confirmado — qué NO se toca:**
- **No se reescribe el histórico.** Las ~3.300 cotizaciones ya migradas (formatos `CT099-2026`,
  `CT 279-2026`, `057-2020`, `CT-001-2022`, sufijos `B`, etc.) se quedan como están — ya viajaron a
  clientes reales en PDFs enviados por email. El fix solo aplica a los números que v3 genere de acá
  en adelante.
- **No se toca la numeración de Órdenes de Trabajo** (`T-YYYY-XXXX`, `lib/actions/cotizaciones.ts`
  función `finalizeAprobacionCotizacion`) ni el correlativo de Informe PDF (tab 3 de Bubble,
  `tareas_codigo_contador`/`formatos_correlativos`, ambas vacías). Son formatos y mecanismos
  distintos, no fueron parte de lo que el usuario pidió corregir hoy — quedan anotados en
  `docs/TECHNICAL_DEBTS.md` como posible ticket futuro si hace falta.
- **No se agrega una constraint `UNIQUE` nueva.** Ya existe
  `cotizaciones_tenant_id_numero_version_key` (`UNIQUE(tenant_id, numero, version)`, verificado
  2026-09-13) — protege contra duplicados exactos porque toda cotización nueva se crea con
  `version: 1`.

## Global Constraints

- **Timezone:** el año se calcula con hora de Lima (`America/Lima`, UTC-5), no con la hora del
  servidor (Cloudflare Workers corre en UTC). Sin esto, entre las 00:00 y 05:00 UTC del 1 de enero
  el contador podría resetear ~5 horas antes de que sea medianoche en Lima.
- **No destructivo.** Ningún paso de este plan hace `UPDATE`/`DELETE` sobre `cotizaciones.numero`
  existente — solo cambia cómo se generan los números nuevos.
- **Reusar el patrón ya aceptado del proyecto** (`peekNextCodigoValorizacion` en `ventas.ts`): sin
  lock pesado, "peek" del máximo real + insert; si dos usuarios generan al mismo tiempo, el
  `UNIQUE(tenant_id, numero, version)` existente rechaza el segundo insert y el código reintenta
  una vez con el número recalculado (no aceptar una colisión silenciosa, a diferencia de
  `ventas.ts` que sí la acepta — Cotizaciones es más sensible por ser un número que el cliente ve).
- **No inventar sub-formatos:** un solo regex de parseo debe cubrir todos los formatos heredados
  observados en datos reales (ver Task 1), no asumir que el histórico ya está limpio.

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/actions/cotizaciones.ts` | Modify | Reescribe `generateNumeroCotizacion`; ajusta `createCotizacion` y `duplicateCotizacion` para usar el nuevo formato con retry-on-conflict |
| `scripts/test-cotizaciones-numero.ts` | Create | Test unitario en el patrón ya usado por el repo (`scripts/test-pdf-retry-schedule.ts`, `assert` plano + `console.log('OK: ...')`, sin runner de tests formal) |
| `tests/flows/12-cotizaciones.spec.ts` | Modify | Agrega test E2E de formato del número generado |
| `docs/auditoria-ui/06-cotizaciones.md` | Modify | Actualiza el estado de TK-OI7/numeración en la sección de Cotizaciones |
| `docs/pendientes_por_resolver.md` | Modify | Cierra P-007 al terminar |
| `docs/TECHNICAL_DEBTS.md` | Modify | Cierra TK-OI7, anota el ticket futuro de O.T./Informe PDF si aplica |

---

### Task 1: `parseNumeroCotizacion` + `generateNumeroCotizacion` (TDD)

**Contexto:** el parseo debe tolerar, con datos reales verificados en PROD 2026-09-13, estos
formatos (todos dentro de `cotizaciones.numero`, la columna es `text` sin formato fijo):

```
CT099-2026        CT 100-2026       099-2021          057-2020
CT-001-2022        CT 001-23 (año 2 dígitos)   CT067-2026B (sufijo B, no cuenta como número nuevo)
CT 226-2025B        CT 2026-0001 (el formato ROTO actual, por si ya se generó alguno)
```

- [x] **Paso 1: Escribir los tests primero** en `scripts/test-cotizaciones-numero.ts` — el repo NO
  usa Jest/Vitest para `lib/`, usa scripts planos con `node:assert/strict` corridos directo con
  `npx tsx` (confirmado: `scripts/test-pdf-retry-schedule.ts`, mismo patrón que
  `lib/pdf-retry-schedule.ts`). Seguir ese formato exacto: imports relativos, `assert.equal`/
  `assert.deepEqual`, terminar con `console.log('OK: cotizaciones-numero')`.

  Casos a cubrir para `parseNumeroCotizacion(numero: string): { consecutivo: number; anio: number } | null`:
  - `'CT099-2026'` → `{ consecutivo: 99, anio: 2026 }`
  - `'CT 279-2026'` → `{ consecutivo: 279, anio: 2026 }`
  - `'099-2021'` → `{ consecutivo: 99, anio: 2021 }`
  - `'CT-001-2022'` → `{ consecutivo: 1, anio: 2022 }`
  - `'CT 001-23'` → `{ consecutivo: 1, anio: 2023 }` (año de 2 dígitos → sumar 2000)
  - `'CT067-2026B'` → `{ consecutivo: 67, anio: 2026 }` (el sufijo `B` se ignora, no rompe el parseo)
  - `'CT 2026-0001'` (el formato ROTO actual — confirmar antes con
    `select count(*) from cotizaciones where numero ~ '^CT [0-9]{4}-[0-9]{4}$'`, se espera 0) → con
    el regex propuesto esto parsea como `{ consecutivo: 2026, anio: 1 }` (toma "2026" como
    consecutivo y "0001" como año de 4 dígitos, sin normalizar). **Es intencional no perseguir este
    caso con más regex:** `anio: 1` nunca va a matchear el año real al filtrar en
    `generateNumeroCotizacion`, así que una fila así (si existiera) queda excluida del cálculo del
    máximo igual que si `parseNumeroCotizacion` devolviera `null` — el test solo necesita confirmar
    que el resultado (cualquiera que sea) nunca coincide con un año real de 4 dígitos como 2024-2030.
  - `'CT-0280-2026'` (formato nuevo ya generado por este fix) → `{ consecutivo: 280, anio: 2026 }`
  - `null`, `''`, `'algo random'` → `null`

  Regex propuesto (ajustar en TDD si algún caso real no matchea):
  ```ts
  const NUMERO_PATTERN = /^CT\s?-?\s?(\d+)-(\d{2,4})B?(?:\s*\(Copia\))?$/i
  // fallback sin prefijo CT: /^(\d+)-(\d{2,4})$/
  ```

- [x] **Paso 2: Implementar `parseNumeroCotizacion`** en `lib/actions/cotizaciones.ts`, exportada
  (no `function` privada) para que `scripts/test-cotizaciones-numero.ts` pueda importarla, hasta
  que los tests del Paso 1 pasen. Correr con `npx tsx scripts/test-cotizaciones-numero.ts`.

- [x] **Paso 3: Año en hora de Lima — reusar `lib/utils/tz.ts`, NO crear un helper nuevo**

  Ya existe `todayInTZ(timezone: string): string` en `lib/utils/tz.ts` (formatea `YYYY-MM-DD` en
  el timezone dado vía `Intl.DateTimeFormat('en-CA', ...)`, ya usado en `empresa-config.ts`,
  `onboarding.ts`, `trial.ts`). Usar directo:
  ```ts
  import { todayInTZ } from '@/lib/utils/tz'
  const anio = Number(todayInTZ('America/Lima').slice(0, 4))
  ```
  No hardcodear `'America/Lima'` si en el futuro Cotizaciones necesita ser multi-timezone por
  tenant (`companies.timezone` ya existe, ver `empresa-timezone-form.tsx`) — pero eso es scope
  creep para este ticket: CISE y GRUAS son ambos Perú, hardcodear Lima es correcto hoy.

- [x] **Paso 4: Reescribir `generateNumeroCotizacion`**

  ```ts
  async function generateNumeroCotizacion(tenantId: string, adminClient: SupabaseClient): Promise<string> {
      const anio = Number(todayInTZ('America/Lima').slice(0, 4))
      const { data, error } = await adminClient
          .from('cotizaciones')
          .select('numero')
          .eq('tenant_id', tenantId)
          .not('numero', 'is', null)

      if (error) {
          console.error('Error leyendo numeros de cotizacion:', error)
          // fallback conservador: no se puede verificar el maximo real, mejor fallar
          // explicito que arriesgar una colision silenciosa
          throw new Error('No se pudo generar el numero de cotizacion')
      }

      let maxConsecutivo = 0
      for (const row of data ?? []) {
          const parsed = parseNumeroCotizacion(row.numero)
          if (parsed && parsed.anio === anio) {
              maxConsecutivo = Math.max(maxConsecutivo, parsed.consecutivo)
          }
      }

      return `CT-${String(maxConsecutivo + 1).padStart(4, '0')}-${anio}`
  }
  ```

  Nota de performance: trae TODOS los `numero` del tenant (no solo del año), ~2.500 filas para
  CISE en el peor caso — aceptable para una acción que se ejecuta al crear/duplicar una cotización
  (no es un endpoint de alto tráfico). Si en el futuro se vuelve un problema, filtrar por
  `created_at >= '${anio}-01-01'` en la query ayuda pero no es 100% preciso porque el `anio` está
  en el texto, no en una columna — dejar la traída completa hasta que sea necesario optimizar.

- [x] **Paso 5: Retry-on-conflict en los 2 call sites**

  En `createCotizacion` y `duplicateCotizacion`, envolver el insert:
  ```ts
  let numero = await generateNumeroCotizacion(tenantId, adminClient)
  let { data: cotizacion, error } = await adminClient.from('cotizaciones').insert({ ...campos, numero }).select().single()
  if (error?.code === '23505' && error.message?.includes('cotizaciones_tenant_id_numero_version_key')) {
      // Carrera: otra cotizacion tomo este numero entre el peek y el insert. Reintentar una vez.
      numero = await generateNumeroCotizacion(tenantId, adminClient)
      ;({ data: cotizacion, error } = await adminClient.from('cotizaciones').insert({ ...campos, numero }).select().single())
  }
  ```
  (Adaptar a la estructura real de cada función — no hay que duplicar todo el objeto de insert dos
  veces si se puede extraer a una función interna `insertConReintento`.)

- [x] **Paso 6: `duplicateCotizacion` — número limpio, sin sufijo**

  Confirmado por el usuario 2026-09-13: la copia es un documento independiente. Cambiar:
  ```ts
  numero: numero + ' (Copia)',
  ```
  a:
  ```ts
  numero,
  ```
  (el `cotizacion_padre_id: original.id` ya guarda la trazabilidad, no hace falta el sufijo en el
  número visible).

- [x] **Paso 7: `npx tsc --noEmit`**

---

### Task 2: Test E2E de verificación

- [x] **Paso 1:** agregado en `tests/flows/12-cotizaciones.spec.ts` ("crear cotización genera número
  con formato CT-XXXX-YYYY (TK-OI7)"), selecciona cliente real vía `SearchableSelect` (mismo patrón
  probado en `26-pre-cutover-planificacion-full.spec.ts`) y verifica el campo número tras el redirect.
- [x] **Paso 2 — BLOQUEADO por infraestructura, no por el fix:** corrido contra dev local con BD TEST.
  La suite entera redirige a `/` (login) — reproducible en un test SIN modificar del mismo spec
  (`listado de cotizaciones carga`), confirmando que es una falla de sesión preexistente de la suite
  E2E, no algo que introdujo este cambio. Anotado como hallazgo nuevo en `docs/TECHNICAL_DEBTS.md`
  § DUDA-E2E-001. **Verificación alternativa realizada:** llamada directa a la lógica real contra la
  BD de TEST (0 cotizaciones migradas) confirma que el siguiente número calculado es `CT-0001-2026`,
  el resultado esperado.
- [ ] **Paso 3 (verificación manual, no automatizable sin credenciales de PROD) — PENDIENTE:**
  pedirle al usuario que confirme en PROD, tras el deploy, que la primera cotización nueva de CISE
  sale como `CT-0280-2026` (o el siguiente número si Bubble creó más desde el 2026-09-13) y no
  colisiona con nada que Bubble haya creado mientras tanto.

---

### Task 3: Cerrar la documentación

- [x] `docs/pendientes_por_resolver.md` § P-007 → 🟢 Resuelto.
- [x] `docs/TECHNICAL_DEBTS.md` → fila `TK-OI7` a 🟢 Cerrado + fila nueva BAJA para O.T. + hallazgo
  nuevo de sesión E2E anotado en DUDA-E2E-001.
- [x] `docs/auditoria-ui/14-opciones-internas.md` § TK-OI7 → actualizado a 🟢 cerrado (6 referencias).
- [x] `docs/auditoria-ui/06-cotizaciones.md` → nota agregada en el addendum de cierre.

---

## Qué verifiqué antes de dejar este plan listo (2026-09-13)

Ya no falta nada para ejecutar — esto es lo que resolví antes de escribirlo, para que quede
accionable sin otra ronda de preguntas:

1. **Timezone Lima:** ya existe `todayInTZ()` en `lib/utils/tz.ts`, usado en 3 archivos — el plan
   lo reusa, no crea un helper nuevo.
2. **Convención de test unitario:** el repo no usa Jest/Vitest para `lib/`, usa scripts planos con
   `node:assert/strict` (`scripts/test-pdf-retry-schedule.ts` es el precedente exacto) — el plan
   sigue ese mismo patrón en vez de inventar una carpeta `__tests__/`.
3. **`CT 2026-0001` (formato roto actual) en datos reales:** no lo confirmé por query directa antes
   de escribir este plan — es el primer chequeo del Paso 1 de Task 1 y no cambia el diseño del fix
   en ningún caso (si existe alguna, `parseNumeroCotizacion` la deja fuera del cálculo del máximo
   igual que cualquier otro formato no reconocido, así que no bloquea).
4. **Confirmado por el usuario (2026-09-13):** formato `CT-XXXX-YYYY`, reinicio 1 de enero hora
   Lima, y "Duplicar" genera número limpio nuevo (no sufijo de revisión).
5. **`companies_consecutives`** (tabla sin usar) queda fuera de alcance a propósito — no afecta la
   corrección del bug; limpiarla es un ticket aparte de 1 línea si el usuario lo pide.

No hay bloqueantes. Listo para ejecutar Task 1.


---

## Estado final (2026-09-14)

🟢 **Implementado y verificado, con una limitación anotada.**

- `lib/utils/numero-cotizacion.ts` (nuevo): `parseNumeroCotizacion`, testeado contra todos los
  formatos heredados reales de PROD + el formato nuevo (`scripts/test-cotizaciones-numero.ts`, pasa).
  Vive fuera de `lib/actions/cotizaciones.ts` porque ese archivo tiene `'use server'` — Next.js exige
  que todo export de un archivo así sea una función async, y `parseNumeroCotizacion` necesitaba ser
  exportada (síncrona) para poder testearse. Decisión no anticipada en el plan original, tomada al
  ejecutar.
- `lib/actions/cotizaciones.ts`: `generateNumeroCotizacion` reescrito (formato `CT-XXXX-YYYY`, año en
  hora de Lima vía `todayInTZ`, máximo real desde `cotizaciones.numero`). Nuevo helper interno
  `insertCotizacionConNumero` con retry-on-conflict, usado por `createCotizacion` y
  `duplicateCotizacion`. `duplicateCotizacion` ya no agrega `' (Copia)'` al número.
- `npx tsc --noEmit` limpio.
- **Test E2E bloqueado por infraestructura, no por el fix:** la suite completa (incluido un test sin
  modificar) redirige a login contra dev local. Verificación alternativa directa contra la BD real de
  TEST confirma el resultado esperado (`CT-0001-2026`). Hallazgo anotado en `docs/TECHNICAL_DEBTS.md`
  § DUDA-E2E-001 para que se investigue por separado.

### Pendiente para el usuario

1. Revisar y mergear el PR.
2. Tras el deploy a demo/PROD, confirmar que la primera cotización nueva de CISE sale con el
   siguiente número real de la serie (no colisiona con lo que Bubble haya creado mientras tanto).
3. Considerar investigar la falla de sesión E2E encontrada (DUDA-E2E-001) — bloquea verificar
   cualquier fix con Playwright en este entorno hasta que se resuelva.
