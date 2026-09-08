# Recorrido completo Fases 1-9 (delta-sync + estándar CRUD/UX) — Tracking

**Fecha de inicio:** 2026-09-08
**Origen:** al ejecutar el delta-sync de Cotizaciones (Fase 6), se detectó que sus dependencias
(Terceros, Servicios, etc.) tampoco tuvieron delta-sync desde el cutover de mayo — riesgo real de
migrar Cotizaciones con referencias a clientes/servicios que todavía no existen en Supabase. El
usuario pidió recorrer TODO el plan maestro (`docs/guia_migracion_bubble_supabase.md`) en orden de
dependencias, cerrando cada fase (gap de datos + delta-sync + estándar UI v1.2) antes de pasar a la
siguiente.

**Instrucción del usuario (verbatim, 2026-09-08):** "Primero Fase 1, Luego Fase 2, y reviso si tiene
CRUD estas tablas de la fase 2, luego Fase 3 a 5, luego fase 6 de cotizaciones, corriges los puntos de
cotizaciones y luego las fases de 7 a 9. Incluido las migraciones de información y el estándar de la UX."

**Regla de corte vigente para todo delta-sync:** 2026-08-31 23:59:59 (no migrar `>= 2026-09-01`).

**Patrón establecido en esta sesión (reusar en cada fase):**
1. Contar gap real: Supabase vs Bubble (`remaining+1` vía Data API), por tenant (CISE/GRUAS).
2. Si hay gap: agregar `UNIQUE(bubble_id)` si falta (verificar 0 duplicados antes), delta-sync
   idempotente por `bubble_id`, dry-run → aplicar. Volumen grande = generar SQL o usar
   `@supabase/supabase-js` directo (reactivando `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` con
   autorización explícita del usuario, retirarla al terminar).
3. Estándar UI v1.2 (`docs/UI-TEMPLATE-LISTADOS.md`): ¿existe ventana CRUD para esta tabla? Si no,
   evaluar si corresponde crearla en Configuración/Catálogos siguiendo el template (ver piloto
   "Cargos" para la metodología de auditoría — checklist v1 con ambigüedades ya detectadas,
   pendiente de v2/v3 antes de escalar masivamente).
4. Documentar resultado (conteos antes/después) antes de pasar a la siguiente fase.

## Progreso

| Fase | Módulo | Gap de datos | Delta-sync aplicado | CRUD/UX revisado | Estado |
|---|---|---|---|---|---|
| 1 | Usuarios y Perfiles | 🟡 gap confirmado: CISE -2 (103 vs 105), GRUAS -12 (224 vs 236). Sin tablas satélite propias (parche 1.a es un flag en `profiles`, no tabla nueva) | 🔲 | 🔲 | Investigado |
| 2 | Catálogos del Sistema | 🟡 ver detalle abajo — mayormente al día, con 2 gaps reales (`bancos`, `servicios_tipos`→Fase 5) y gaps chicos en `plazos_pago`/`areas`/`maquinaria_modelos` | 🔲 | 🟡 ver detalle abajo | Investigado |
| 3 | Terceros | 🟡 gap confirmado: GRUAS -6, CISE +41 (a explicar) | 🔲 | 🔲 | Pendiente |
| 4 | Maquinaria | 🟡 gap confirmado, ver tabla abajo (CISE `maquinarias` +23 como Terceros, resto con gaps chicos) | 🔲 | 🔲 | Investigado |
| 5 | Servicios | 🔴 `servicios_tipos` 100% sin migrar (0 filas vs 9 CISE/10 GRUAS en Bubble) — resto al día (`servicio`/`servicios_tipo_precios` casi exacto) | 🔲 | 🔲 | Investigado |
| 6 | Cotizaciones | 🟢 investigado (fork 2026-09-08): GRUAS +6, CISE +103, +22/15 updates de estado | 🔲 (esperando fases 1-5 + reactivar key) | 🔲 | Investigado, bloqueado por orden de dependencias |
| 7 | Reportes Maquinaria | 🔲 | 🔲 | 🔲 | Pendiente |
| 8 | Reportes Personal | 🔲 | 🔲 | 🔲 | Pendiente |
| 9 | Facturación y Finanzas | 🔲 | 🔲 | 🔲 | Pendiente |

## Detalle Fase 2, 4, 5 (relevamiento 2026-09-08, fork)

**Bloqueante de nombres de tipo Bubble resuelto:** el tipo real para los catálogos de listas es
`configuraciones_opciones_listas` (minúsculas, plural "configuraciones") — el nombre `ConfiguracionOpcionesListas`
que usaba el script histórico `migrate-batch1.ts` está OBSOLETO/no existe en la API Live actual (probé 5
variantes, todas 404). El nombre correcto se confirmó recuperando `migrate-services.ts` de git history, que sí
lo usa correctamente con constraints `Nombre de la Lista` + `Id Empresa - Nuevo`. Para cualquier script nuevo
de estos catálogos, usar el nombre correcto — no reusar el string del script viejo sin probarlo primero.

**⚠️ Hallazgo de seguridad de paso (confirma DUDA-SEC-002 ya documentada):** `scripts/migrate-batch1.ts`
(git history, commit `f9511aa`) tiene un token de Bubble **hardcodeado en el código fuente**
(`BUBBLE_TOKEN = '5532c3bb4891ccf5c49e69a6cf30b8e7'`) y apunta a `https://reporta.la/version-test/api/1.1/obj`
(no LIVE). No se usó ese token para nada de este relevamiento (se usó el de `.env.local`, contra LIVE). Confirma
que la rotación pendiente en DUDA-SEC-002 (`docs/TECHNICAL_DEBTS.md`) sigue siendo necesaria — ese token viejo
podría seguir siendo válido.

| Tabla | Tenant | Supabase | Bubble | Gap |
|---|---|---:|---:|---:|
| rubros | CISE | 21 | 21 | 0 ✅ |
| rubros | GRUAS | 17 | 17 | 0 ✅ |
| plazos_pago | CISE | 53 | 54 | -1 |
| plazos_pago | GRUAS | 21 | 21 | 0 ✅ |
| formas_pago | CISE | 4 | 4 | 0 ✅ |
| formas_pago | GRUAS | 6 | 6 | 0 ✅ |
| job_titles (Cargos) | CISE | 56 | 55 | +1 (surplus) |
| job_titles (Cargos) | GRUAS | 55 | 55 | 0 ✅ |
| areas | CISE | 9 | 10 | -1 |
| areas | GRUAS | 8 | 9 | -1 |
| bancos | ambos | 0 | (no probado — sin función `getBancos` en el código, catálogo sin CRUD, ver abajo) | 🔴 tabla vacía y sin uso, candidato a implementar o retirar |
| maquinaria_modelos | CISE | 107 | 109 | -2 |
| maquinaria_modelos | GRUAS | 130 | 137 | -7 |
| maquinaria_tipos_docs | CISE | 14 | 14 | 0 ✅ |
| maquinaria_tipos_docs | GRUAS | 16 | 18 | -2 |
| maquinarias | CISE | 153 | 130 | **+23 (surplus, como Terceros)** |
| maquinarias | GRUAS | 140 | 149 | -9 |
| servicio | CISE | 232 | 232 | 0 ✅ exacto |
| servicio | GRUAS | 216 (activos) | 246 | -30 |
| servicios_tipo_precios | CISE | 22 | 22 | 0 ✅ exacto |
| servicios_tipo_precios | GRUAS | 24 | 24 | 0 ✅ exacto |
| servicios_tipos (Tipos de Servicios) | CISE | 0 | 9 | 🔴 **-9, tabla nunca migrada** |
| servicios_tipos (Tipos de Servicios) | GRUAS | 0 | 10 | 🔴 **-10, tabla nunca migrada** |

**Patrón repetido a investigar en Fase 3 (no resuelto acá):** CISE tiene consistentemente MÁS filas en Supabase
que en Bubble para `terceros` (+41) y ahora también `maquinarias` (+23) — mismo signo, dos tablas distintas.
Refuerza la hipótesis de que CISE viene dando de alta registros directo en reportaweb3 desde hace tiempo (ya
está operando activamente en el sistema nuevo), no es un error de migración. Confirmar con `bubble_id IS NULL`
en esas filas de más antes de dar por cerrada la hipótesis.

### CRUD/UX — Fase 2 (Catálogos)

- **`job_titles` (Cargos):** confirmado en el piloto de hoy — existe una implementación real y funcional dentro
  de `/settings/users` (tab, vía `GenericCatalogTable`) y una **segunda implementación huérfana**
  (`/settings/users/job-titles`, no enlazada desde ningún menú) que debería eliminarse, no arreglarse.
- **`rubros`, `plazos_pago`, `formas_pago`:** tienen `lib/actions/catalogos.ts` con funciones CRUD (`getRubros`,
  `createCatalogo`, `deleteCatalogo`, `restoreCatalogo` genéricos) y aparecen usados en
  `settings/terceros/page.tsx` — **parecen tener ventana real**, no confirmado al 100% si cumplen el estándar
  v1.2 completo (eso queda para cuando se aplique la metodología del piloto "Cargos" formalmente a cada uno).
- **`areas`:** vía `getContactosAreas`/`createContactoArea` — uso no confirmado en detalle, aparece en
  `settings/terceros` también.
- **`bancos`:** 🔴 **sin ninguna función CRUD en `lib/actions/`** (no hay `getBancos`) y 0 filas en toda la base
  — es un catálogo definido en el schema pero nunca implementado ni poblado. Candidato real a "crear en
  Configuración/Catálogos" (si el negocio lo necesita) o retirar del schema si no.
- **`servicios_tipos`:** mismo caso que `bancos` — 0 filas, no confirmé función CRUD dedicada (aparece
  mencionado en `ventas.ts`/`opciones.ts`/`onboarding.ts` pero no rastreado a fondo por tiempo). Con 19 filas
  reales esperando en Bubble (9+10), es el gap de datos más claro de todo este relevamiento.

## Hallazgos que no bloquean pero quedan anotados

- **CISE Terceros: Supabase (446) > Bubble (405).** Sorprendente — hay 41 terceros de más en Supabase.
  Hipótesis a confirmar en Fase 3: altas hechas directamente en reportaweb3 (CISE ya usa el sistema
  activamente) sin `bubble_id`, no necesariamente un problema. Confirmar antes de asumir.
- **Pendiente de la migración de Informes/Checklist (sesión 2026-09-07/08):** 30 informes + 1.059
  respuestas + 2 tasas_cambio de septiembre 2026 quedaron sin migrar por decisión explícita del
  usuario (no retroactivo) — documentado en el plan de Informes, no repetir la duda.
- **Cotizaciones — puntos de UI pendientes** (a corregir dentro de la Fase 6, por instrucción del
  usuario "corriges los puntos de cotizaciones"): TK-C1 (Panel/dashboard + Descargar CSV), TK-C2
  (columna `periodo_cantidad` muerta), TK-C4 (tarjetas KPI clicables). Ver `docs/auditoria-ui/06-cotizaciones.md`.
- **Auditoría de template UI v1.2:** piloto de una sola página ("Cargos") ya corrido — encontró que es
  código huérfano/duplicado + 6 ambigüedades del checklist a resolver antes de escalar. Ver
  conversación 2026-09-08 para el detalle completo; no re-ejecutar el piloto, iterar sobre lo ya
  encontrado cuando se llegue a esa parte de cada fase.

## Próximo paso inmediato

Fase 1 — Usuarios y Perfiles: contar gap real Supabase vs Bubble para CISE y GRUAS.
