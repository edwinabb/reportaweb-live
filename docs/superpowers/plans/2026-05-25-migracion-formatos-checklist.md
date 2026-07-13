# Plan de Migración: Formatos / Checklist — Templates (Bubble → Supabase)
## Para revisión — NO implementar aún

**Fecha de preparación:** 2026-05-25  
**Contexto:** Cutover programado ~2026-05-31

---

## 1. Contexto: dos sistemas distintos

### Sistema A — Antiguo (`inspecciones` + `inspecciones_detalles`)
- **YA MIGRADO** — no tocar

### Sistema B — Nuevo (`formatos` + `formatos_informes`) ← lo que nos interesa
- Schema: `formatos` → `formatos_versiones` → `formatos_preguntas` + `formatos_opciones` → `formatos_informes` → `formatos_informes_respuestas`
- Bubble types confirmados con probe:
  - Templates: `formato`, `formato_seccion`, `formato_pregunta`
  - Opciones: `formato_opciones_multiples` (field `id_pregunta_ BORRAR` — **deprecado**, no hay registros activos ligados)
  - Respuestas llenadas: **tipo Bubble desconocido** — todos los candidatos probados devuelven 404 (`formatos_informes`, `formatos_informes_respuestas`, `formato_informe`, `formato_informes`, `informe_formato`, `checklist_informe`, `formato_respuesta`)
  - ⚠️ Pendiente: confirmar el nombre del tipo Bubble para informes llenados antes de implementar Fase 2

---

## 2. Formatos a migrar — decisiones confirmadas

| # | Formato | Tenant | Bubble ID | Estado |
|---|---|---|---|---|
| 1 | GRUAS V2 — "CHECKLIST DE GRÚAS V2" | GRUAS | `1734793744908x241014863998484500` | **Ya creado manualmente en Supabase** — NO migrar |
| 2 | CISE V1 — "FORMATO DE INSPECCIÓN DE GRÚAS" (v01, Sep-20) | CISE | `1595542112449x409080868229087200` | Migrar desde Bubble |
| 3 | CISE V2 — "FORMATO DE INSPECCIÓN DE GRÚAS V2" (v02, Abr-21) | CISE | `1619551534519x827573097185935400` | Migrar desde Bubble |

**Clave:** Ambos formatos CISE tienen `codigo = 'CISE-01'` → son **dos versiones** del mismo registro `formatos`. Se crean como 1 fila en `formatos` con 2 filas en `formatos_versiones`.

---

## 3. Estructura Bubble confirmada (probes ejecutados 2026-05-25)

### 3.1 `formato` — campos reales

```
_id, titulo, codigo, version, descripcion, fecha_aprobacion,
lista_secciones[], categoría, puntaje_maximo, con_informe,
requiere_pdf?, deshabilitado?, id_empresa, Created Date, Modified Date
```

### 3.2 `formato_seccion` — campos reales

```
_id, id_formato, id_empresa, numero_seccion, lista_preguntas[],
biblioteca?, Created Date, Modified Date
```
- **Sin campo `titulo`** — las secciones solo tienen número
- `lista_preguntas[]` define el orden de display de las preguntas

### 3.3 `formato_pregunta` — campos reales

```
_id, id_formato, id_seccion, id_empresa_nuevo,
numero_pregunta, numero_para_pdf (solo V2),
tipo, subtipo, titulo, obligatoria?, automatico?,
puntaje, pregunta_critica, info_adicional?, biblioteca?,
Created Date, Modified Date
```

### 3.4 Estructura de cada formato

| Formato | Secciones | Preguntas totales |
|---|---|---|
| GRUAS V2 | 3 (sec1: 12q, sec2: 12q, sec3: 11q) | 35 |
| CISE V1 | 1 (sec1: 57q) | 57 (contando dups de número) |
| CISE V2 | 6 (11+10+10+10+12+6 = 59q) | 59 |

---

## 4. Mapeo de campos — Templates

### `formato` → `formatos` (1 registro para ambas versiones CISE)

| Campo Bubble | Campo Supabase | Valor |
|---|---|---|
| `_id` del V2 más reciente | `bubble_id` | `1619551534519x827573097185935400` |
| `id_empresa` | `tenant_id` | CISE Supabase UUID |
| `titulo` | `nombre` | "FORMATO DE INSPECCIÓN DE GRÚAS" |
| `codigo` | `codigo` | "CISE-01" |
| `descripcion` | `descripcion` | texto del campo |
| `deshabilitado?` → inverso | `is_active` | true (no está deshabilitado) |

### `formato` → `formatos_versiones` (una fila por versión)

| Campo Bubble | Campo Supabase | V1 | V2 |
|---|---|---|---|
| `version` | `numero_version` (int) | 1 | 2 |
| `version` | `etiqueta_version` | "01" | "02" |
| `fecha_aprobacion` | `publicado_at` | 2020-09-20 | 2021-04-27 |
| — | `estado` | `'PUBLICADA'` | `'PUBLICADA'` |
| — | `muestra_bloque_empresa` | TRUE | TRUE |
| — | `muestra_bloque_cliente` | TRUE | TRUE |
| — | `muestra_bloque_cotizacion` | FALSE | FALSE |
| — | `muestra_bloque_tarea` | TRUE | TRUE |
| — | `muestra_bloque_observaciones` | TRUE | TRUE |
| — | `muestra_bloque_firma` | TRUE (con_informe=true) | TRUE |
| — | `requisito_maquinaria` | `'UNICO'` (tiene preg. Maquinaria) | `'UNICO'` |
| — | `requisito_personal` | `'OPCIONAL'` | `'OPCIONAL'` |

⚠️ **Problema con trigger:** `formatos_versiones.estado = 'PUBLICADA'` activa el trigger de inmutabilidad — no se pueden agregar preguntas después. El script debe:
1. Insertar versión con `estado = 'BORRADOR'`
2. Insertar todas las preguntas y opciones
3. Hacer `UPDATE formatos_versiones SET estado = 'PUBLICADA'`
4. Hacer `UPDATE formatos SET version_actual_id = ...` al final

### Reglas de skip para `formato_pregunta`

Estas preguntas son **campos de encabezado automáticos** en Supabase (bloques del informe) y NO se insertan en `formatos_preguntas`:

| Tipo Bubble | Subtipo Bubble | Motivo de skip |
|---|---|---|
| `"Texto descriptivo"` | `"Tarea"` | → `muestra_bloque_tarea = TRUE` |
| `"Listado DB"` | `"Maquinaria"` | → `requisito_maquinaria = 'UNICO'` |
| `"Fecha GPS"` | `"Fecha"` | → campo `fecha_inicio` en `formatos_informes` |
| `"Fecha Hora"` | `"Fecha de reporte"` | → campo `fecha_inicio` en `formatos_informes` |
| `"Texto descriptivo"` | `"Título"` | Separador visual → usar texto como `seccion` label para preguntas siguientes |

### Tipos de pregunta (`formato_pregunta.tipo + subtipo` → `formatos_preguntas.tipo`)

| Tipo Bubble | Subtipo Bubble | Tipo Supabase |
|---|---|---|
| `"Múltiples opciones"` | `"Selección única"` | `SELECCION_UNICA` |
| `"Múltiples opciones"` | `"Selección múltiple"` | `SELECCION_MULTIPLE` |
| `"Respuesta abierta"` | `"Texto largo"` | `TEXTO_LARGO` |
| `"KPI"` | `"Horómetro"` o `"Kilometraje"` | `NUMERO` |
| `"Adjunto"` | `"Foto"` | `FOTO` |

### Secciones (`formato_seccion.numero_seccion` → `formatos_preguntas.seccion`)

Dado que las secciones de Bubble no tienen título, la estrategia es:
- Los "Texto descriptivo/Título" dentro de la sección se usan como nombre de la sección para las preguntas que siguen.
- Si no hay Título en la sección, usar "Sección {n}".

**CISE V1** (1 sección Bubble → 3 secciones lógicas):
| Preguntas Bubble (por orden en lista_preguntas) | Sección Supabase |
|---|---|
| #11–#49 (todas las Selección única) | `"Inspección"` |
| #50–#53 (Titulo "Medidores al inicio" + KPI + Foto x2) | `"Medidores al inicio"` |
| #54–#58 (Titulo "Medidores al final" + KPI + Foto x2) | `"Medidores al final"` |

**CISE V2** (6 secciones Bubble → 6 secciones Supabase):
| Sec Bubble | Preguntas activas | Sección Supabase propuesta |
|---|---|---|
| sec1 (#5 Título "Realice la inspección..." + #6-#11) | 6 preguntas | `"Inspección General"` |
| sec2 | 10 preguntas | `"Sistema de Elevación"` |
| sec3 | 10 preguntas | `"Sistema Hidráulico"` |
| sec4 | 10 preguntas | `"Componentes y Seguridad"` |
| sec5 | 7 preguntas + #8 Título "Medidores antes..." + KPI/Foto x2 | `"Seguridad"` / `"Medidores al inicio"` |
| sec6 | #1 Título "Medidores al final..." + KPI/Foto x2 + Comentarios | `"Medidores al final"` |

> Puedes renombrar las secciones en el UI después del cutover.

### Opciones (`formato_grupo_opciones_multiple` + `formato_opciones_multiples` → `formatos_opciones`)

Estructura real confirmada con probe (2026-05-25):
- `formato_pregunta.id_grupo_opciones_multiples` → apunta a `formato_grupo_opciones_multiple`
- **Todas** las preguntas `SELECCION_UNICA` de GRUAS V2, CISE V1 y CISE V2 usan el **mismo grupo** `1623107775636x527252729130647550` = "SI - NO (x) - NO APLICA"
- `lista_rtas_erroneas[]` en el grupo indica qué opciones son respuestas incorrectas → `es_conforme = FALSE`

| orden | etiqueta Bubble | valor | es_conforme | Motivo |
|---|---|---|---|---|
| 1 | SI | si | TRUE | No está en `lista_rtas_erroneas` |
| 2 | NO | no | FALSE | Sí está en `lista_rtas_erroneas` |
| 3 | NO APLICA | no-aplica | NULL | No está en `lista_rtas_erroneas` |

El script puede hardcodear estas 3 opciones para todos los formatos (sin necesidad de fetch dinámico).

---

## 5. Script: `migrate-formatos-templates.ts`

### Secuencia de ejecución

```
Step 1: Fetch all datos de Bubble
  - formato records (CISE V1, CISE V2)
  - formato_seccion records para cada formato
  - formato_pregunta records para cada formato

Step 2: Upsert formatos (1 registro CISE-01)
  - bubble_id = CISE V2 _id
  - ON CONFLICT (tenant_id, codigo) DO UPDATE

Step 3: Para cada versión (V1, V2):
  3a. INSERT formatos_versiones con estado='BORRADOR'
  3b. Build seccion_map: bubble_seccion_id → seccion_label (via numero_seccion + lista_preguntas order)
  3c. Procesar lista_preguntas en orden del array:
      - Si tipo es "header" → skip (actualiza current_seccion si es Título)
      - Si no → insertar en formatos_preguntas con:
          version_id, tenant_id, texto=titulo, tipo (mapeado),
          seccion (current_seccion), orden (secuencial), requerida=obligatoria?
  3d. Para cada pregunta SELECCION_UNICA/SELECCION_MULTIPLE → insertar 3 opciones SI/NO/NA en formatos_opciones
  3e. UPDATE formatos_versiones SET estado='PUBLICADA', publicado_at=fecha_aprobacion

Step 4: UPDATE formatos SET version_actual_id = id de V2 (versión más reciente)

Step 5: Inspect — mostrar conteos finales vs Bubble
```

### Comandos

```bash
npx tsx scripts/migrate-formatos-templates.ts --step=inspect
npx tsx scripts/migrate-formatos-templates.ts --step=migrate
npx tsx scripts/migrate-formatos-templates.ts --step=all   # default
```

### Estimación de filas

| Tabla | CISE V1 | CISE V2 | Total |
|---|---|---|---|
| `formatos` | 1 (compartido) | — | 1 |
| `formatos_versiones` | 1 | 1 | 2 |
| `formatos_preguntas` | ~40 (excluye 17 headers) | ~48 (excluye 11 headers) | ~88 |
| `formatos_opciones` (SI/NO/NA) | ~36 x 3 | ~43 x 3 | ~237 |

---

## 6. Fase 2 — Informes llenados (PENDIENTE — tipo Bubble desconocido)

El tipo Bubble para informes llenados está por confirmar. Los 6 candidatos probados devolvieron 404.

**Acción necesaria:** Buscar en el módulo `/informes/nuevo` de reporta.la qué tipo de Bubble usa para crear/leer informes de checklist. O revisar el Bubble editor para el tipo exacto.

Una vez confirmado el tipo:

```bash
# Histórico finalizados (solo PDF)
npx tsx scripts/migrate-formatos-informes.ts --mode=pdf-only --before=2026-05-01

# Mayo 2026 activos (respuestas completas)
npx tsx scripts/migrate-formatos-informes.ts --mode=full --from=2026-05-01

# Borradores Ene-Abr (decisión: si se migran o se cierran en Bubble)
npx tsx scripts/migrate-formatos-informes.ts --mode=draft --from=2026-01-01 --before=2026-05-01
```

---

## 7. Checklist pre-cutover

```
[x] Probe ejecutado — estructura Bubble confirmada
[x] GRUAS V2 ya existe en Supabase
[x] Borradores test (~32) borrados de formatos_informes
[x] formatos de prueba borrados
[x] Tipo Bubble confirmado: informes / informe_seccion / informe_respuesta
[x] Script migrate-formatos-templates.ts implementado y probado
[x] Ejecutar migrate-formatos-templates.ts --step=migrate (CISE V1, V2, GRUAS V2)
[x] bubble_id agregado a formatos_preguntas — re-migrado con --force
[x] Verificar Supabase: 52+53+31 preguntas, 132+132+90 opciones, todas PUBLICADA
[x] Confirmar nombres de sección en UI (CISE visible por usuario)
[x] Fase 2: Script migrate-formatos-informes.ts implementado
[x] Fase 2: pdf-only --before=2026-05-01  →  6,294 informes migrados (CISE+GRUAS)
[x] Fase 2: draft --from=2026-01-01 --before=2026-05-01  →  69 borradores + 954 respuestas
[x] Fase 2: full --from=2026-05-01  →  144 informes + 4,271 respuestas
[x] Constraint uk_formatos_informes_correlativo corregida a (tenant_id, codigo_informe)
[x] Parche FKs: 6,974 informes parchados — tarea 99%, cotizacion 93%, cliente 93% (CISE 2021 sin links = normal)
[x] RBAC /informes: 109/109 cargos CISE + 110/110 cargos GRUAS con puede_ver=true y puede_ingresar=true ✅
```

### Resumen estado Supabase (2026-05-25)

| Tabla | CISE V1 | CISE V2 | GRUAS V2 |
|---|---|---|---|
| formatos_preguntas | 52 | 53 | 31 |
| formatos_opciones | 132 | 132 | 90 |
| formatos_informes | 58 | 2,968 | 3,481 |
| formatos_informes_respuestas | ~50 | ~4,100 | ~1,075 |

**Notas post-migración:**
- 5 CISE informes con respuestas duplicadas en Bubble (dato inconsistente en origen) → insertados sin respuestas
- ~536 borradores pre-2026 (nunca finalizados) → dejados en Bubble, fuera de scope
- 9 GRUAS informes ya existían en Supabase (manuales) → omitidos

---

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Tipo Bubble informes llenados desconocido | **BLOQUEANTE** Fase 2 | Investigar en Bubble editor / app web |
| CISE V1 preguntas con `numero_pregunta` duplicado | Orden incorrecto | Usar `lista_preguntas[]` del `formato_seccion` como orden canónico |
| Trigger `PUBLICADA` inmutable | Insert de preguntas falla | Script inserta como BORRADOR → preguntas → PUBLICADA (orden correcto) |
| Secciones sin nombre significativo | UI poco usable | Nombres propuestos son editables después |
