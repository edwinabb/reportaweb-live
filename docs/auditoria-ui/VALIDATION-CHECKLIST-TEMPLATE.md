# Plantilla: Checklist de Validación Final

**Módulo:** [Nombre del módulo]  
**Fecha:** [YYYY-MM-DD]  
**Auditor:** Claude Code  
**Validación:** [Usuario]  
**Status:** ⏳ PENDIENTE

---

## 1. Matriz de Auditoría

**Documento:** `docs/auditoria-ui/[NN]-[modulo].md`

| Sección | Completitud | Notas |
|---------|------------|-------|
| Sidebar mapping | ✅ | Ver 00-sidebar.md |
| Sub-módulos (listas) | ⏳ | [Contar: X/Y campos] |
| Sub-módulos (crear) | ⏳ | [Contar: X/Y campos] |
| DUDAs respondidas | ⏳ | [Contar: X/Y] |
| Tickets asignados | ⏳ | [Contar: CRÍTICO/MEDIA/BAJA] |

---

## 2. Validación de UI — Comparativo Bubble vs Reportaweb3

### 2.1 Lista Principal

**Bubble:**
- 📸 Screenshot: `c:/tmp/screenshots/reportar/[N] [modulo]/[N] [modulo] lista.png`
- Columnas visibles: [columna1, columna2, ...]
- Búsqueda: [multicampo/single]
- Filtros: [popup/column-header]

**Reportaweb3:**
- 📸 Screenshot: [captura realizada 2026-MM-DD HH:mm]
- Columnas visibles: [columna1, columna2, ...]
- Búsqueda: ✅ Multicampo / ❌ Single
- Filtros: ✅ Column-header / ❌ Popup

**Validación:** 
- [ ] Todas las columnas presentes
- [ ] Búsqueda multicampo funcional
- [ ] Filtros por columna funcionales
- [ ] Ordenamiento funciona

### 2.2 Crear / Editar

**Bubble:**
- 📸 Screenshot paso 1: `c:/tmp/screenshots/reportar/[N] [modulo]/[N] [modulo] crear paso [X].png`
- Campos: [campo1, campo2, ...]
- Validaciones: [requeridos, tipos, etc.]

**Reportaweb3:**
- 📸 Screenshot paso 1: [captura realizada 2026-MM-DD HH:mm]
- Campos: [campo1, campo2, ...]
- Validaciones: ✅ OK / ❌ Faltante

**Validación:**
- [ ] Todos los campos presentes
- [ ] Tipos de campos correctos (input/select/textarea)
- [ ] Validaciones funcionan
- [ ] Re-autenticación si aplica (PIN, firma, etc.)

### 2.3 Acciones de Fila

**Bubble:**
- 📸 Screenshot menú: `c:/tmp/screenshots/reportar/[N] [modulo]/[N] [modulo] lista-menu.png`
- Acciones: [acción1, acción2, ...]

**Reportaweb3:**
- 📸 Screenshot menú: [captura realizada 2026-MM-DD HH:mm]
- Acciones: [acción1, acción2, ...]

**Validación:**
- [ ] Todas las acciones presentes
- [ ] Acciones funcionan correctamente
- [ ] Confirmaciones/diálogos se muestran

---

## 3. Validación de Datos

### 3.1 Cobertura por Campo

| Campo | Tabla.Columna | Total | Poblados | % | Status |
|-------|---------------|-------|----------|---|--------|
| [campo1] | schema.col | — | — | — | ✅/🟡/🔴 |
| [campo2] | schema.col | — | — | — | ✅/🟡/🔴 |

**Leyenda:**
- ✅ OK (>80% coverage)
- 🟡 Parcial (10-80% coverage)
- 🔴 Faltante (0-10% coverage)

### 3.2 Gaps Identificados

| ID | Gap | Tipo | Datos | Acción |
|----|-----|------|-------|--------|
| Gap-1 | [descripción] | 🔴 Migración | 0% | Auditar → Migrar |
| Gap-2 | [descripción] | 🟡 UI | 50% | Ticket UI |

---

## 4. Firma de Validación

### 4.1 Checklist Usuario

**El usuario confirma que:**

- [ ] Todas las listas muestran la información completa
- [ ] Búsqueda multicampo funciona como esperado
- [ ] Filtros por columna funcionan
- [ ] Crear/editar tiene todos los campos
- [ ] Acciones de fila están presentes y funcionan
- [ ] No hay datos faltantes o incorrectos
- [ ] UI se ve correcta (sin errores visuales)
- [ ] Performance es aceptable (sin lentitudes)

**Feedback general:** [espacio para notas]

---

### 4.2 Sign-Off

**Usuario:** _________________ **Fecha:** _________

**Reportar Web 3 Auditor:** _________________ **Fecha:** _________

**Status:** 
- [ ] ✅ APROBADO — Módulo listo para producción
- [ ] 🟡 PARCIAL — Algunos gaps identificados, no bloquea
- [ ] 🔴 BLOQUEADOR — Requiere fixes antes de GO LIVE

---

## 5. Tickets de Implementación

**Crítico:** [TK-XX, TK-YY] → Implementar antes de siguiente módulo  
**Media:** [TK-ZZ, TK-AA] → Implementar en Phase 2  
**Baja:** [TK-BB, TK-CC] → Opcional, post-launch  

**Total esfuerzo:** [XXh] Crítico + [XXh] Media + [XXh] Baja

---

## 6. Roadmap Phase 2

**Campos para migrar:** [campo1 (X%), campo2 (Y%), ...]

**Esfuerzo estimado:** [Xh]

**Timeline:** [post-launch, Semana +X]

---

## Notas

[Espacio para notas finales, observaciones, o hallazgos especiales]

---

**Documento generado:** 2026-07-14  
**Plantilla v1.0** — Aprobada en retro Usuarios
