# Migración completa de Informes/Checklist (formatos + datos + archivos) — Implementation Plan

> **Para workers agénticos:** REQUIRED SUB-SKILL: usar `superpowers:executing-plans` (scripts secuenciales,
> dry-run obligatorio antes de cada `--apply`). No aplica subagent-driven-development — son scripts de
> migración de datos con dependencias estrictas de orden entre sí, no features de UI paralelizables.

**Goal:** Cerrar TK-I1 (`docs/auditoria-ui/07-informes.md`) por completo: catalogar los formatos de Bubble
que faltan, migrar sus informes llenados (con el recorte por año/estado que pidió el usuario), y migrar
todos los archivos (PDFs de informes + cualquier foto adjunta) desde el hosting de Bubble a Supabase
Storage — para no depender de infraestructura que se apaga con el cutover.

**Architecture:** 4 fases secuenciales, cada una su propio script en `scripts/`, mismo patrón que el resto
de migraciones del proyecto (dry-run por defecto, `--apply` explícito, upsert idempotente por `bubble_id`).
Fase 0 cataloga formatos (Bubble `Formato`/`Formato_seccion`/`Formato_Pregunta` → Supabase
`formatos`/`formatos_versiones`/`formatos_preguntas`/`formatos_opciones`). Fase 1 migra los informes
llenados (Bubble `Informes`/`Informe_respuesta` → Supabase `formatos_informes`/`formatos_informes_respuestas`).
Fase 2 migra archivos (PDFs + fotos, cualquier tabla que aún referencie una URL de Bubble/S3). Fase 3 valida
el resultado final contra los conteos de Bubble.

**Tech Stack:** `tsx` + `@supabase/supabase-js` + Bubble Data API (`fetch` nativo) + Supabase Storage. Sin
dependencias nuevas.

**Spec:** este documento es su propia spec — nace de TK-I1 (`07-informes.md`) y de la decisión de alcance
ampliado del usuario (mensaje 2026-09-07): catalogar TODOS los formatos de Bubble (no solo los 2 ya
cubiertos), validar qué más se perdió en el reset de mayo, y migrar todos los archivos (no solo PDFs de
informes).

---

## Contexto — dos investigaciones previas a este plan

### 1. La migración de informes YA se había hecho una vez, y un reset de PROD la borró

`docs/superpowers/plans/2026-05-25-migracion-formatos-checklist.md` documenta que el 2026-05-25 se migraron
con éxito 6.507 informes + miles de respuestas (CISE V1: 58, CISE V2: 2.968, GRUAS V2: 3.481). Hoy
`formatos_informes` está en 0 filas.

**Causa raíz confirmada:** `list_migrations` sobre PROD muestra que **todo** el schema (incluidos archivos
de migración con nombre de fecha muy anterior) se reaplicó el **2026-05-26** — un día después — evidencia
de una reconstrucción completa de la base (equivalente a `supabase db reset`), que borra datos cargados por
script (no por archivo de migración). El cutover real del proyecto ocurrió 3 días después
(`docs/superpowers/plans/2026-05-29-cutover-plan.md`, sábado 30-may) usando un orquestador
`scripts/migrate-all-prod.ts` (ya no existe en el repo, se usó y se descartó) con fases `mig2a..mig7` +
`blockA`/`blockB` + `audit` — **ese orquestador no incluía una fase de formatos/informes**, por lo que la
migración de mayo nunca se volvió a correr después del reset. El resto de módulos (terceros, maquinaria,
cotizaciones, servicios, tareas, reportes, facturas) sí forman parte de ese orquestador y están confirmados
con datos reales hoy (verificado en las auditorías de módulos 1-7 de esta sesión + consultas directas).

**Conclusión de la validación pedida por el usuario (punto 3):** no hace falta re-auditar todo el proyecto
de nuevo — el gap está acotado a lo que este plan cubre. Sí apareció, de forma oportunista durante esta
investigación, **un gap chico y no relacionado**: `planes_accion.evidencia_cierre_url` todavía apunta al S3
de Bubble en al menos algunas filas (el resto de columnas de `planes_accion`, como `lista_fotos`, ya están en
Supabase). Se incluye como Fase 2 Task 4 (alcance mínimo) en vez de abrir un plan aparte, ya que la Fase 2
ya construye la función genérica de re-subida de archivos.

### 2. Bubble tiene 8 formatos distintos bajo el mismo tipo `Informes`, no 2

Se investigó `id_formato` de todos los `Informes` en estado `Finalizado` de CISE y GRUAS:

| Tenant | `id_formato` | Nombre (Bubble `Formato.titulo`) | Código | Versión | Informes Finalizado | Estado en Supabase hoy |
|---|---|---|---|---|---:|---|
| CISE | `1619551534519x827573097185935400` | FORMATO DE INSPECCIÓN DE GRÚAS V2 | CISE-01 | v02 | 3.093 | ✅ Catalogado (`formatos` existente) |
| CISE | `1595542112449x409080868229087200` | FORMATO DE INSPECCIÓN DE GRÚAS | CISE-01 | v01 | 55 | ❌ Falta — es una **versión** del mismo `formatos` (mismo código CISE-01, ver plan de mayo §2) |
| CISE | `1595546424040x702906164512030700` | REPORTE DE PERSONAL | CISE-02 | v01 | 3.358 | ❌ Falta — formato nuevo (1 sección, ~7 preguntas) |
| CISE | `1595545508403x984980090463453200` | REPORTE DE ALQUILER DE MAQUINARIA | CISE-03 | v01 | 1.865 | ❌ Falta — formato nuevo (1 sección, ~12 preguntas) |
| CISE | `1617158510068x263631604230651900` | REPORTE DE PERSONAL (Sin Maquinaria) | CISE-02B | v01 | 1.033 | ❌ Falta — formato nuevo (1 sección, ~6 preguntas) |
| CISE | `1614637642201x789286829766213600` | REPORTE DE MOVILIZACIÓN/DESMOVILIZACIÓN | CISE-05 | v01 | 7 | ❌ Falta — formato nuevo (1 sección, ~15 preguntas) |
| GRUAS | `1734793744908x241014863998484500` | CHECKLIST DE GRÚAS V2 | V2 | v01 | 3.879 | ✅ Catalogado (`formatos` existente) |
| GRUAS | `1734547470724x198203873008025600` | CHECKLIST DE GRÚAS (Rev. 01) | V2 | Rev.01 | 3 | ❌ Falta — es una **versión** del mismo `formatos` (mismo código, 5 secciones/~35 preguntas, `con_informe=false`) |

**Total real a catalogar/migrar:** 4 formatos genuinamente nuevos (CISE-02, CISE-02B, CISE-03, CISE-05) + 2
versiones adicionales de formatos ya existentes (CISE-01 v01, GRUAS Rev.01) + sus ~9.409 informes Finalizado
correspondientes (que se suman a los ~6.972 de los 2 formatos ya catalogados — **total ≈16.381 informes
Finalizado entre CISE+GRUAS**, bastante más que el TK-I1 original, que solo contaba los 2 formatos ya
catalogados).

---

## Global Constraints

- **Scope de tenants: SOLO CISE (`1cb97ec7-326c-4376-93ee-ed317d3da51b`) y GRUAS
  (`6f4c923a-c3b7-47c2-9dea-2a187f274f73`)**.
- **Scope de formato: TODOS los `id_formato` reales de CISE y GRUAS** (los 8 de la tabla de arriba) — ya no
  hay exclusión por "no catalogado", ese era el alcance viejo (TK-I1 original); el usuario pidió ampliarlo.
- **Scope de estado: SOLO `estado = 'Finalizado'`.** `En Proceso`, `Suspendido`, `Cancelado` nunca se migran
  (decisión ya tomada, sin cambios).
- **Corte de año sobre `fecha_reporte`:** `< 2026-01-01` → modo cabecera (sin respuestas). `>= 2026-01-01`
  → modo completo (con respuestas). Sin cambios respecto a la decisión original — aplica igual a los 8
  formatos.
- **Orden de dependencias (punto 2 del usuario — ya verificado, sin bloqueantes):** Fase 0 (formatos) no
  depende de nada nuevo — usa `companies`/`tenants` ya migrados. Fase 1 (informes) depende de Fase 0
  (`formatos_preguntas.bubble_id` debe existir antes de mapear respuestas) y de que `terceros`, `maquinarias`,
  `cotizaciones` y `tareas` ya estén migrados — **confirmado, las 4 tienen datos reales hoy** (terceros:
  auditoría módulo 3 cerrada; maquinaria: módulo 2 cerrada; cotizaciones: 2.606 filas, módulo 6 auditado
  2026-09-07; tareas: 14.511 filas). Fase 2 (archivos) depende de que Fase 1 haya insertado las filas de
  `formatos_informes` (necesita el `id` de Supabase para saber dónde guardar cada `pdf_url`). Fase 3
  (validación) depende de que 0-1-2 hayan corrido.
- **Idempotencia y dry-run:** igual que el resto de scripts del proyecto — upsert por `bubble_id`, nunca
  `DELETE`, `--apply` explícito.

---

## Decisiones de una línea, a confirmar antes de `--apply` (sin cambios respecto a la versión anterior de este plan)

- **DUDA-MIG-002 (mapeo de estado):** `Finalizado` → `APROBADO` en `formatos_informes.estado`.
- **DUDA-MIG-003 (hosting del PDF):** re-subir todos los PDFs a Supabase Storage (esto ahora es explícito,
  ya no es una recomendación — el usuario lo pidió directamente en el punto 4).

**DUDA-MIG-001 queda resuelta** por el punto 1 del usuario: se migran todos los formatos, no solo los 2
originales.

---

## File Map

| File | Acción | Propósito |
|---|---|---|
| `scripts/migrate-formatos-faltantes.ts` | Crear | Fase 0 — catalogar los 4 formatos nuevos + 2 versiones faltantes |
| `scripts/migrate-informes-checklist-historico.ts` | Crear | Fase 1 — informes + respuestas, los 8 formatos |
| `scripts/migrate-archivos-bubble-a-supabase.ts` | Crear | Fase 2 — función reutilizable de descarga+resubida, aplicada a informes y a `planes_accion.evidencia_cierre_url` |
| `docs/auditoria-ui/07-informes.md` | Modificar | Cerrar TK-I1 con el resultado final y el nuevo alcance de 8 formatos |

---

## FASE 0 — Catalogar los formatos faltantes

### Task 0.1: Migrar los 4 formatos nuevos (CISE-02, CISE-02B, CISE-03, CISE-05)

**Files:**
- Create: `scripts/migrate-formatos-faltantes.ts`

**Interfaces:**
- Produce: 4 filas nuevas en `formatos` (una por código), cada una con 1 fila en `formatos_versiones`
  (`estado='PUBLICADA'` al final), y sus preguntas en `formatos_preguntas` (sin opciones múltiples salvo que
  el probe confirme que también usan el grupo "SI - NO (x) - NO APLICA" — verificar en Step 2, no asumir).

- [ ] **Step 1: Reusar el boilerplate y las funciones de `migrate-terceros-fields.ts` /
  `migrate-informes-checklist-historico.ts`** (`fetchAllBubble`, carga de env, cliente Supabase, mapeo de
  tenants) — no reinventar.

- [ ] **Step 2: Para cada uno de los 4 `id_formato` nuevos, fetch de `Formato` + `Formato_seccion` +
  `Formato_Pregunta` y loggear su estructura completa (sin escribir nada)**

```typescript
const FORMATOS_NUEVOS = [
  { bubbleId: '1595546424040x702906164512030700', tenant: 'CISE', nombre: 'REPORTE DE PERSONAL', codigo: 'CISE-02' },
  { bubbleId: '1595545508403x984980090463453200', tenant: 'CISE', nombre: 'REPORTE DE ALQUILER DE MAQUINARIA', codigo: 'CISE-03' },
  { bubbleId: '1617158510068x263631604230651900', tenant: 'CISE', nombre: 'REPORTE DE PERSONAL (Sin Maquinaria)', codigo: 'CISE-02B' },
  { bubbleId: '1614637642201x789286829766213600', tenant: 'CISE', nombre: 'REPORTE DE MOVILIZACIÓN/DESMOVILIZACIÓN', codigo: 'CISE-05' },
] as const
```

Para cada uno: `GET /Formato/{bubbleId}` → `lista_secciones[]` → por cada sección `GET /Formato_seccion/{id}`
(campos: solo `numero_seccion`, sin título propio, mismo patrón que el plan de mayo) → sus preguntas vía
`fetchAllBubble('Formato_Pregunta', [{key:'id_seccion', constraint_type:'equals', value: seccionId}])`.
Aplicar las mismas **reglas de skip** del plan de mayo §4 (Texto descriptivo/Tarea, Listado DB/Maquinaria,
Fecha GPS/Fecha, Fecha Hora/Fecha de reporte, Texto descriptivo/Título) — estos 4 formatos son más simples
(1 sola sección cada uno) así que es probable que la mayoría de sus preguntas sí sean preguntas reales, no
headers automáticos, pero **no asumir, verificar campo `subtipo` de cada una igual que se hizo con los 2
formatos originales**.

- [ ] **Step 3: Confirmar el grupo de opciones de cada pregunta tipo "Múltiples opciones"**

El plan de mayo encontró que CISE V1/V2 y GRUAS V2 comparten el mismo grupo `1623107775636x527252729130647550`
("SI - NO (x) - NO APLICA"). Verificar con un fetch real si estos 4 formatos nuevos usan el mismo grupo
(vía `formato_pregunta.id_grupo_opciones_multiples`) — si sí, reusar las 3 opciones hardcodeadas ya
definidas; si alguno usa un grupo distinto, fetch de `formato_grupo_opciones_multiple` +
`formato_opciones_multiples` para ese grupo específico y construir sus opciones reales (no asumir SI/NO/NA
si el grupo es otro).

- [ ] **Step 4: Insertar en Supabase — mismo patrón que `migrate-formatos-templates.ts` (Fase 1 del plan de
  mayo §5): `formatos` → `formatos_versiones` (BORRADOR) → `formatos_preguntas` → `formatos_opciones` →
  `formatos_versiones` (PUBLICADA) → `formatos.version_actual_id`**

- [ ] **Step 5: Dry-run, revisar conteos, luego `--apply`**

```bash
npx tsx scripts/migrate-formatos-faltantes.ts --step=nuevos
npx tsx scripts/migrate-formatos-faltantes.ts --step=nuevos --apply
```

### Task 0.2: Agregar las 2 versiones faltantes a formatos YA catalogados

**Interfaces:**
- Produce: 2 filas nuevas en `formatos_versiones` (CISE-01 v01, GRUAS V2 Rev.01), vinculadas al `formatos.id`
  que ya existe — **no crear filas nuevas en `formatos`**.

- [ ] **Step 1: Resolver el `formatos.id` existente por `codigo` + `tenant_id`** (CISE-01 para CISE, el
  código de GRUAS V2 para GRUAS — confirmar el código exacto leyendo la fila existente).

- [ ] **Step 2: Repetir Steps 2-4 de Task 0.1 pero insertando en `formatos_versiones` con el `formatos.id`
  resuelto, no uno nuevo.** Ojo: GRUAS Rev.01 tiene `con_informe=false` (a diferencia de todos los demás) —
  confirmar qué implica ese flag en el resto del código (`lib/actions/formatos.ts`) antes de decidir si se
  mapea a algún flag de `formatos_versiones` o se ignora con una nota.

- [ ] **Step 3: Dry-run, luego `--apply`**

```bash
npx tsx scripts/migrate-formatos-faltantes.ts --step=versiones --apply
```

- [ ] **Step 4: Verificación de conjunto — 6 registros en `formatos` (2 ya existentes + 4 nuevos), 8 en
  `formatos_versiones` (2 ya existentes + 2 nuevas versiones de esos + 4 de los formatos nuevos)**

```sql
select f.codigo, f.tenant_id, count(fv.id) versiones
from formatos f left join formatos_versiones fv on fv.formato_id = f.id
where f.tenant_id in ('1cb97ec7-326c-4376-93ee-ed317d3da51b','6f4c923a-c3b7-47c2-9dea-2a187f274f73')
group by f.codigo, f.tenant_id;
```

---

## FASE 1 — Migrar informes + respuestas (los 8 formatos)

Esta fase reemplaza y generaliza el plan anterior (que solo cubría 2 formatos) — misma lógica de
`splitByYear`/`estado='Finalizado'` ya diseñada, ahora iterando sobre los 8 `id_formato` de la tabla de
Contexto en vez de 1 por tenant.

### Task 1.1: Boilerplate y fetch filtrado, generalizado a lista de formatos

**Files:**
- Create: `scripts/migrate-informes-checklist-historico.ts`

```typescript
const FORMATOS_A_MIGRAR = [
  { tenant: 'CISE' as const, bubbleId: '1619551534519x827573097185935400', codigo: 'CISE-01', version: 'v02' },
  { tenant: 'CISE' as const, bubbleId: '1595542112449x409080868229087200', codigo: 'CISE-01', version: 'v01' },
  { tenant: 'CISE' as const, bubbleId: '1595546424040x702906164512030700', codigo: 'CISE-02', version: 'v01' },
  { tenant: 'CISE' as const, bubbleId: '1595545508403x984980090463453200', codigo: 'CISE-03', version: 'v01' },
  { tenant: 'CISE' as const, bubbleId: '1617158510068x263631604230651900', codigo: 'CISE-02B', version: 'v01' },
  { tenant: 'CISE' as const, bubbleId: '1614637642201x789286829766213600', codigo: 'CISE-05', version: 'v01' },
  { tenant: 'GRUAS' as const, bubbleId: '1734793744908x241014863998484500', codigo: 'GRUAS-V2', version: 'v01' },
  { tenant: 'GRUAS' as const, bubbleId: '1734547470724x198203873008025600', codigo: 'GRUAS-V2', version: 'Rev.01' },
]
```

`fetchInformesFiltrados` ahora recibe un `id_formato` puntual (no "el formato catalogado del tenant") y se
llama una vez por cada entrada de `FORMATOS_A_MIGRAR`. El resto de la lógica (`splitByYear`, `estado`) es
igual a la versión anterior de este plan.

- [ ] **Step 1-4:** iguales a la Task 2 de la versión anterior de este plan (boilerplate, `fetchAllBubble`,
  `fetchInformesFiltrados` parametrizado por `id_formato`, `splitByYear`) — no repetir aquí, ver historial
  de este archivo si hace falta el código exacto.

- [ ] **Step 5: Dry-run con el nuevo alcance completo y comparar contra la tabla de Contexto**

```bash
npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=all
```

Esperado (orden de magnitud): **≈16.381 informes Finalizado totales** entre los 8 formatos y 2 tenants (vs.
~6.972 de la versión anterior de este plan, que solo cubría 2 formatos) — el dry-run debe acercarse a esta
cifra; si difiere mucho, detenerse y revisar antes de aplicar.

### Task 1.2: Resolución de relaciones + cabecera — igual a la versión anterior

Sin cambios de lógica respecto a Task 3 de la versión anterior de este plan (`buildCabecera`, mapeo
`cliente_id`/`cotizacion_id`/`tarea_id`/`created_by` por `bubble_id`) — ahora se llama una vez por cada
`(tenant, id_formato)` de `FORMATOS_A_MIGRAR`, resolviendo `formato_id`/`version_id` contra el `formatos`
correspondiente (ya catalogado por Fase 0).

**Ajuste nuevo:** para formatos como CISE-02/CISE-03/CISE-02B/CISE-05 (que no son checklists de grúa sino
reportes de personal/maquinaria/movilización), revisar si además de `tarea_id` hace falta resolver
`maquinaria_id`/`personal_id` contra `id_objetos` de `Informes` — el campo existe en el schema de Bubble
(confirmado en el research de la versión anterior) pero no se usó todavía porque los 2 formatos originales
no lo necesitaban con la misma intensidad. Insertar en `formatos_informes_maquinarias`/`formatos_informes_personal`
cuando `id_objetos` venga poblado y el tipo de formato lo amerite (confirmar en el research de
implementación, no adivinar la relación 1:1 sin verificarla contra un registro real).

### Task 1.3: Respuestas — igual a la versión anterior (`Informe_respuesta`, ya confirmado)

Sin cambios respecto a la Task 5 de la versión anterior — `fetchRespuestasDeInforme` + `buildRespuestas`
por `id_informe`, mapeo `id_pregunta → formatos_preguntas.bubble_id` (ahora con más preguntas cacheadas,
las de los 8 formatos en vez de 2).

### Task 1.4: Orquestación y aplicación por tenant — igual a la versión anterior, iterando formatos

```bash
npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=GRUAS --apply   # el más chico primero
npx tsx scripts/migrate-informes-checklist-historico.ts --tenant=CISE --apply
```

---

## FASE 2 — Migrar archivos (PDFs + fotos) de Bubble a Supabase Storage

### Task 2.1: Función reutilizable de descarga + resubida

**Files:**
- Create: `scripts/migrate-archivos-bubble-a-supabase.ts`

**Interfaces:**
- Produce: `migrarArchivo(bubbleUrl: string, bucket: string, path: string): Promise<string | null>` —
  descarga de Bubble/S3, sube a Supabase Storage, devuelve la URL pública nueva. Registra cada intento en
  `file_migration_log` (tabla que **ya existe y ya se usó** para la migración de archivos de mayo — reusarla,
  no crear una tabla paralela, así el log queda unificado con el historial de esa migración anterior).

```typescript
async function migrarArchivo(
  bubbleUrl: string,
  bucket: string,
  storagePath: string,
  tableName: string,
  rowId: string,
  field: string,
): Promise<string | null> {
  const url = bubbleUrl.startsWith('//') ? `https:${bubbleUrl}` : bubbleUrl
  if (!APPLY) return `[dry-run] ${bucket}/${storagePath}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
    const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, { contentType, upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    await supabase.from('file_migration_log').upsert({
      table_name: tableName, row_id: rowId, field, bubble_url: url,
      storage_bucket: bucket, storage_path: storagePath, public_url: data.publicUrl,
      content_type: contentType, size_bytes: buffer.length, status: 'done',
    })
    return data.publicUrl
  } catch (e: any) {
    await supabase.from('file_migration_log').upsert({
      table_name: tableName, row_id: rowId, field, bubble_url: url,
      status: 'error', error: e.message,
    })
    return null
  }
}
```

- [ ] **Step 1: Confirmar el esquema exacto de `file_migration_log`** (columnas ya confirmadas por consulta
  directa: `table_name, row_id, field, bubble_url, storage_bucket, storage_path, public_url, content_type,
  size_bytes, status, error, attempts, created_at, updated_at`) y si tiene una PK/unique constraint que
  permita `upsert` limpio (revisar antes de asumir `upsert` sin conflicto declarado).

- [ ] **Step 2: Rate-limiting** — procesar en lotes secuenciales pequeños (10 a la vez), igual criterio que
  el resto de scripts de este proyecto.

### Task 2.2: Aplicar a los PDFs de `formatos_informes` (todos los migrados en Fase 1)

- [ ] **Step 1:** para cada fila de `formatos_informes` con `pdf_url` apuntando todavía a
  `archivo_web`/S3-de-Bubble (es decir, recién insertada por Fase 1 sin re-subir), llamar `migrarArchivo`
  con bucket `informes-pdf`, path `{tenant_slug}/{codigo_informe}.pdf`, y hacer `UPDATE formatos_informes
  SET pdf_url = <nueva url>`.

- [ ] **Step 2:** correr para GRUAS primero (menor volumen), verificar 3 PDFs abren bien, luego CISE.

**Nota de integración con Fase 1:** dado que Fase 1 ya construye `pdf_url` como parte de `buildCabecera`
(Task 4 de la versión anterior de este plan, `reuploadPdf`), en la práctica **Fase 1 y Fase 2 Task 2.2 son
la misma operación** — se listan por separado en este documento porque Fase 2 generaliza la función a otras
tablas (Task 2.3), pero en la implementación real `reuploadPdf` de Fase 1 debe ser la misma función
`migrarArchivo` de Fase 2, no una duplicada. Implementar Fase 2 Task 2.1 primero, y que Fase 1 la importe.

### Task 2.3: Fotos adjuntas en `formatos_informes_respuestas` (si existen)

- [ ] **Step 1:** revisar si alguna respuesta de los 8 formatos tiene `tipo = "Adjunto"`/`"Foto"` con un
  valor de archivo (campo a confirmar en la implementación — no se vio en la muestra de `Informe_respuesta`
  research de este plan, que fueron preguntas SI/NO/Texto/Fecha; **puede que ningún formato de checklist
  tenga preguntas de foto real** — confirmar contando `formatos_preguntas` con `tipo='FOTO'` entre los 8
  formatos antes de invertir tiempo en este Step).

- [ ] **Step 2:** si existen, aplicar `migrarArchivo` con bucket `informes-fotos`, actualizar
  `formatos_informes_respuestas.valor_foto_url`.

### Task 2.4: Hallazgo oportunista — `planes_accion.evidencia_cierre_url`

**Contexto:** durante el research de este plan (punto 4 del usuario, "migrar todos los archivos") se
encontró que `planes_accion.evidencia_cierre_url` todavía apunta al S3 de Bubble en al menos algunas filas
(a diferencia de `planes_accion.lista_fotos`, que ya está en Supabase desde la migración de mayo). No es
parte del alcance de Informes/Checklist, pero se resuelve acá porque la función `migrarArchivo` ya está
construida y el volumen es chico.

- [ ] **Step 1:** `SELECT count(*) FROM planes_accion WHERE evidencia_cierre_url LIKE '%bubble%' OR
  evidencia_cierre_url LIKE '%amazonaws%'` para dimensionar antes de tocar nada.

- [ ] **Step 2:** aplicar `migrarArchivo` con bucket `planes-accion` (mismo bucket que `lista_fotos` si
  existe, revisar convención), `UPDATE planes_accion SET evidencia_cierre_url = <nueva url>`.

---

## FASE 3 — Validación final

### Task 3.1: Conteos finales vs. la tabla de Contexto

```sql
select fi.tenant_id, f.codigo, count(*) informes, count(fi.pdf_url) con_pdf,
       count(*) filter (where fi.pdf_url NOT LIKE '%bubble%' AND fi.pdf_url NOT LIKE '%amazonaws%') pdf_en_supabase,
       count(*) filter (where fir.informe_id is not null) con_respuestas
from formatos_informes fi
join formatos f on f.id = fi.version_id  -- o el join correcto según cómo quede version_id/formato_id
left join formatos_informes_respuestas fir on fir.informe_id = fi.id
where fi.tenant_id in ('1cb97ec7-326c-4376-93ee-ed317d3da51b','6f4c923a-c3b7-47c2-9dea-2a187f274f73')
group by fi.tenant_id, f.codigo;
```

Esperado: ~16.381 informes totales repartidos entre los 8 formatos según la tabla de Contexto, 100% con
`pdf_en_supabase`, y `con_respuestas` solo en los de 2026 (usar el conteo real del dry-run de Fase 1 como
referencia, no un número fijo).

### Task 3.2: Actualizar `docs/auditoria-ui/07-informes.md`

Marcar TK-I1 como resuelto, actualizar la tabla de formatos (ya no son 2, son 8), actualizar el veredicto
de cierre del módulo de 🔴 a 🟢 si todo lo anterior corrió sin errores significativos, o 🟡 si queda algún
residual documentado (ej. respuestas sin `pregunta_id` resuelto, informes sin PDF descargable).

### Task 3.3: Nota para no perder este hallazgo — actualizar el propio plan de mayo

Agregar una nota al final de `docs/superpowers/plans/2026-05-25-migracion-formatos-checklist.md` señalando
que su resultado se perdió en el reset del 2026-05-26 y fue re-migrado por este plan (2026-09-07) —
para que quien lea ese documento en el futuro no vuelva a confundirse pensando que sigue vigente.

---

## Self-review

- **Cobertura del spec:** los 4 puntos del usuario están cubiertos — (1) Fase 0 cataloga los 6 formatos
  faltantes (4 nuevos + 2 versiones), (2) el orden de dependencias se verificó explícito en Global
  Constraints con evidencia real de que terceros/maquinaria/cotizaciones/tareas ya están migrados, (3) la
  sección de Contexto documenta la causa raíz y confirma que el resto del proyecto no tiene el mismo
  problema (con la única excepción oportunista de `planes_accion.evidencia_cierre_url`, ya incorporada como
  Task 2.4), (4) Fase 2 migra archivos de informes y generaliza la función para cualquier otro archivo
  suelto que aparezca.
- **Placeholders:** ninguno bloqueante. Task 1.2 tiene una verificación explícita a hacer en
  implementación (si `id_objetos` debe poblar `formatos_informes_maquinarias`/`_personal` para los formatos
  de reportes) en vez de asumir la respuesta sin datos — correcto dejarlo como paso de investigación
  explícito, no un placeholder de pereza. Task 2.3 igual (confirmar si existen preguntas tipo FOTO antes de
  construir esa parte).
- **Consistencia de tipos:** `migrarArchivo` de Fase 2 Task 2.1 es la misma función que debe usar Fase 1
  (antes llamada `reuploadPdf`) — señalado explícitamente para no duplicar lógica.
- **Decisión de diseño explícita:** reusar `file_migration_log` (tabla ya existente de la migración de
  archivos de mayo) en vez de crear una tabla de log nueva — mantiene un solo historial unificado de todas
  las migraciones de archivos del proyecto, pasadas y presentes.
