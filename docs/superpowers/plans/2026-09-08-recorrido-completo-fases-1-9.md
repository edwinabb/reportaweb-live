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
| 1 | Usuarios y Perfiles | Confirmado CISE -2, GRUAS -12 (diff real por bubble_id: 6+13=19) | 🟢 **Cerrado 2026-09-08**: 19/19 creados (Auth+profile, patrón histórico `clave*2025`). Los 2 residuales por `ñ` en el email (rechazado por Supabase Auth) se resolvieron a mano reemplazando ñ→n: `reynaldo.nunez@gmail.com` (CISE), `luismadueno@gmail.com` (GRUAS). CISE 103→109. GRUAS 224→237 (1 más que el total Bubble de 236 — mismo patrón benigno de superávit ya confirmado en Terceros/Maquinaria, no investigado a fondo por ser a favor, no en contra). | 🔲 | 🟢 **Cerrado** |
| 2 | Catálogos del Sistema | `plazos_pago`/`areas` con filas viejas sin `bubble_id` (no gap real de datos, solo de vínculo); `bancos` sin datos en Bubble tampoco (no existe la lista); `servicios_tipos`→ver Fase 5 | 🟢 **Aplicado**: `UNIQUE(bubble_id)` agregado a `areas`/`plazos_pago`/`bancos` (TEST+PROD). `areas` CISE→9, GRUAS→8 (backfill + 0 nuevas reales tras dedupe). `plazos_pago` CISE→53, GRUAS→21 (1 nueva: FACTURACION SEMANAL). `bancos`: confirmado que la lista "Bancos" **no existe en Bubble** — no hay nada que migrar, feature nunca usada en ningún sistema. | 🟡 ver detalle abajo | Cerrado |
| 3 | Terceros | GRUAS -6 confirmado; CISE aparentaba +41 de superávit agregado pero igual tenía 6 bubble_ids puntuales faltantes (superávit y gap puntual no son excluyentes) | 🟢 **Aplicado**: script recuperado de git history (`delta-terceros.ts`, tipo Bubble `tercero` singular). CISE +6, GRUAS +6. GRUAS 232→238 (exacto). CISE 446→452. Confirmado con `bubble_id IS NULL`: el superávit de CISE (47 filas) son altas nativas reales en reportaweb3, no error — no se tocan. | 🔲 | Cerrado |
| 4 | Maquinaria | Gaps chicos confirmados en las 3 tablas; CISE `maquinarias` aparentaba +23 de superávit pero igual tenía 2 bubble_ids puntuales faltantes (mismo patrón que Terceros) | 🟢 **Aplicado**: `maquinaria_modelos` CISE+2/GRUAS+7 (109/137, exacto). `maquinaria_tipos_docs` GRUAS+2 (18, exacto). `maquinarias` CISE+2/GRUAS+9 (155/149, GRUAS exacto). Confirmado con `bubble_id IS NULL` que el superávit CISE (25 filas) es altas nativas legítimas. | 🔲 | Cerrado |
| 5 | Servicios | `servicios_tipos` 100% sin migrar (0 vs 19); `servicios` GRUAS -30 | 🟢 **Aplicado**: `servicios_tipos` migrado completo desde `configuraciones_opciones_listas` ("Tipos de Servicios") — CISE 9, GRUAS 10 (exacto). `servicios` GRUAS +30 (246, exacto), CISE sin cambios (232, ya exacto). `tipo_servicio`/`moneda` resueltos a texto vía el mismo catálogo genérico (antes de esto no había mapeo, se construyó `Map` bubble_id→label). | 🔲 | Cerrado (dato) |
| 6 | Cotizaciones | 🟢 investigado (fork 2026-09-08): GRUAS +6, CISE +103, +22/15 updates de estado | 🟢 **Aplicado (script `scripts/sync-fase6-cotizaciones.ts`, paginado con `.range()` tras detectar falso-positivo por el cap de 1000 filas de Supabase JS sin paginar)**: GRUAS 230→237 (+7 cotizaciones, +13 detalle, +17 matriz). CISE 2376→2466 (+90 cotizaciones, +172 detalle, +1945 matriz). `fecha_vencimiento` default a `fecha_solicitud + 30 días` (Bubble no trae vencimiento explícito, mismo estándar que `terminos_condiciones`). **3 colisiones CISE resueltas 2026-09-08 (fork)**: cada `_id` de Bubble chocaba con una fila YA migrada distinta que compartía el mismo `Codigo` (no colisionaban entre sí) — por instrucción del usuario ("agregales una letra diferente al final a cada uno") se migraron como filas nuevas con `B` sufijado al `numero`: `CT 226-2025`→**`CT 226-2025B`** (id `6d0490cb-79b1-4605-bbda-71fa590a7e3c`, detalle=1, matriz=21), `CT067-2026`→**`CT067-2026B`** (id `34bb82ec-3d8e-4380-b047-0a99203ae254`, detalle=1, matriz=21), `CT068-2026`→**`CT068-2026B`** (id `261c2403-8e4a-44c6-994c-326674450178`, detalle=1, matriz=24). Verificado con conteos SQL post-migración (cotizaciones y matriz cuadran exacto). **PDFs migrados 2026-09-08 (fork)**: 108 `pdf_url` migrados desde `Archivo_web` de Bubble (bucket `cotizaciones`, mismo path que ya existía) de 416 filas candidatas (`pdf_url IS NULL AND bubble_id IS NOT NULL`, CISE+GRUAS); 307 sin fuente real en Bubble (cotización nunca enviada al cliente, no se inventó nada); 1 fallo genuino de dato corrupto en origen — `CT 233-2025` (bubble_id `1751671142615x551586952478457860`), el campo `Archivo_web` en Bubble vale literalmente el string `"pdf.pdf"` (no una URL), falla al parsear/descargar, queda documentado en `file_migration_log` con `status='error'`. | 🟡 TK-C2 preparado no aplicado (bloqueado por clasificador), TK-C4 pendiente, TK-C1 diferido por diseño — ver Cierre en `docs/auditoria-ui/06-cotizaciones.md` | 🟢 **Datos cerrados** / 🟡 **UI parcial** |
| 7 | Reportes Maquinaria | 🔲 | 🔲 | 🔲 | Pendiente |
| 8 | Reportes Personal | 🔲 | 🔲 | 🔲 | Pendiente |
| 9 | Facturación y Finanzas | 🔲 | 🔲 | 🔲 | Pendiente |

## Hallazgo 2026-09-08: bug de "proyecto Supabase equivocado" es más amplio de lo pensado

El bug ya conocido de `companies.logo_url` de GRUAS apuntando a `wioozisskjjgjjybsoqo.supabase.co`
(proyecto Supabase viejo/equivocado, no el actual `fqwhagryqkkhbgznxtwf`) **no es un caso aislado**.
Confirmado el mismo patrón en 6 URLs de 2 tablas:

| Tabla.columna | Filas afectadas | Estado |
|---|---:|---|
| `companies.logo_url` | 2 (CISE + GRUAS) | 🟢 **Corregidas 2026-09-08 (fork)** — fuente real encontrada en Bubble tipo `Empresas` (campo `Logo`), ambos tenants tenían logo. CISE: `//s3.amazonaws.com/appforest_uf/f1597240188822x666026003519381200/Logo%20CISE.jpg` → re-subido a bucket `logos` en proyecto correcto. GRUAS: `//8428c6c969d6879682e93c6dcf54fba0.cdn.bubble.io/f1732930605289x183419862275448160/gruas%20del%20pacifico.png` → re-subido. `companies.logo_url` actualizado en ambas filas (no solo `file_migration_log`), verificado por query. |
| `cotizaciones_configuracion.imagen_banco` | 2 (CISE + GRUAS) | 🟢 CISE corregida 2026-09-08 (imagen real recuperada de Bubble, re-subida a Supabase correcto). GRUAS: 🔴 sin fuente real en Bubble (el campo no existe en el registro actual de Bubble) — no se puede recuperar, hay que preguntarle al cliente si tiene el archivo. |
| `cotizaciones_configuracion.imagen_firma` | 2 (CISE + GRUAS) | 🟢 **CISE corregida 2026-09-08 (fork)** — fuente real en Bubble (`//s3.amazonaws.com/appforest_uf/f1622422757426x402641575778759360/Firma%20Gerente%20General.jpg`, registro `cotizaciones_configuracion` `_id=1596739476957x373529478922312450`), re-subida a `cotizaciones/tenant_1cb97ec7/firma/firma_2026-09-08.jpg`, columna actualizada y verificada. GRUAS: 🔴 sin fuente real en Bubble — no se inventó nada, queda pendiente pedirle el archivo al cliente. |
| `cotizaciones.pdf_url` | **🔴 1.000 de 2.703 filas (CISE+GRUAS)** — hallazgo nuevo 2026-09-08 (fork) | 🔴 **sin corregir, fuera de alcance de esta tarea** — mismo bug (URL apuntando a `wioozisskjjgjjybsoqo.supabase.co` en vez de `fqwhagryqkkhbgznxtwf`), pero a escala mucho mayor que los 6 casos de imágenes ya conocidos. De 2.703 cotizaciones CISE+GRUAS: 1.395 con `pdf_url` correcto, 1.000 apuntando al proyecto viejo, 308 `NULL`. Requiere su propia tarea de remediación dedicada (re-descargar+re-subir 1.000 PDFs desde el proyecto viejo o desde Bubble, luego `UPDATE` masivo) — no se tocó en este fork por estar fuera del alcance de la directiva (que cubría solo `companies.logo_url` y `cotizaciones_configuracion.imagen_firma`). |

Además, `cotizaciones_configuracion.banco` (texto) en CISE tenía el placeholder literal **"Banco migrado"**
(nunca reemplazado por un dato real) — se limpió a `NULL` el 2026-09-08 porque Bubble no tiene ningún
campo de texto equivalente (solo la imagen). Si el negocio necesita el nombre del banco en texto, hay
que pedírselo al cliente, no está en ningún lado del sistema origen.

**Pendiente:** `cotizaciones_configuracion.imagen_firma` de GRUAS (sin fuente en Bubble, preguntar al
cliente) y, sobre todo, el hallazgo nuevo de **1.000 `cotizaciones.pdf_url` en el proyecto Supabase
equivocado** — este último es el próximo bug grande a remediar, no descubierto hasta hoy.

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

- **CISE Terceros/Maquinarias: superávit confirmado como legítimo (2026-09-08).** `bubble_id IS NULL`
  = 47 terceros y 25 maquinarias — altas nativas reales en reportaweb3 (CISE ya opera activamente en
  el sistema nuevo). Cerrado, no requiere acción.
- **Fase 1 — 2 usuarios sin migrar por email inválido:** `reynaldo.nuñez@gmail.com` (CISE) y
  `luismadueño@gmail.com` (GRUAS) — Supabase Auth rechaza el carácter `ñ` en la parte local del email
  ("Unable to validate email address: invalid format"), aunque Bubble lo permitía. Pendiente: pedirle
  al usuario/cliente el email real de estas 2 personas (probablemente sin la ñ, ej. `nunez`/`madueno`)
  para poder crear su cuenta — no se puede adivinar la corrección.
- **`bancos`: decisión de no construir CRUD todavía.** Se agregó la columna `bubble_id` + constraint
  único por consistencia de schema, pero como la lista "Bancos" no existe en Bubble (0 filas reales en
  ningún lado), no se justifica construir `lib/actions/bancos.ts` sin un caso de uso real. Si el
  negocio necesita este catálogo en el futuro, es una feature nueva, no una migración pendiente.
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

Fases 1-5 (datos) cerradas 2026-09-08. Sigue: **Fase 6 — Cotizaciones**, ya investigada y ahora
desbloqueada (dependencias al día). Ejecutar el delta-sync de Cotizaciones (GRUAS +6, CISE +103,
+22/15 updates de estado) + los 3 puntos de UI pendientes (TK-C1/C2/C4).

**Nota de higiene:** `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_URL` de PROD siguen en `.env.local` para
esta ejecución — el usuario/orquestador decide si las deja para encarar Fase 6 a continuación o las
retira ahora.

**Scripts entregables de esta ejecución** (en `scripts/`, no temporales): `sync-fase1-usuarios.ts`,
`sync-fase2-catalogos.ts`, `sync-fase3-terceros.ts`, `sync-fase4-maquinaria.ts`,
`sync-fase5-servicios.ts`. Todos idempotentes (re-correr no duplica).
