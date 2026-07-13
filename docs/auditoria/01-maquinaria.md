# Auditoría módulo — Maquinaria (Catálogos #1)

**Fecha:** 2026-04-19
**Cutover objetivo:** 2026-04-26 (7 días)
**Screenshots referencia:** `1- Reporta Next - Maquinaria.pdf` (del usuario)

El módulo Maquinaria de Bubble tiene 3 sub-módulos: **Maquinaria**, **Tipos Docs Maq.**, **Documentos Maq.** Se auditan por separado.

Severidad:
- 🔴 BLOQUEA-CUTOVER — sin esto no se puede hacer el cutover del 2026-04-26.
- 🟡 POST-CUTOVER — no crítico, puede ir a Fase 4.
- 🟢 MEJORA — opcional / nice-to-have.

---

## 1.1 Maquinaria (equipos)

**Archivos Next:** [app/(dashboard)/maquinarias/page.tsx](../../app/(dashboard)/maquinarias/page.tsx) · [maquinaria-table.tsx](../../app/(dashboard)/maquinarias/maquinaria-table.tsx) · [create/page.tsx](../../app/(dashboard)/maquinarias/create/page.tsx) · [[id]/edit](../../app/(dashboard)/maquinarias/[id]/edit/client-edit-page.tsx) · [components/maquinaria/maquinaria-form.tsx](../../components/maquinaria/maquinaria-form.tsx) · [lib/actions/maquinarias.ts](../../lib/actions/maquinarias.ts)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Columnas: código, equipo, marca, modelo, **capacidad**, placa, propietario | código, equipo, categoría, marca, modelo, placa, propiedad, estado | Falta columna `capacidad` (existe en DB) | 🟡 | 15 min |
| 2 | Filtros: Habilitados/Deshabilitados · Propiedad · Equipo · Capacidad · Proveedor | Sólo búsqueda por nombre + tabs Activos/Papelera | Falta panel de filtros avanzados | 🟡 | 2h |
| 3 | Búsqueda por placa | Búsqueda por nombre | No se busca por placa (uso diario del operador) | 🟡 | 15 min |
| 4 | Descargar Excel | ❌ | Export Excel (users lo usan en auditorías SST) | 🟡 | 1.5h |
| 5 | Formulario 2-pasos (Inf. Básica → Documentos) | Formulario single-page + tab separada Documentos | Distinto flujo, pero funcionalmente equivalente | 🟢 | — |
| 6 | Foto con preview + validación formato JPG/PNG + tamaño 600×240 | Upload con compresión 50% | Equivalente | ✅ | — |
| 7 | Propietario: checkbox "es de un proveedor" + dropdown proveedor | Select `propietario` (propio/tercero) + dropdown condicional proveedor_id | Equivalente | ✅ | — |
| 8 | Menú fila: Ver, Editar, Deshabilitar | Menú: Copiar ID, Editar, Eliminar. No hay Ver, usa paradigma papelera | Falta "Ver" (modo solo-lectura) | 🟢 | 1h |
| 9 | Deshabilitar/Habilitar in-place | Soft-delete → va a Papelera, restaurable | Semánticamente equivalente; UX distinta. Requiere retraining mínimo | 🟡 | — (decisión) |
| 10 | Paginación server-side | Paginación client-side (react-table) | Con 137 maquinarias escala bien | ✅ | — |

**Total esfuerzo Maquinaria:** ~5h si se hacen todos los 🟡.

---

## 1.2 Tipos Docs Maq.

**Archivos Next:** [app/(dashboard)/maquinarias/types/](../../app/(dashboard)/maquinarias/types/) · [components/maquinaria/tipo-doc-form.tsx](../../components/maquinaria/tipo-doc-form.tsx) · [lib/actions/maquinaria-types.ts](../../lib/actions/maquinaria-types.ts)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 11 | Columnas: código, documento, vence (SÍ/NO), alerta días, seguro, garantía, individual/dual | Nombre, Aplica a, Vencimiento, Días Alerta, Obligatorio | Falta `código`. Modelos semánticos distintos pero Next es más versátil (ver nota) | 🟢 | 30 min |
| 12 | Detail: nombre, código, categoría (DOC CON VENCIMIENTO), alerta días | Dialog modal con: nombre, categoría (seguro/con_vencimiento/sin_vencimiento), aplica_a, dias_alerta, es_obligatorio | Next incluye `aplica_a` (todos/vehículo/maquinaria/categoría/modelo) — **más expresivo** | ✅ (mejora) | — |
| 13 | Acciones fila: Ver, Editar, Deshabilitar | Sólo Eliminar + Restaurar | **Falta Editar** — sin esto no se corrige un typo ni se cambia "días alerta" | 🔴 | 1.5h |
| 14 | Filtros: Habilitados/Deshabilitados | Tabs Activos/Papelera | Equivalente | ✅ | — |

**Nota sobre "código":** Bubble lo usa como identificador humano (5, 7, 3…). Next usa UUID opaco. Decisión: ¿agregar `codigo_numerico` opcional para mantener legibilidad en reportes impresos?

**Total esfuerzo Tipos Docs:** ~2h (1 🔴 + polish).

---

## 1.3 Documentos Maq. (instancias)

**Archivos Next:** [app/(dashboard)/maquinarias/documentos/](../../app/(dashboard)/maquinarias/documentos/) · [components/maquinaria/global-document-dialog.tsx](../../components/maquinaria/global-document-dialog.tsx) · [lib/actions/maquinaria-docs.ts](../../lib/actions/maquinaria-docs.ts)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 15 | Columnas: maquinaria, **placa**, **propietario**, documento, **válido desde**, estado (VENCIDO/POR VENCER/VIGENTE), vence en N días, válido hasta, archivo | Equipo+modelo, Tipo Doc, Nº Doc, Estado (VENCIDO/VIGENTE), Vencimiento, Archivo | Faltan columnas: **placa, propietario, válido desde, "vence en N días"** | 🟡 | 1h |
| 16 | Detail: tipo doc, **tipo maquinaria (Interna/Externa)**, maquinaria, archivo, **válido desde**, válido hasta | Dialog con: tipo_documento, maquinaria, archivo, fecha_vencimiento (opcional) | Falta `válido_desde` (cálculo correcto de vigencia) y `tipo maquinaria Interna/Externa` — aunque Next ya deriva propio/tercero desde la maquinaria, el campo Bubble es redundante | 🔴 válido_desde · 🟢 tipo_maq | 1h |
| 17 | Descargar Excel, Descargar ZIP (docs seleccionados), Nuevo | ✅ Excel, ✅ ZIP, ✅ Nuevo | Parity OK | ✅ | — |
| 18 | Acciones fila: Ver, Editar, Deshabilitar | Descargar, Eliminar, Restaurar. No hay Editar | **Falta Editar** de documento existente (si se ingresó fecha mal) | 🔴 | 1.5h |
| 19 | Filtros: Habilitados · Clasificación · Proveedor · Fecha vencimiento (rango) · búsqueda placa · select tipo doc | Búsqueda generic · tipo doc · estado (Vigente/Por vencer 30d/Vencido) · tabs Activos/Papelera | Faltan: **Proveedor**, **Clasificación**, **rango fecha vencimiento** | 🟡 | 2h |
| 20 | Búsqueda por placa | Búsqueda generic (equipo, tipo, número) | Funciona pero menos directo | 🟢 | 15 min |

**Total esfuerzo Documentos:** ~5.5h (2 🔴 críticos + 🟡).

---

## Resumen y recomendación pre-cutover

### 🔴 BLOQUEA-CUTOVER (4h)

1. **Editar Tipo de Documento** (1.5h) — sin esto no se puede corregir un tipo doc ya creado.
2. **Editar Documento de Maquinaria** (1.5h) — sin esto no se puede corregir una fecha de vigencia mal ingresada.
3. **Campo `válido_desde` en Documento** (1h) — necesario para cálculo de vigencia real y auditorías SST.

### 🟡 POST-CUTOVER (total ~13h — diferidos)

- Columnas faltantes en listados (capacidad, placa, propietario, válido desde)
- Panel de filtros avanzados (maquinaria + documentos)
- Búsqueda por placa como campo dedicado
- Export Excel de maquinaria
- "Ver" mode solo-lectura
- Filtros Proveedor, Clasificación, rango de fecha en documentos

### 🟢 MEJORAS (opcionales)

- Código numérico legible en tipos doc
- Formulario 2-pasos estilo wizard

### Decisión del usuario (confirmar)

- ✅ Deshabilitar/Habilitar vs Papelera/Restaurar — **usuario ya opinó:** "quiza cambio un poco el menu, pero creo que la version nueva es mas versatil". **Acepto papelera como diseño final.**
- 🟡 Código legible en tipos doc: ¿se agrega o se vive con UUID? (afecta impresiones SST)

### Plan sugerido

Hacer los 3 🔴 (~4h) antes del cutover. El resto se difiere a Fase 4 del roadmap (post-cutover).
