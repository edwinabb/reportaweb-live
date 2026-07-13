# Auditoría módulo — Formatos (antes "Checklist/Inspecciones")

**Fecha:** 2026-04-19
**Cutover objetivo:** 2026-05-02 (renegociado +1 semana) — **módulo Formatos fuera de este cutover**
**Referencia spec:** `checklist-spec-v3.md` (del usuario, generado previamente por Claude).

Decisión del usuario (2026-04-19): **no llamar "checklist" — llamar `formatos`** porque el módulo va a absorber tipos de datos variados (no sólo checklists), tales como:
- Inspecciones SI/NO/NO_APLICA (hoy)
- Reportes de personal (jornadas, horas, gastos)
- Reportes de maquinaria (turnos, riggers, tipo recorrido)
- Reportes de combustible
- Cualquier nuevo formulario que se agregue por tenant

En lugar de 4 módulos distintos, todo vive en un solo sistema de **Formatos → Versiones → Preguntas → Informes → Respuestas**. Esto reemplaza a futuro las tablas sueltas `reportes_personal`, `reportes_maquinaria`, `reportes_combustible` también — aunque ese merge no es pre-cutover.

---

## 8.1 Estado actual

**Archivos Next existentes:**
- Tabla `formato` (plantillas) con columna `estructura` JSON libre
- Tabla `respuestas` con columna `data` JSON libre
- `DynamicInspectionForm` component (render genérico a partir de `formato.estructura`)
- 161 plantillas × 2 tenants = 322 filas migradas desde Bubble (ver memoria `project_plantillas_vs_inspecciones.md`)
- Bucket Storage `formatos` (probablemente para PDFs cuando se generen)

**Limitaciones del modelo actual:**
- JSON opaco — no se puede filtrar/agregar a nivel SQL
- Sin versionado — cambiar una plantilla invalida instancias anteriores
- Sin integridad referencial entre preguntas y respuestas
- Sin soporte offline
- Sin firmas + PIN + metadatos
- Sin comentarios del cliente
- Sin correlativos por formato + año
- Sin distinción entre plantilla conceptual y versión publicada

---

## 8.2 Propuesta — Spec v3 (adaptado a nomenclatura `formatos`)

La spec del usuario propone un schema relacional + APP móvil offline-first + portal cliente. Se adapta el **rename obligatorio**:

| Spec v3 (original) | Nombre adoptado (reportaweb3) | Rol |
|---|---|---|
| `checklist_formatos` | `formatos` | Plantilla conceptual (ej. INF-3298 Grúas) |
| `checklist_formato_versiones` | `formatos_versiones` | Versión publicada del formato (inmutable una vez `PUBLICADA`) |
| `checklist_preguntas` | `formatos_preguntas` | Preguntas de una versión |
| `checklist_opciones` | `formatos_opciones` | Opciones de pregunta tipo SELECCION_* |
| `checklist_informes` | `formatos_informes` | Instancia llenada (reemplaza la tabla actual `respuestas`) |
| `checklist_respuestas` | `formatos_informes_respuestas` | 1:N con `formatos_informes` — una fila por pregunta |
| `checklist_informe_maquinarias` | `formatos_informes_maquinarias` | N:M maquinaria ↔ informe |
| `checklist_informe_personal` | `formatos_informes_personal` | N:M personal ↔ informe |
| `checklist_informe_comentarios` | `formatos_informes_comentarios` | Feedback interno + cliente |
| `checklist_correlativos` | `formatos_correlativos` | Secuencial por tenant+formato+año |

Mantener los prefijos `formatos_*` agrupa todo en una familia coherente en el schema.

### 8.2.1 Cambios al spec respecto al estado actual de reportaweb3

| # | Spec v3 dice | Estado real reportaweb3 | Ajuste |
|---|---|---|---|
| 1 | `tenant_id` FK a `companies` | ✓ ya existente | OK |
| 2 | `ALTER TABLE tareas ADD COLUMN fecha_programada` + `fecha_programada_fin` | La tarea YA tiene fechas: `tareas_fechas.fecha_inicio / fecha_fin` (separable multi-día). Agregar el campo en `tareas` sería duplicar. | **Derivar `fecha_programada` como `MIN(tareas_fechas.fecha_inicio)` con `asignado_a` ya existente**. No ALTER TABLE — usar vista agregadora `view_tareas_agenda`. |
| 3 | Tarea tiene `asignado_a` (único usuario) | Next.js usa `tareas_recursos` con N personas asignadas por fecha | **Desviación importante del spec**. La agenda móvil "Mis tareas hoy" necesita filtrar por `tareas_recursos.personal_id = auth.uid()`, no por `asignado_a`. Modificar el SQL de la sección 11.4 |
| 4 | Personal propio = `profiles` con `pin` | ✓ | OK (campo `profiles.pin` existe) |
| 5 | Personal externo = `terceros_personal` | ✓ | OK |
| 6 | Cliente = `terceros tipo='cliente'` | ✓ | OK — verificar que existe el filtro `tipo='cliente'` (hay enum cliente/proveedor/otro) |
| 7 | Cotización tiene `cliente_id`, `contacto_id`, `sitio_id`, `tarea_id` | Tareas tienen cotización + cliente + sitio. **`cotizaciones.tarea_id` NO existe** — la relación es inversa (`tareas.cotizacion_id`). | Corregir en el spec: el join es `informes.tarea_id → tareas.cotizacion_id → cotizaciones` |
| 8 | `tipo='FOTO'` en preguntas | Ya existe bucket `formatos` | OK para almacenar |
| 9 | RLS `current_role() in ('admin', 'supervisor')` | El rol actual es `role enum ('admin_tenant' \| 'supervisor' \| 'member')` | Ajustar: `admin_tenant` en vez de `admin`, `member` en vez de `field` |
| 10 | `cliente_externo` role | **NO existe** en el schema actual | Decidir: agregar nuevo rol enum o usar una tabla `portal_clientes` con sus propias credenciales |
| 11 | `raw_user_meta_data ->> 'cliente_id'` | Supabase Auth permite metadata — viable | OK si se adopta el nuevo rol |
| 12 | Migración de `formato.estructura` JSON a filas relacionales | Plan del spec no cubre esto | **Crítico** — hay 322 plantillas en JSON que hay que convertir. Script de migración: parse JSON → INSERT a `formatos_preguntas` + `formatos_opciones` |

### 8.2.2 Decisiones implícitas en el spec que necesitan validación

Del spec v3 sección 9 "Decisiones críticas que tomé (a revisar)":

| # | Decisión del spec | Estado |
|---|---|---|
| 1 | Firmante = `profiles` solamente (terceros_personal no firma con PIN) | **Alinear con decisión 7.5 del audit 07**: firma del trabajador viene de `profile_details.signature_url`. ✓ consistente |
| 2 | "Solicitado por" se hereda de cotización | Confirmar con usuario |
| 3 | Tarea autocompleta cliente/cotización/sitio/contacto | ✓ deseable |
| 4 | Versiones publicadas inmutables (clone-on-change) | ✓ correcto — sin esto los informes históricos quedan inconsistentes cuando cambia la plantilla |
| 5 | Sin `deleted_at`, solo `is_active` | ✓ coherente con convenciones reportaweb3 |
| 6 | Bloques opcionales a nivel plantilla, no instancia | ✓ |
| 7 | **Offline-first con outbox propio, sin PowerSync** | Confirmar — alternativa PowerSync ahorra ~3-5 días pero agrega dependencia SaaS |
| 8 | Portal cliente en `/portal` del mismo admin-web con RLS `cliente_externo` | ✓ viable pero agrega complejidad de auth |
| 9 | Firma dibujada + PIN ≠ firma digital certificada (SUNAT/Reniec) | ✓ comunicar a cliente |

### 8.2.3 Stack propuesto

- **Admin Web**: Next.js (el mismo repo reportaweb3) — sección 4 del spec
- **APP móvil**: **nuevo repo/paquete** `reportaweb3-field` con Expo + React Native + expo-sqlite + Drizzle ORM — sección 5 del spec
- **Shared**: **nuevo paquete privado** `reportaweb3-shared` con types generados + validators Zod — sección 7 del spec
- **Backend**: Supabase (ya en uso) + 4 Edge Functions nuevas (sección 6 del spec)

**Recomendación de repos:** convertir el repo actual `reportaweb3` en monorepo (pnpm workspaces) con `apps/admin`, `apps/field`, `packages/shared`, `supabase/`. Alternativa: 3 repos separados con `@reportaweb3/shared` en npm privado.

---

## 8.3 Esfuerzo (desglose web vs móvil)

El spec v3 define 21 pasos (secciones 8 y 13). Desglose pensado para **decidir qué va al cutover 2026-05-02** y qué queda como proyecto continuo post.

### 8.3.1 Formatos WEB — pre-cutover 2026-05-02 (obligatorio)

Decisión del usuario (2026-04-19): **la versión web del módulo Formatos rediseñado va pre-cutover**. Los operadores seguirán ingresando desde web/notebook en sitio hasta que la APP móvil esté lista.

| Fase | Horas |
|---|---|
| Supabase: migrations (9 tablas) + RLS + correlativos + RPC `formatos_insert_informe_completo` + triggers | 16h |
| Types + validators Zod (util para toda la app web) | 4h |
| Admin web: dashboard Formatos + CRUD plantillas + editor de versiones (drag&drop preguntas + preview) | 30h |
| Admin web: formulario de llenado + lista de informes + aprobaciones/comentarios | 20h |
| Migración de 322 plantillas JSON → schema relacional (script dedicado) | 12h |
| Generación de PDF server-side por informe (Gotenberg — ya hay infra) | 8h |
| Pulido + testing básico (integración con Planificación/tab Inspecciones) | 8h |
| **Subtotal pre-cutover** | **~98h** |

**Diferible pre-cutover (decisión del usuario):**
- Portal cliente `/portal` (ruta con rol `cliente_externo`): 12h
- Agenda de tareas admin (sección 11 del spec): 12h

### 8.3.2 APP móvil — POST-cutover (proyecto continuo)

| Fase | Horas |
|---|---|
| Setup Expo + navigation + auth + SQLite + Drizzle | 16h |
| Pantalla Mis Tareas + flujo llenar informe + firma + PIN + biometría | 40h |
| Worker de sync + background fetch + UI reintentos | 20h |
| 4 Edge Functions (sync-catalogos/formatos/informes/feedback) | 12h |
| Sentry + analytics + pulido + testing | 8h |
| **Subtotal post-cutover** | **~96h** |

**Total proyecto completo (web + móvil):** ~194h + diferibles ~24h = ~218h (se reduce vs estimación inicial porque el PDF server-side baja de 12h a 8h reutilizando la infra Gotenberg ya existente).

---

## 8.4 Scope del cutover 2026-05-02 — **Formatos WEB incluido**

**Pre-cutover (obligatorio, ~98h):**
- Schema relacional nuevo `formatos_*` (9 tablas + RLS + RPC + triggers de correlativo)
- Admin web completo: CRUD plantillas + editor versiones + llenar informe + lista + aprobaciones
- Migración de las 322 plantillas JSON (o solo las activas si son muchas menos)
- Generador PDF de informe
- Reemplazo de `DynamicInspectionForm` por los nuevos componentes relacionales
- Retiro gradual de las tablas `formato` + `respuestas` (modelo viejo coexiste durante la migración, se archiva tras validación)

**Post-cutover (~96h, proyecto continuo):**
- APP móvil Expo completa (sección 5 del spec)
- Portal cliente `/portal` (diferible, ~12h)
- Agenda de tareas admin (diferible, ~12h)

**Impacto en el resto del cutover:**
- Audit 07 (Planificación) tab "Inspecciones" → migra al nuevo componente de llenado de formatos. Reduce ~2h del audit 07 (el generador de checklist ya estaba contemplado).
- Audits 01-06, 09, 10 → no afecta.

**Consideración operativa:** mientras la APP móvil no esté lista, los operadores en campo con acceso limitado a internet siguen operando con los formularios en web (como hoy). La APP cierra ese gap ~6-8 semanas después del cutover.

---

## 8.5 Gaps puntuales a resolver antes de arrancar el proyecto Formatos

Cuando se inicie el proyecto (post 2026-05-02), validar con usuario:

1. **Naming final**: `formatos` vs `formatos_plantillas` vs otra variante. Mi propuesta: `formatos` (singular conceptual). Las tablas hijas usan el mismo prefijo.
2. **Rol `cliente_externo`**: agregar a enum `role` de `profiles` o usar tabla aparte `portal_clientes` con Supabase Auth separado.
3. **Agenda: derivar `fecha_programada` vs agregar columna**: propuesta — vista `view_tareas_agenda_diaria` que agrega `tareas_fechas + tareas_recursos + profiles` para resolver "Mis tareas hoy" sin ALTER TABLE.
4. **Migración de plantillas JSON**: ¿se migra todo o sólo los formatos activos? En Bubble hay 322 plantillas; muchas podrían estar obsoletas.
5. **PowerSync vs outbox propio**: decisión del usuario — costo vs dependencia SaaS.
6. **Monorepo vs 3 repos**: recomendación monorepo pnpm — menos fricción con los types compartidos.
7. **Firma con valor legal**: confirmar con cliente si PIN + canvas + metadatos es suficiente o se requiere firma digital certificada (Llama.pe / Camerfirma).
8. **Unificación de reportes**: ¿el módulo Formatos absorbe a futuro `reportes_personal`, `reportes_maquinaria`, `reportes_combustible`? Implicaría definir 3 "formatos" para estos tipos con preguntas equivalentes — decisión arquitectónica importante.

---

## Resumen y recomendación

**Decisiones confirmadas (2026-04-19):**
- ✅ Rename `checklist_*` → `formatos_*` en todo el spec antes de ejecutar
- ✅ Fuera del cutover 2026-05-02 — es proyecto independiente post-cutover
- ✅ Usa la base técnica ya acordada: PDF por tenant (config_informe_*) del audit 07 como referencia del patrón

**Ajustes al spec v3 identificados** (7 ítems en 8.2.1): corregir antes de implementar.

**Esfuerzo total:** ~222h → ~6 semanas con 1 dev full-time, ~3-4 semanas con 2 devs.

**Próximos pasos**:
1. Confirmar decisiones pendientes del 8.5 con el usuario (naming, rol cliente, firma legal, monorepo, etc.)
2. Post-cutover: arrancar proyecto en ese orden de implementación (sección 13 del spec, con los renames aplicados)
3. Durante cutover: NO tocar el módulo actual `formato`/`respuestas` — sólo usarlo sin romperlo
