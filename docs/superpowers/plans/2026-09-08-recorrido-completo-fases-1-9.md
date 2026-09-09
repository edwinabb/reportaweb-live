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
| 7 | Reportes Maquinaria | 🟢 investigado (fork 2026-09-08): CISE -608, GRUAS -2.191 (mayor gap de todo el recorrido) | 🟢 **Aplicado (`scripts/migrate-fase7-reportes-maquinaria-delta.ts`, Bubble type `Maquinaria_reporte_horas_new`, mapping recuperado de `migrate-reportes-mig6.ts` en git history)**: CISE +555 (23 filtradas por cutoff, 31 sin `maquinaria_id` resoluble), GRUAS +1.962 (122 filtradas por cutoff, 107 sin `maquinaria_id` resoluble) = **2.517 filas nuevas**, 24.352→26.869. `UNIQUE(bubble_id)` ya existía (índice plano, no constraint formal — no se tocó). **Archivos migrados 2026-09-08 (fork, `scripts/migrate-fase7-reportes-maquinaria-archivos.ts`, mismo patrón `migrarArchivo`/`file_migration_log`)**: de las URLs crudas de Bubble que quedaron en las filas nuevas — `pdf_url` 2.474/2.475 (bucket `reporte-maquinaria`), `foto_actividad_url` 237/237, `foto_reporte_escrito_url` 2.566/2.566, `firma_cliente_url` 510/510 (bucket `reporta-maquinaria-fotos`, todos con path `{slug}/{año}/{fecha}-{id8}-{sufijo}.{ext}`, mismo estándar que el histórico). Verificado con query: 0 filas con URL fuera de `supabase.co` salvo 1 residual real (ver abajo). **Bug de proyecto Supabase equivocado: NO encontrado en esta tabla** (0 filas con `wioozisskjjgjjybsoqo` antes y después). **1 residual real, no inventado:** fila `id=8f2005cc-c0ea-47c5-ae6a-4d47806ea412` (GRUAS, bubble_id `1761075518309x906513819682209800`) tiene en Bubble el literal `"It wasn't possible to find the uploaded file URL"` en vez de una URL — dato corrupto en el origen, mismo patrón que `CT 233-2025` en Fase 6; queda documentado en `file_migration_log` (`status='error'`), no se puede recuperar. **Correcciones 2026-09-08 (fork, pedido explícito del usuario tras cierre inicial):** (1) excepción de corte documentada en `docs/guia_migracion_bubble_supabase.md` punto 5 — `reportes_maquinaria`/`reportes_personal` son dato operativo continuo, ya NO aplica el corte del 31-ago; se quitó el filtro `CUTOFF` del script y se re-corrió: CISE +20, GRUAS +114 = **+134 filas nuevas** (26.868→27.002; de las 23+122 originalmente filtradas por cutoff, la mayoría ya habían quedado sin `maquinaria_id` resoluble al re-evaluarse contra el catálogo actual, ver siguiente punto). (2) reintento de resolución de `maquinaria_id` contra el catálogo de Maquinaria ya cerrado (Fase 4): de las 31 (CISE) + 107 (GRUAS) filas originalmente sin resolver, la re-consulta a Bubble hoy encontró 34 (CISE) + 115 (GRUAS) filas nuevas totales sin `maquinaria_id` resoluble (el universo de "nuevas desde Bubble" creció entre la corrida original y hoy) — de ese universo actual, 20/54 (CISE) y 114/229 (GRUAS) SÍ resolvieron y se insertaron; **34 (CISE) + 115 (GRUAS) = 149 siguen sin `maquinaria_id` resoluble en Bubble** (huérfanos reales del origen, no inventados, no migrados). (3) archivos de las 134 filas nuevas migrados con `scripts/migrate-fase7-reportes-maquinaria-archivos.ts` (mismo patrón): `pdf_url` 133/134 (1 fallo `fetch failed` transitorio, no investigado más — filas ya escritas, columna queda con URL Bubble cruda pendiente de reintento), `foto_actividad_url` 10/10, `foto_reporte_escrito_url` 134/134, `firma_cliente_url` 34/34. Verificado: el único residual con URL no-Supabase es el mismo de siempre (`id=8f2005cc...`, dato corrupto en origen) — sin nuevos casos del bug de proyecto Supabase equivocado. (4) paginación: **resuelta**, ver sección CRUD/UX abajo. | 🟢 **resuelto 2026-09-08** (ver detalle abajo) | 🟢 **Datos, archivos y paginación cerrados** |
| 8 | Reportes Personal | 🟢 investigado (fork 2026-09-08): CISE -1.276, GRUAS -2.572 (real, sin patrón de superávit — Supabase tenía menos que Bubble en ambos tenants) | 🟢 **Aplicado (`scripts/fase8-reportes-personal-delta.ts`, Bubble type `usuario-reporte-horas-new`, recuperado de `docs/guia_migracion_bubble_supabase.md` §Fase 8 tras 8 candidatos fallidos por prueba-error)**: **excepción de corte aplicada desde el inicio** (mismo criterio que Fase 7: dato operativo continuo) — CISE +1.238 (39 filtradas por fecha `>2026-08-31`, consistente con el criterio de Fase 7), GRUAS +2.417 (155 filtradas) = **3.655 filas nuevas** en total (2.600 tras agregar fallback `fecha_reporte = Created Date` cuando Bubble no traía `fecha_reporte`, que causó 2.600 errores de constraint NOT NULL en el primer intento — reintento con el fallback: 0 errores). CISE 12.190→13.428 (vs Bubble 13.466, diff=38 = cutoff), GRUAS 14.980→17.397 (vs Bubble 17.552, diff=155 = cutoff). `UNIQUE(bubble_id)` ya existía (índice plano `reportes_personal_bubble_id_key`, 0 duplicados/1 NULL confirmado antes de tocar nada). **Hallazgo adicional no pedido pero real**: 412 filas (139 CISE + 273 GRUAS) YA tenían `bubble_id` pero estaban incompletas (`personal_id`/`created_by`/`maquinaria_id`/`pdf_url`/gastos en NULL o 0) — parecen native-writes parciales de la app que solo resolvieron `tarea_id` vía un patch anterior; se completaron con el mismo delta-sync (backfill condicional, solo tocando columnas NULL) sin duplicar filas. Bubble no tiene campos `firma`/`foto`/`tercero_personal` para este tipo (confirmado con `constraint_type: is_not_empty` sobre 8 candidatos → todos 404): estos 3 campos del schema quedan en 0 filas migradas por diseño del origen (dato que nunca existió en Bubble, no se inventó nada), consistente con el 0 histórico ya presente antes de esta corrida. **Archivos migrados (`scripts/fase8-reportes-personal-archivos.ts`, mismo patrón `migrarArchivo`/`file_migration_log`, bucket `informes-personal`, path `{slug}/{año}/{documento_interno}-{fecha_creación}.{ext}` igual a la convención ya usada históricamente en esa tabla)**: `pdf_url` 3.514/3.514 (0 fallos) desde `archivo_pdf` de Bubble. Verificado: 0 filas con URL fuera de `supabase.co`. **Bug de proyecto Supabase equivocado: NO encontrado** (0 filas con `wioozisskjjgjjybsoqo` antes y después). 4 errores preexistentes en `file_migration_log` (de una corrida histórica anterior a este recorrido) ya estaban resueltos (URLs `cdn-migrated/*` apuntando al proyecto correcto) — no son parte de este cierre. | 🟢 **Gap de paginación en `getAllReportesPersonal` (`lib/actions/reportes.ts`) — RESUELTO 2026-09-08**, mismo fix que Fase 7: `.range()` + `{count:'exact'}`, firma `{page, limit}` → `{data, count}`; `app/(dashboard)/informes/personal/page.tsx` y `ReportesPersonalSection` actualizados con paginación (Anterior/Siguiente), `npx tsc --noEmit` limpio en los 3 archivos tocados. Antes del fix habría truncado en silencio (CISE 13.428 y GRUAS 17.397 filas reales, ambas muy por encima del cap de 1.000 de PostgREST sin `.range()`). | 🟢 **Datos, archivos y paginación cerrados** |
| 9 | Facturación y Finanzas | 🟢 investigado (2026-09-08): `facturas_venta` CISE -65/GRUAS -137, `facturas_venta_item` CISE -1.660/GRUAS -4.245, `factura_venta_pagos` CISE -3/GRUAS -3, `facturas_compra` CISE 0/GRUAS -121, `facturas_compra_item` CISE -638/GRUAS -2.324. `facturas_compra_pagos` y `valorizaciones` ya estaban 100% (0 gap). Sin patrón de superávit (`bubble_id IS NULL` = 0 en las 7 tablas). | 🟢 **Aplicado (`scripts/fase9-finanzas-delta.ts`, tipos Bubble = mismo nombre que la tabla Supabase excepto `valorizaciones`→`maquinaria_horas-valorizaciones`, confirmado con `git show` de `delta-facturas-venta.ts`/`migrate-facturas-pagos.ts`/`migrate-valorizaciones.ts` en git history)**: corte de **2026-08-31 23:59:59 aplicado por defecto** (facturación es documento comercial histórico, no operativo continuo como Fase 7/8 — solo 13 `facturas_venta` + 9 `facturas_compra` quedaron excluidas por fecha, volumen trivial, no se pidió ni se aplicó la excepción de Fase 7/8). `facturas_venta` +196 (2.934→3.130, CISE 1.410/1.412 y GRUAS 1.720/1.724 vs Bubble — diff=cutoff). `facturas_compra` +112 (1.361→1.473, GRUAS 1.399/1.408 vs Bubble — diff=cutoff; 5 registros Bubble sin `tenant_id` resoluble, descartados). **Hallazgo de mapeo:** los items (`facturas_venta_item`/`facturas_compra_item`) y los pagos (`factura_venta_pagos`) NO tienen un campo de FK directo a su factura en Bubble — el vínculo real es el array `lista_items`/`lista_cobros` de la factura padre (primer intento con un campo FK inventado dio 0 inserts, corregido antes de aplicar). `facturas_venta_item` +3.013 (19.932→22.510, gap restante 1.215+2.112=3.327 = ítems cuyo `bubble_id` no aparece en el `lista_items` de NINGUNA factura — huérfanos reales del origen, no inventados). `facturas_compra_item` +435 (22.506→22.941, gap restante 638+1.889=2.527, mismo patrón de huérfanos). `factura_venta_pagos`: 0 insertados, 6 pagos (3+3) sin factura resoluble vía `lista_cobros` — huérfanos reales, documentados. **Archivos (`scripts/fase9-finanzas-archivos.ts`)**: ver hallazgo de "proyecto Supabase equivocado" más abajo — 3.854 de 4.539 URLs corregidas, 685 sin fuente real en Bubble (residual, no inventado). | 🟢 **Listados ya paginan correctamente** — `getFacturasVentaData`/`getFacturasComprasData` (`lib/actions/ventas.ts:579`, `lib/actions/compras.ts:503`) ya usaban `.range()` + `count:'exact'` desde antes de este recorrido, no repiten el bug de paginación de Fase 6/7/8. | 🟢 **Datos y archivos cerrados** (residuales documentados, no bloqueantes) — **última fase del recorrido, ver resumen ejecutivo al final del documento** |

## Hallazgo 2026-09-08: bug de "proyecto Supabase equivocado" es más amplio de lo pensado

El bug ya conocido de `companies.logo_url` de GRUAS apuntando a `wioozisskjjgjjybsoqo.supabase.co`
(proyecto Supabase viejo/equivocado, no el actual `fqwhagryqkkhbgznxtwf`) **no es un caso aislado**.
Confirmado el mismo patrón en 6 URLs de 2 tablas:

| Tabla.columna | Filas afectadas | Estado |
|---|---:|---|
| `companies.logo_url` | 2 (CISE + GRUAS) | 🟢 **Corregidas 2026-09-08 (fork)** — fuente real encontrada en Bubble tipo `Empresas` (campo `Logo`), ambos tenants tenían logo. CISE: `//s3.amazonaws.com/appforest_uf/f1597240188822x666026003519381200/Logo%20CISE.jpg` → re-subido a bucket `logos` en proyecto correcto. GRUAS: `//8428c6c969d6879682e93c6dcf54fba0.cdn.bubble.io/f1732930605289x183419862275448160/gruas%20del%20pacifico.png` → re-subido. `companies.logo_url` actualizado en ambas filas (no solo `file_migration_log`), verificado por query. |
| `cotizaciones_configuracion.imagen_banco` | 2 (CISE + GRUAS) | 🟢 CISE corregida 2026-09-08 (imagen real recuperada de Bubble, re-subida a Supabase correcto). GRUAS: 🔴 sin fuente real en Bubble (el campo no existe en el registro actual de Bubble) — no se puede recuperar, hay que preguntarle al cliente si tiene el archivo. |
| `cotizaciones_configuracion.imagen_firma` | 2 (CISE + GRUAS) | 🟢 **CISE corregida 2026-09-08 (fork)** — fuente real en Bubble (`//s3.amazonaws.com/appforest_uf/f1622422757426x402641575778759360/Firma%20Gerente%20General.jpg`, registro `cotizaciones_configuracion` `_id=1596739476957x373529478922312450`), re-subida a `cotizaciones/tenant_1cb97ec7/firma/firma_2026-09-08.jpg`, columna actualizada y verificada. GRUAS: 🔴 sin fuente real en Bubble — no se inventó nada, queda pendiente pedirle el archivo al cliente. |
| `cotizaciones.pdf_url` | 1.000 de 2.703 filas (CISE+GRUAS) | 🟢 **Corregidas 2026-09-08 (fork dedicado)** — el proyecto viejo (`wioozisskjjgjjybsoqo.supabase.co`) ya no resuelve DNS (confirmado, dominio muerto), así que se recuperó cada PDF real desde Bubble (`Cotizaciones.Archivo_web`) reusando el path exacto ya guardado en la URL vieja (todo lo posterior a `/cotizaciones/`) para no reconstruir la convención de slugs a mano. 1.000/1.000 re-subidas y `pdf_url` actualizado (verificado: 0 filas con `wioozisskjjgjjybsoqo` restantes, 2.395 = 1.395 previas + 1.000 nuevas, exacto). 1 fallo transitorio de upload (error HTML en vez de JSON, típico hiccup de rate-limit) resuelto en el reintento del mismo lote. |

Además, `cotizaciones_configuracion.banco` (texto) en CISE tenía el placeholder literal **"Banco migrado"**
(nunca reemplazado por un dato real) — se limpió a `NULL` el 2026-09-08 porque Bubble no tiene ningún
campo de texto equivalente (solo la imagen). Si el negocio necesita el nombre del banco en texto, hay
que pedírselo al cliente, no está en ningún lado del sistema origen.

**Pendiente real (bajo, no bloqueante):** `cotizaciones_configuracion.imagen_firma` de GRUAS y
`imagen_banco` de GRUAS — ninguna tiene fuente real en Bubble, hay que pedirle el archivo al cliente
directamente, no hay forma de recuperarlo del sistema origen. **El bug de "proyecto Supabase
equivocado" queda 100% cerrado** en las 7 URLs conocidas (6 imágenes + 1.000 PDFs) — **hasta que Fase 9
reveló que es MUCHO más grande de lo pensado, ver actualización 2026-09-08 abajo.**

### Actualización 2026-09-08 (Fase 9): el bug es 4-5x más grande de lo estimado

Al auditar Fase 9 se encontró el mismo bug en **4.539 filas** de `facturas_venta`/`facturas_compra`
(nunca antes contadas — Fases 1-8 solo habían revisado 7 URLs puntuales de otras tablas):

| Tabla.columna | Filas rotas (antes) | Corregidas | Residual sin fuente real |
|---|---:|---:|---:|
| `facturas_venta.pdf_valorizacion` | 1.184 | 998 | 186 |
| `facturas_venta.pdf_factura_url` | 856 | 856 | 0 |
| `facturas_compra.pdf_factura` | 1.235 | 1.000 | 235 |
| `facturas_compra.pdf_valorizacion` | 1.264 | 1.000 | 264 |
| **Total** | **4.539** | **3.854 (85%)** | **685 (15%)** |

Corregidas con `scripts/fase9-finanzas-archivos.ts`: mismo patrón que las 1.000 `cotizaciones.pdf_url`
de Fase 6 — se reusa el path exacto que ya estaba guardado en la URL vieja (todo lo posterior a
`/object/public/<bucket>/`), se descarga el PDF real desde el campo crudo de Bubble
(`pdf_valorización`/`pdf_factura`, con typo/tilde tal como viene del origen) y se re-sube al proyecto
correcto en ese mismo path, actualizando la columna real (no solo el log). Los **685 residuales** son
filas donde el campo de Bubble está vacío o no es una URL válida — dato genuinamente no recuperable del
origen (mismo patrón que `CT 233-2025` de Fase 6), **no se inventó ningún archivo**. El bug de "proyecto
Supabase equivocado" está ahora **100% auditado y remediado en las 11 URLs/columnas conocidas de todo el
recorrido** (7 de Fases 1-6 + 4 de Fase 9); no se investigó si existe en tablas fuera del alcance de las
9 fases (ej. `checklist_respuestas`, `inspecciones` — no tocadas en este recorrido).

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

### CRUD/UX — Fase 7 (Reportes Maquinaria)

- **🟢 Gap de paginación RESUELTO 2026-09-08** en `getAllReportesMaquinaria` (`lib/actions/reportes.ts:200-217`):
  la query no tenía `.range()`/`.limit()`, así que dependía del máximo default de PostgREST (1.000 filas).
  Verificado antes del fix con `count:'exact', head:true` vs. select sin rango: **GRUAS 18.514 filas reales,
  solo 1.000 devueltas; CISE 5.718 reales, solo 1.000 devueltas** — la página `/informes/maquinaria` truncaba
  en silencio el resto (mismo patrón que el falso-positivo de Fase 6). Fix: `getAllReportesMaquinaria` ahora
  acepta `{ page, limit }` (default `limit=50`), usa `{ count: 'exact' }` + `.range(from, to)` y devuelve
  `{ data, count }` (patrón ya usado en `getGlobalMaquinariaDocumentsPaged` de `lib/actions/maquinaria-docs-query.ts`).
  `app/(dashboard)/informes/maquinaria/page.tsx` lee `?page=` de `searchParams` y pasa `page`/`count`/`pageSize`
  a `ReportesMaquinariaSection`, que ahora muestra el conteo real y botones Anterior/Siguiente. `npx tsc --noEmit`
  sin errores tras el cambio (único caller de la función era esa page).
- **CRUD confirmado:** existe alta/edición (`ReporteMaquinariaSection` + `ReporteMaquinariaDialog`), no se
  vio botón de borrado/papelera en la sección revisada — no confirmado a fondo si existe soft-delete en
  otro lugar de la UI.
- **Deuda ya conocida y explícitamente fuera de scope de este delta-sync:** `valorizacion_compra_id`/
  `valorizacion_venta_id` con 0 backfill matches (IDs del campo TEXT de Bubble no coinciden con
  `valorizaciones.bubble_id`) — documentado desde 2026-05-25 en la guía de migración, requiere
  investigación aparte.

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

## ✅ Resumen ejecutivo final — recorrido completo Fases 1-9 (cerrado 2026-09-08)

**Las 9 fases del plan maestro quedaron cerradas** (dato + archivos; CRUD/UX revisado donde aplicaba).
Fase 9 fue la última, según la instrucción original del usuario ("...luego las fases de 7 a 9").

**Qué se migró en total (delta real, no volumen absoluto):**
- Fase 1 (Usuarios): 19 altas + 2 emails corregidos (ñ→n).
- Fase 2 (Catálogos): `areas`/`plazos_pago`/`bancos` con `UNIQUE(bubble_id)` agregado; `bancos` confirmado
  sin datos en Bubble (feature nunca usada).
- Fase 3 (Terceros): +12 (CISE +6, GRUAS +6).
- Fase 4 (Maquinaria): +20 en 3 tablas.
- Fase 5 (Servicios): `servicios_tipos` migrado completo (0→19) + `servicios` GRUAS +30.
- Fase 6 (Cotizaciones): +97 cotizaciones, +185 detalle, +1.962 matriz; 3 colisiones de código resueltas
  con sufijo "B"; 108 PDFs migrados.
- Fase 7 (Reportes Maquinaria): +2.651 filas (mayor gap de todo el recorrido); ~3.647 archivos migrados;
  excepción de corte agregada a la guía (dato operativo, no histórico).
- Fase 8 (Reportes Personal): +3.655 filas; 3.514 PDFs migrados; 412 filas incompletas backfillleadas.
- Fase 9 (Facturación): +196 facturas de venta, +112 de compra, +3.013 items de venta, +435 items de
  compra; **3.854 PDFs recuperados del bug de "proyecto Supabase equivocado"** (el hallazgo más grande
  de todo el recorrido, ver sección arriba).

**Bugs de infraestructura/código encontrados y corregidos (no eran errores de este recorrido, ya
existían en producción):**
1. **"Proyecto Supabase equivocado"** (`wioozisskjjgjjybsoqo.supabase.co`, proyecto viejo/muerto en DNS):
   afectaba **11 columnas/URLs en 6 tablas** — `companies.logo_url`, `cotizaciones_configuracion.imagen_banco`/
   `imagen_firma`, `cotizaciones.pdf_url` (1.000 filas), y el hallazgo grande de Fase 9:
   `facturas_venta.pdf_valorizacion`/`pdf_factura_url` + `facturas_compra.pdf_factura`/`pdf_valorizacion`
   (4.539 filas). Total: **~5.545 archivos corregidos** recuperando el original real desde Bubble y
   re-subiendo al proyecto correcto. Quedan **~690 residuales sin fuente real en Bubble** (GRUAS
   imagen_banco/imagen_firma + 685 PDFs de facturación) — no recuperables del origen, no inventados.
2. **Paginación truncada a 1.000 filas** (cap default de PostgREST sin `.range()`): encontrado y corregido
   en `getAllReportesMaquinaria` y `getAllReportesPersonal` (`lib/actions/reportes.ts`). Confirmado que
   `getFacturasVentaData`/`getFacturasComprasData` (Fase 9) YA paginaban correctamente desde antes — no
   todo el código tenía este bug, solo esas 2 funciones.
3. **Faltaba `UNIQUE(bubble_id)`** en 5+ tablas (`tareas_recursos`, `cotizaciones`+4 relacionadas,
   `areas`/`plazos_pago`/`bancos`) — causa raíz original de que Cotizaciones nunca tuviera delta-sync
   desde el cutover de mayo. Las tablas de Fase 9 (`facturas_*`) ya tenían el constraint correcto desde
   su creación.
4. **`servicios.precio_N_tipo` sin FK real** — el join embebido de PostgREST fallaba en silencio,
   corregido con un mapeo manual (Fase 5).
5. **Items/pagos de Fase 9 sin FK directa en Bubble** — el vínculo real es el array `lista_items`/
   `lista_cobros` de la factura padre, no un campo en el hijo (hallazgo de mapeo, no un bug de código,
   pero relevante si se reintenta este delta-sync en el futuro).

**Qué queda pendiente de verdad (residuales genuinos del origen, no bloqueantes, documentados, no
inventados):**
- GRUAS: `cotizaciones_configuracion.imagen_banco`/`imagen_firma` — pedir el archivo real al cliente.
- 685 PDFs de facturación (Fase 9) sin fuente real en Bubble.
- 149 filas de `reportes_maquinaria` con `maquinaria_id` no resoluble en Bubble (Fase 7).
- 3.327 + 2.527 items de facturación + 6 pagos de venta huérfanos en Bubble (sin FK padre resoluble,
  Fase 9) — el origen mismo tiene estos hijos sin vínculo a ningún padre.
- `CT 233-2025` (Fase 6) y 1 fila de `reportes_maquinaria` (Fase 7): literal de texto corrupto en el
  campo de archivo de Bubble en vez de una URL.
- TK-C1/TK-C4 de Cotizaciones (dashboard + KPI cards) — diferidos por diseño, fuera del alcance de
  delta-sync de datos.
- Auditoría de template UI v1.2 — piloto "Cargos" corrido, v2/v3 del checklist no iterado todavía.
- Rotar `SUPABASE_SERVICE_ROLE_KEY` de PROD (`DUDA-SEC-001`) — sigue activa en `.env.local` para esta
  ejecución, a retirar cuando el usuario confirme que no hay más trabajo pesado de escritura pendiente.

**Scripts entregables de todo el recorrido** (en `scripts/`, gitignored, no temporales): `sync-fase1-usuarios.ts`,
`sync-fase2-catalogos.ts`, `sync-fase3-terceros.ts`, `sync-fase4-maquinaria.ts`,
`sync-fase5-servicios.ts`, `sync-fase6-cotizaciones.ts`, `migrate-fase7-reportes-maquinaria-delta.ts`,
`migrate-fase7-reportes-maquinaria-archivos.ts`, `fase8-reportes-personal-delta.ts`,
`fase8-reportes-personal-archivos.ts`, `fase9-finanzas-delta.ts`, `fase9-finanzas-archivos.ts`. Todos
idempotentes (re-correr no duplica).

## 📋 Plan de seguimiento — pendientes reales (2026-09-09)

Checklist de los residuales genuinos listados arriba, para no perderlos de vista. Ninguno es
bloqueante para el cutover ya cerrado; se resuelven a medida que aparezca la oportunidad (dato del
cliente, siguiente ronda de auditoría UI, etc.).

- [ ] **Pedirle a GRUAS** `cotizaciones_configuracion.imagen_banco` e `imagen_firma` (no recuperables
      de Bubble, hay que pedir el archivo directo al cliente).
- [ ] **685 PDFs de facturación** (Fase 9: `facturas_venta.pdf_valorizacion`/`pdf_factura_url` +
      `facturas_compra.pdf_factura`/`pdf_valorizacion`) sin fuente real en Bubble — documentado en
      `file_migration_log`, no recuperable salvo que el cliente tenga copia propia.
- [ ] **149 filas de `reportes_maquinaria`** (Fase 7) con `maquinaria_id` no resoluble contra el
      catálogo de Bubble — huérfanos reales del origen.
- [ ] **3.327 + 2.527 items de facturación + 6 pagos de venta huérfanos** (Fase 9) sin FK padre
      resoluble vía `lista_items`/`lista_cobros` en Bubble — mismo patrón, dato del origen sin vínculo.
- [ ] `CT 233-2025` (Fase 6) y 1 fila de `reportes_maquinaria` (Fase 7): literal de texto corrupto en
      el campo de archivo de Bubble en vez de una URL — sin fix posible sin el archivo original.
- [ ] **TK-C1/TK-C4 de Cotizaciones** (dashboard + KPI cards clicables) — diferidos por diseño, ver
      `docs/auditoria-ui/06-cotizaciones.md`.
- [ ] **Escalar auditoría de template UI v1.2** a los módulos 5-15 — piloto "Cargos" corrido (v1 del
      checklist, 6 ambigüedades detectadas + 1 implementación huérfana eliminada), v2/v3 del checklist
      no iterado todavía; no re-ejecutar el piloto, iterar sobre lo ya encontrado.
- [ ] **Rotar `SUPABASE_SERVICE_ROLE_KEY` de PROD** (`DUDA-SEC-001`, `docs/TECHNICAL_DEBTS.md`) — ya
      retirada de `.env.local` tras el cierre de Fase 9 (2026-09-09); falta la rotación real de la key
      en el dashboard de Supabase.
- [ ] **Regenerar `types/supabase.ts`** (`npm run types:supabase`, hoy hand-edit) + build local antes
      del próximo deploy grande.
- [ ] Confirmar deploy de v3.12.4 en `demo.reportar.app` y `reportar.app` (pushes hechos 2026-09-09;
      verificar en el dashboard de Cloudflare Workers Builds que ambos builds terminaron OK — el
      entorno de `reportar.app` podría no estar creado todavía, ver `docs/ARCHITECTURE.md`).
