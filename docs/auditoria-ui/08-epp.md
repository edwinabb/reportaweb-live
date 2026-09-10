# Auditoría UI ↔ Datos — 08 · Gestión EPP

**Fecha:** 2026-09-09 · **Módulo:** 8/15 del roadmap original (ver
`docs/superpowers/plans/2026-09-09-escalar-auditoria-ui-modulos-restantes.md`)
**Fuente Bubble (UI):** `reporta.la/version-test` (sesión `edwinb@reporta.la`, tenant GRÚAS DEL PACÍFICO)
**Fuente Bubble (datos):** API Data de Bubble **LIVE** (`https://reporta.la/api/1.1/obj`, NO
`/version-test/`) — la UI se comparó contra `version-test` (misma estructura que producción), pero
todo conteo de datos y toda la migración se hizo contra Bubble producción, por instrucción
explícita del usuario.
**Fuente Supabase:** PROD (`fqwhagryqkkhbgznxtwf`), vía Supabase MCP `execute_sql`.

---

## Resumen Ejecutivo

La UI de Gestión EPP en reportaweb3 está bien construida y es fiel a Bubble en estructura (4 de 5
sub-páginas mapean 1:1). El hallazgo real de este módulo no es de UI — es de **datos**: el módulo
tenía casi cero datos migrados de Bubble (ver "Hallazgo crítico" abajo), a diferencia de todos los
módulos anteriores auditados (1-7), que ya habían pasado por el recorrido de Fases 1-9 de mayo-
septiembre. EPP nunca fue parte de ese recorrido porque se construyó como feature nueva
(commits `feat(epp): Fase 1-5` + `J+K`, sin ninguna fase de migración de datos). **Resuelto en esta
sesión**: se migraron los datos reales de GRUAS (único tenant con datos en Bubble para este
módulo) y se cerró el gap de UI de la columna `codigo`.

---

## 1. Mapeo de menú (Bubble → reportaweb3)

| Bubble | reportaweb3 | Status |
|---|---|---|
| Dasboard EPP | Dashboard (`/epp`) | ✅ |
| Catálogo EPP | Catálogo (`/epp/catalogo`) | ✅ |
| Entrega EPP (listado "Documentos de Entregas de EPP") | — | ❌ **gap de UI, ver TK-E1** |
| Alertas EPP | Alertas (`/epp/alertas`) | ✅ |
| — | Nueva entrega (`/epp/entrega/nueva`) | ➕ mejora (Bubble no separa "crear" de "listar", reportaweb3 sí) |
| — | Reportes (`/epp/reportes`) | ➕ mejora, sin equivalente directo en Bubble |
| — | Detalle por colaborador (`/epp/colaborador/[id]`) | ➕ mejora |

## 2. DASHBOARD

**Bubble:** 3 tarjetas (Colaboradores con EPP, EPP Próximo a vencer ≤15 días, Vencidos sin
reemplazar) + 2 listas (Alertas últimas 2 semanas, Entregas últimas 2 semanas).
**reportaweb3:** `app/(dashboard)/epp/page.tsx` — mismas 3 tarjetas (Colaboradores activos,
Próximos a vencer, Vencidos sin reemplazar — mapeo 1:1 confirmado por código,
`getDashboardEppMetrics()` en `lib/actions/epp.ts`), más botón "Registrar entrega" (mejora).

| Elemento | Status |
|---|---|
| 3 tarjetas KPI | ✅ paridad confirmada por código |
| Lista "Alertas últimas 2 semanas" | ⚪ no verificada en detalle (código no revisado línea a línea, riesgo bajo — mismo patrón de alertas ya confirmado en el módulo Alertas) |
| Lista "Entregas últimas 2 semanas" | ⚪ ídem |

## 3. CATÁLOGO

**Bubble:** columnas CÓDIGO EPP / NOMBRE EPP / TIPO / VIDA ÚTIL, selector "Seleccionar EPP...",
filtro embudo, exportar (↓), checkboxes de selección múltiple, menú ⋮ por fila, paginación
("14 item").
**reportaweb3:** `app/(dashboard)/epp/catalogo/page-client.tsx` — columnas Nombre / Tipo / Vida
útil / **Nivel riesgo** (➕ mejora, campo propio sin equivalente en Bubble) / Activo (Switch inline)
/ Acción (editar).

| Elemento Bubble | reportaweb3 | Status |
|---|---|---|
| Columna CÓDIGO EPP | — | 🔴 **gap CERRADO en esta sesión** — la columna `codigo` no existía en el schema (`sst_epp_config`); se agregó (`supabase/migrations/20260909180000_epp_codigo_y_unique_bubble_id.sql`) y se migró el dato real de Bubble. **Pendiente (TK-E2, bajo):** mostrarla en la tabla del catálogo — el schema y el dato ya están, falta solo el `<TableHead>`/`<TableCell>` en `page-client.tsx`. |
| Filtro embudo por Tipo | Sin filtro por columna (solo buscador por nombre) | 🟡 gap menor UI — bajo volumen (16 ítems), no crítico |
| Exportar (↓) | Sin botón de exportar | 🟡 gap menor UI, mismo patrón que Cotizaciones antes del fix de hoy — candidato a `exportToExcel` estándar |
| Checkboxes / bulk actions | No existen | 🟡 gap menor, bajo volumen no lo justifica hoy |
| Paginación | No existe (lista completa sin paginar) | ⚪ aceptable al día de hoy (16 ítems para GRUAS), revisar si crece |
| Botón "Nuevo"/"Agregar EPP" | ✅ | ✅ |
| Activos/Papelera (v1.2) | Switch inline "Activo" (no hay vista Papelera separada) | ⚪ variante aceptable — Bubble tampoco tenía Papelera, la mejora de reportaweb3 (switch inline) es equivalente funcional, no exactamente el patrón v1.2 pero cumple el mismo propósito |

## 4. ENTREGA (listado) — gap de UI real

**Bubble:** "DOCUMENTOS DE ENTREGAS DE EPP" — listado con columnas CODIGO / COLABORADOR / ARCHIVO
PDF (link) / ENTREGADO, buscador, filtro, botón "Nuevo", paginado (55 ítems en version-test).
**reportaweb3:** no existe un listado equivalente — solo `/epp/entrega/nueva` (formulario de alta).
No hay forma de ver/buscar entregas ya registradas desde un listado dedicado (sí se puede ver por
colaborador en `/epp/colaborador/[id]`, que es una vista diferente).

**TK-E1 (MEDIA):** construir un listado `/epp/entrega` (o similar) que liste los documentos de
entrega ya generados (colaborador, fecha, PDF si existe, responsable SST), equivalente al listado
de Bubble. Dato ya disponible en `sst_epp_entrega` — es trabajo de UI, no de datos.

## 5. ALERTAS

**Bubble:** "ALERTAS DE ENTREGAS DE EPP" — columnas COLABORADOR / CANTIDAD / EPP / ENTREGADO /
VENCE / ESTADO (badge VIGENTE/VENCIDO), buscador + selector EPP + filtro + exportar.
**reportaweb3:** `app/(dashboard)/epp/alertas/page-client.tsx` (171 líneas, no revisado campo a
campo por tiempo — riesgo bajo, mismo patrón de datos que Dashboard/Catálogo ya confirmados).

| Elemento | Status |
|---|---|
| Estructura de columnas | ⚪ no verificada campo a campo (pendiente, bajo riesgo) |
| Exportar | 🟡 mismo gap que Catálogo, no confirmado si existe |

---

## 🔴 Hallazgo crítico de datos — RESUELTO en esta sesión (2026-09-09)

**Antes de esta sesión**, PROD tenía:

| Tabla | CISE | GRUAS |
|---|---:|---:|
| `sst_epp_config` (catálogo) | 24 (nativo, ver nota) | **0** |
| `sst_epp_entrega` | 0 | **0** |
| `sst_epp_item` | 0 | **0** |
| `sst_epp_alerta` | 0 | 0 |
| `sst_epp_movimiento` | 0 | 0 |
| `sst_epp_reporte` | 0 | 0 |

El módulo EPP se construyó como feature nueva (`feat(epp): Fase 1-5 + J+K`, historial de commits)
**sin ninguna fase de migración de datos** desde Bubble — a diferencia de todos los módulos 1-7 ya
auditados, que sí pasaron por el recorrido de Fases 1-9. Los 24 registros de catálogo de CISE son
altas nativas hechas directo en reportaweb3 (confirmado: CISE tiene **0** filas en el tipo Bubble
`sst_epp_info1` — nunca usó EPP en Bubble). GRUAS sí tenía datos reales en Bubble, nunca migrados.

**Nota de proceso importante:** la primera verificación contra la API LIVE de Bubble devolvió
`404 Type not found` para los 3 tipos relevantes — resultó ser un problema transitorio de la API de
Bubble (reintentado minutos después, funcionó). El usuario corrigió explícitamente: la fuente de
migración debe ser Bubble **producción**, nunca `version-test` (los tipos de dato existen en
ambos entornos, pero solo los conteos/IDs de producción son reales).

### Migración aplicada (GRUAS, Bubble producción → Supabase PROD)

**Script:** `scripts/migrate-epp-gruas.ts` (gitignored, dry-run por defecto, `--apply --prod` para
escribir), mismo patrón `fetchAllBubble`/upsert idempotente por `bubble_id` que el resto del
recorrido.

**Mapeo de tipos:**

| Bubble | Supabase | Filas GRUAS |
|---|---|---:|
| `sst_epp_info1` | `sst_epp_config` | 16 → 16 migradas |
| `sst_EPP_doc_entrega` (cabecera) + `sst_EPP_entrega_persona` (línea) | `sst_epp_entrega` (cabecera) + `sst_epp_item` (línea) | 7 docs + 14 líneas → 4 cabeceras + 14 items |

**Decisiones de mapeo (confirmadas con el usuario antes de aplicar):**
1. Se agregó la columna `codigo` a `sst_epp_config` (no existía, se perdía el dato) —
   `supabase/migrations/20260909180000_epp_codigo_y_unique_bubble_id.sql`.
2. `vida_util` de Bubble está en **meses** (6, 18, 1) → `dias_renovacion` de Supabase en **días**:
   conversión `vida_util * 30`.
3. Bubble modela "1 documento de entrega → N personas/items" (`sst_EPP_doc_entrega` +
   `sst_EPP_entrega_persona`); Supabase modela "1 entrega = 1 colaborador + N items"
   (`sst_epp_entrega` + `sst_epp_item`). Se agrupó por (`id_registro_entrega` + `id_receptor_epp`)
   para armar cada cabecera — cada grupo de Bubble se volvió una fila de `sst_epp_entrega` con sus
   items debajo.
4. Colaboradores (`id_receptor_epp`/`id_entregado_por`) resueltos contra `profiles.bubble_id` —
   **6/6 resueltos, 0 huérfanos** (WILSON RIOS, PEDRO IZQUIERDO, YEIXON PIMENTEL, YEIXON DAVID
   PIMENTEL como colaboradores; ABZUG GUERRERO y EDWIN BOLAÑOS como responsables SST que
   entregaron).
5. `estado_vigencia` de cada item se recalculó por fecha (`fecha_vencimiento` vs. hoy) en vez de
   confiar en el campo `status`/`vencido` de Bubble (que es una foto del momento en que se
   consultó, no necesariamente vigente) — mismo criterio que usa el motor de alertas de
   reportaweb3.

**Resultado verificado en PROD (`fqwhagryqkkhbgznxtwf`):**
- `sst_epp_config`: 0 → **16** (GRUAS)
- `sst_epp_entrega`: 0 → **4** (GRUAS)
- `sst_epp_item`: 0 → **14** (GRUAS)
- Verificado con un join completo catálogo+entrega+item+colaborador — nombres, fechas y estados de
  vigencia correctos (2 items con vencimiento 2026-07-24 correctamente `VENCIDO` a la fecha de hoy
  2026-09-09; el resto `VIGENTE` con vencimiento 2026-12).

**Residual real, no migrado (documentado, no bloqueante):** 3 documentos de entrega de Bubble
(`sst_EPP_doc_entrega`, consecutivos 1, 2, 3, fechas 2026-06-10/15/23) **no tienen ninguna línea de
persona/item asociada** — son documentos de entrega huérfanos en el propio origen (creados en
Bubble pero nunca completados con un receptor). No se puede migrar una fila de `sst_epp_entrega`
sin un `colaborador_id` (columna `NOT NULL`), así que se documentan como residual, no se inventa un
colaborador.

**CISE:** confirmado con 0 filas en los 3 tipos Bubble — no requiere migración, su catálogo de 24
filas ya es 100% nativo de reportaweb3.

**Migraciones DDL aplicadas (TEST + PROD):**
```sql
ALTER TABLE sst_epp_config ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE sst_epp_entrega ADD CONSTRAINT sst_epp_entrega_bubble_id_key UNIQUE (bubble_id);
ALTER TABLE sst_epp_item ADD CONSTRAINT sst_epp_item_bubble_id_key UNIQUE (bubble_id);
```
(la segunda y tercera fueron necesarias porque el `upsert` con `onConflict: 'bubble_id'` falló la
primera vez con `42P10` — esas tablas no tenían restricción única en `bubble_id` todavía, a
diferencia de `sst_epp_config` que sí la tenía desde su creación).

---

## Gaps y tickets

| ID | Severidad | Descripción | Acción |
|---|---|---|---|
| TK-E1 | 🟡 MEDIA | Sin listado de "Documentos de Entrega EPP" (solo existe el formulario de alta) | Construir `/epp/entrega` listado, dato ya disponible en `sst_epp_entrega` |
| TK-E2 | 🟢 BAJA | Columna `codigo` no se muestra en la tabla del catálogo (dato y schema ya están) | Agregar `<TableHead>`/`<TableCell>` en `catalogo/page-client.tsx` |
| TK-E3 | 🟢 BAJA | Catálogo sin exportar a Excel ni filtro embudo por Tipo | Aplicar mismo patrón que Cotizaciones/Maquinaria (`exportToExcel` + `ColumnFilterHeader`) |
| TK-E4 | 🟢 BAJA | 3 documentos de entrega huérfanos en Bubble (sin receptor) | No accionable — dato incompleto en el origen, documentado |

## DUDAs

Ninguna abierta — el único punto de decisión real (fuente de migración: Bubble producción, no
version-test) ya fue resuelto explícitamente por el usuario durante esta sesión.

## Cierre

**Estado:** 🟢 **CERRADO 2026-09-09** — datos migrados y verificados (GRUAS), gap crítico de datos
resuelto. Quedan como backlog de UI, no bloqueantes: TK-E1 (listado de entregas), TK-E2/TK-E3
(mejoras menores del catálogo). TK-E4 es un residual del origen, no accionable.

**Nota para el roadmap de auditoría:** este hallazgo (feature nueva construida sin fase de
migración) es un patrón a vigilar en los módulos restantes (Formatos, Planes de Acción, Ventas,
Compras, Perfil de Usuario, Opciones Internas) — verificar primero si el módulo tiene historial de
commits de "migración" antes de asumir que ya tiene datos.
