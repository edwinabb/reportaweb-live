---
name: how-to-use-validation-exhaustiva
description: Guía rápida para usar GOAL_VALIDATION_EXHAUSTIVA.md
metadata: 
  node_type: memory
  type: project
  status: guide
  created: 2026-07-12
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# Guía Rápida — Cómo Usar GOAL_VALIDATION_EXHAUSTIVA.md

**¿Qué es?** Un GOAL prompt completo para análisis exhaustivo de BD (Backend vs UI vs Supabase vs Bubble).

**¿Para qué sirve?** Identificar campos faltantes, FKs rotas, datos no migradores, archivos pendientes.

**¿Cuánto toma?** 3-4 horas de análisis profundo (o más si quieres más detalle).

---

## 3 Formas de Usarlo

### OPCIÓN 1: Usar Ahora (Recomendado si tienes tiempo)

1. Abre `GOAL_VALIDATION_EXHAUSTIVA.md`
2. Copia TODO el contenido entre `---INICIO---` y `---FIN---`
3. Pega en nuevo prompt de Claude
4. Decime: "¿Tienes acceso a Bubble?" (confirmar antes de empezar)
5. Espera 3-4 horas mientras analizo

**Resultado:** 5 archivos .md con análisis completo

---

### OPCIÓN 2: Hacerlo en Dos Sesiones

**Sesión 1 (1.5-2h):** Backend + UI deps
```
Pega solo esta parte del prompt:

"FRENTE 1: Backend → Base de Datos"
+ 
"FRENTE 2: UI → Base de Datos"

Produce: BACKEND_DEPS.md + UI_DEPS.md
```

**Sesión 2 (1.5-2h):** Schema + Bubble
```
Pesa solo esta parte:

"FRENTE 3: Supabase → Bubble"
+
"FRENTE 4: Archivos en Supabase Storage vs Bubble"

Produce: SCHEMA_VALIDATION.md + BUBBLE_COMPARISON.md + GAPS_AND_ACTIONS.md
```

---

### OPCIÓN 3: Solo lo Crítico (45-60 min)

Si no tienes mucho tiempo, pide:

```
"Quiero saber SOLO los gaps críticos:

1. Backend usa campos que NO existen en BD (FRENTE 1)
2. UI espera campos que NO existen en BD (FRENTE 2)
3. FKs rotas que rompen el backend (FRENTE 3)

Ignora: análisis de Bubble, archivos en storage, campos opcionales.

Produce: GAPS_CRÍTICOS.md (1 solo archivo)"
```

**Resultado:** 1 archivo con solo GAPS CRÍTICOS (30 min max)

---

## Qué Esperar Como Resultado

El prompt te produce **5 archivos .md:**

1. **BACKEND_DEPS.md** (1000-1500 líneas)
   - Qué usa el backend de cada tabla
   - Por cada server action: qué campos
   - Status: ✅ OK o ❌ FALTANTE

2. **UI_DEPS.md** (800-1200 líneas)
   - Qué muestra la UI de cada tabla
   - Por cada página: qué campos espera
   - Status: ✅ OK o ❌ FALTANTE

3. **SCHEMA_VALIDATION.md** (1000-1500 líneas)
   - Estado actual de cada tabla en Supabase
   - Rowcount, constraints, FKs verificados
   - Status: ✅ Válido o ❌ Problema

4. **BUBBLE_COMPARISON.md** (800-1200 líneas)
   - Comparación tabla a tabla
   - Campos que faltan
   - Datos no migrados
   - Status: ✅ Completo o ⏳ Parcial

5. **GAPS_AND_ACTIONS.md** (500-1000 líneas)
   - Resumen de TODOS los gaps
   - Prioridad: ALTA/MEDIA/BAJA
   - Acción: Agregar campo / Crear FK / Migrar archivo / etc.

**Total:** ~5000-7000 líneas de análisis detallado

---

## Decisiones Previas (IMPORTANTE)

Antes de lanzar el prompt, **responde:**

### 1. ¿Tienes acceso a Bubble?

**Si SÍ:**
- ¿Puedes exportar schema (lista de tablas + campos)?
- ¿Puedes exportar datos (CSV de todas las tablas)?
- El análisis será COMPLETO (comparación exacta)

**Si NO:**
- El análisis de Bubble será limitado (solo lo que conozcas)
- Igual se crearán BACKEND_DEPS + UI_DEPS + SCHEMA_VALIDATION

### 2. ¿Incluyo análisis de archivos en Storage?

**SÍ (default):**
- Analiza qué PDFs, fotos, firmas están en Supabase
- Compara con lo que debería haber de Bubble
- Recomendación: Migrar o aceptar pérdida

**NO:**
- Salta FRENTE 4
- Reduce tiempo a 2-3 horas

### 3. ¿Quiero nivel de detalle: ALTO, MEDIO, BAJO?

**ALTO (4h):** Analiza TODOS los campos de TODOS los archivos
**MEDIO (3h):** Análiza campos críticos + FKs importantes
**BAJO (1.5h):** Solo gaps que rompan backend/UI

---

## Cómo Interpretar Resultados

### Después de recibir los 5 archivos:

1. **Abre GAPS_AND_ACTIONS.md** primero (es el resumen)
2. Lee GAPS por prioridad:
   ```
   ## ALTA (Rompe el sistema) — Hacer INMEDIATO
   ❌ Campo faltante: cotizaciones.precio_negociado
   
   ## MEDIA (Degrada UX) — Hacer HOY
   ⚠️  FK rota: tareas.cotizacion_item
   
   ## BAJA (Nice to have) — Hacer después
   ℹ️  Campo ausente: terceros.notas_internas
   ```

3. Por cada gap ALTA/MEDIA:
   - Revisar el archivo de source (BACKEND_DEPS, UI_DEPS, etc.)
   - Entender por qué es importante
   - Ejecutar el fix (SQL script)
   - Re-validar

4. Gaps BAJA:
   - Documentar pero no fijar (a menos que el usuario lo pida)

---

## Flujo de Trabajo Recomendado

```
1. Ejecutar GOAL_VALIDATION_EXHAUSTIVA.md (3-4h)
   ↓
2. Leer GAPS_AND_ACTIONS.md (15 min)
   ↓
3. Priorizar gaps:
   - ALTA: Fijar ahora (SQL scripts)
   - MEDIA: Fijar hoy (después de ALTA)
   - BAJA: Documentar (posible deuda técnica)
   ↓
4. Ejecutar fixes (por prioridad)
   ↓
5. Re-validar con VALIDATION_QUICK_START.md (1h)
   ↓
6. Si todo ✅: CUTOVER
```

**Total:** ~6-7 horas para análisis + fixes + validación

---

## Ejemplos de Gaps Esperados

### Gap típico 1: Campo agregado recientemente

```
BACKEND_DEPS.md dice:
- cotizaciones.precio_negociado ← usado por createCotizacion()

SCHEMA_VALIDATION.md dice:
- cotizaciones.precio_negociado ✅ EXISTS (agregado 2026-05-24)

Status: ✅ NO es gap
```

### Gap típico 2: FK faltante

```
BACKEND_DEPS.md dice:
- tareas_recursos FK maquinaria_id → maquinaria.id ← requerida

SCHEMA_VALIDATION.md dice:
- tareas_recursos.maquinaria_id → ❌ SIN FK

Status: ❌ GAP CRÍTICO — Crear FK
Acción: ALTER TABLE tareas_recursos ADD FOREIGN KEY (maquinaria_id) REFERENCES maquinaria(id);
```

### Gap típico 3: Campo de Bubble no migrado

```
BUBBLE_COMPARISON.md dice:
- Bubble.cotizaciones.notas_internas (1200 registros tienen datos)
- Supabase.cotizaciones.notas_internas ❌ NO EXISTE

Status: ⚠️  GAP MEDIA — Decidir si migrar
Prioridad: BAJA (UI no lo muestra)
Acción: Ignorar para ahora (documentar en ROADMAP)
```

---

## Duda Común: "¿Qué hago si no completa en 3-4h?"

Si el análisis es más largo:
- Puede ser porque Bubble es muy diferente
- O porque hay muchos gaps
- O porque quiero más detalle

**Solución:** Hacer en 2-3 sesiones cortas en lugar de una larga

```
Sesión 1: FRENTE 1 + FRENTE 2 (Backend + UI)
Sesión 2: FRENTE 3 (Schema actual)
Sesión 3: FRENTE 4 + RESUMEN (Bubble + Gaps)
```

---

## Resumen Rápido

| Aspecto | Detalle |
|---------|---------|
| **Qué es** | GOAL prompt para análisis exhaustivo BD |
| **Cuánto toma** | 3-4 horas (puede ser menos si haces solo crítico) |
| **Resultado** | 5 archivos .md con análisis completo + gaps priorizados |
| **Debo hacer todo** | NO, puedes hacer en 2-3 sesiones |
| **Necesito Bubble** | Ayuda pero NO es requerido |
| **Después de esto** | Tendrás lista clara de qué fijar + prioridad |

---

## Próximo Paso

**¿Quieres que lance GOAL_VALIDATION_EXHAUSTIVA.md ahora?**

Si SÍ:
```
1. Confirma: ¿Tienes acceso a Bubble?
2. Decime: ¿Análisis completo (4h) o solo crítico (1.5h)?
3. Yo empiezo el análisis
```

Si NO:
```
1. Haz primero VALIDATION_QUICK_START.md (30-60 min)
2. Confirma que todo ✅ verde
3. Luego lanzo GOAL_VALIDATION_EXHAUSTIVA.md
```

**¿Qué prefieres?** 🎯

---

**Creado:** 2026-07-12  
**Referencia:** GOAL_VALIDATION_EXHAUSTIVA.md (archivo maestro)
