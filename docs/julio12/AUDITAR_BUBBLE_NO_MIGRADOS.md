---
name: auditar-bubble-registros-no-migrados
description: Auditoría en BUBBLE - Identificar registros NO migrados (año + tenant)
metadata: 
  node_type: memory
  created: 2026-07-12
  applies_to: v3.11 GAPs
  execution: Acceder a Bubble database directamente
  scope_rule: rule_migracion_tenants_scope.md
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# 🔍 AUDITORÍA BUBBLE: REGISTROS NO MIGRADOS

**Objetivo:** Revisar en Bubble qué registros **NO se migraron** a Supabase, determinar:
1. ¿De qué año?
2. ¿De qué tenant?
3. ¿Es necesario migrar?

**Decisión por Resultado:**
- ❌ **Otro tenant** (no CISE/GRÚAS) → No migrar (viola REGLA)
- 📅 **Año 2020 o anterior** → Negociar con cliente más tiempo
- ✅ **CISE/GRÚAS + año reciente** → Migrar en v3.11

---

## 📋 GAPS A AUDITAR EN BUBBLE

### GAP 1: PDFs Cotizaciones (40-50 archivos)

**En Bubble:**
```
Tabla: Cotizaciones
Campo: pdf_url (archivos en S3)

Buscar:
1. Todos los registros con pdf_url ≠ empty
2. Filtrar por created_at (agrupar por año)
3. Filtrar por tenant_name
```

**Pasos:**

1. **En Bubble** → Data → Cotizaciones
2. **Crear vista temporal** o buscar con filtros:
   ```
   Filter: pdf_url is not empty
   ```
3. **Agrupar/Revisar:**
   ```
   Columnas visibles:
   - _id (bubble_id)
   - numero
   - created_at → EXTRAER AÑO
   - tenant_name → REVISAR SI ES CISE/GRÚAS
   - pdf_url → CONFIRMAR QUE EXISTE
   ```

4. **Documentar en tabla:**
   ```
   Año | Tenant           | PDFs | Acción
   ----|------------------|------|-------
   2024| CISE del Perú    | 15   | ✅ MIGRAR (reciente + tenant OK)
   2024| GRÚAS del PACIFICO| 8   | ✅ MIGRAR
   2023| CISE del Perú    | 12   | ✅ MIGRAR
   2023| GRÚAS del PACIFICO| 5   | ✅ MIGRAR
   2022| CISE del Perú    | 3    | ⏳ REVISAR (reciente)
   2020| CISE del Perú    | 2    | ⏳ NEGOCIAR (año viejo)
   2024| Otro Tenant      | 5    | ❌ IGNORAR (no se migró)
   ```

5. **Contar total por decisión:**
   - MIGRAR: ___ PDFs
   - NEGOCIAR: ___ PDFs
   - IGNORAR: ___ PDFs

---

### GAP 2: tareas_recursos (Relaciones N:M)

**En Bubble:**
```
Tabla: Tareas
Campos: lista_maquinaria (ARRAY), lista_personal (ARRAY)

Buscar:
1. Todas las tareas con lista_maquinaria ≠ empty O lista_personal ≠ empty
2. Comparar contra Supabase (tabla tareas_recursos)
```

**Pasos:**

1. **En Bubble** → Data → Tareas
2. **Filtrar:**
   ```
   Filter: (lista_maquinaria is not empty) OR (lista_personal is not empty)
   ```
3. **Revisar por tenant:**
   ```
   Columnas:
   - _id
   - titulo
   - created_at → AÑO
   - tenant_name
   - lista_maquinaria (count items)
   - lista_personal (count items)
   ```

4. **Documentar:**
   ```
   Año | Tenant    | Tareas | Recursos | Acción
   ----|-----------|--------|----------|-------
   2024| CISE      | 45     | 340      | ✅ VALIDAR (reciente)
   2024| GRÚAS     | 32     | 210      | ✅ VALIDAR
   2023| CISE      | 38     | 290      | ✅ VALIDAR
   2020| CISE      | 5      | 30       | ⏳ NEGOCIAR
   2024| Otro      | 10     | 50       | ❌ IGNORAR
   ```

---

### GAP 3: progreso_porcentaje (400+ registros)

**En Bubble:**
```
Tabla: Tareas
Campo: progreso_porcentaje (NUMERIC)

Buscar:
1. Todas las tareas con progreso_porcentaje ≠ empty
```

**Pasos:**

1. **En Bubble** → Data → Tareas
2. **Filtrar:**
   ```
   Filter: progreso_porcentaje is not empty
   ```
3. **Revisar:**
   ```
   Columnas:
   - _id
   - titulo
   - created_at → AÑO
   - tenant_name
   - progreso_porcentaje (valor)
   ```

4. **Documentar:**
   ```
   Año | Tenant      | Registros | Valor Promedio | Acción
   ----|-------------|-----------|----------------|-------
   2024| CISE        | 150       | 65%            | ✅ MIGRAR
   2024| GRÚAS       | 85        | 70%            | ✅ MIGRAR
   2023| CISE        | 120       | 60%            | ✅ MIGRAR
   2023| GRÚAS       | 45        | 75%            | ✅ MIGRAR
   2020| CISE        | 10        | 50%            | ⏳ NEGOCIAR
   2024| Otro Tenant | 20        | --             | ❌ IGNORAR
   ```

---

### GAP 4: tarea_padre_id (50 subtareas)

**En Bubble:**
```
Tabla: Tareas
Campo: tarea_padre_id (self-reference)

Buscar:
1. Todas las tareas con tarea_padre_id ≠ empty
```

**Pasos:**

1. **En Bubble** → Data → Tareas
2. **Filtrar:**
   ```
   Filter: tarea_padre_id is not empty
   ```
3. **Revisar:**
   ```
   Columnas:
   - _id
   - titulo
   - created_at → AÑO
   - tenant_name
   - tarea_padre_id
   ```

4. **Documentar:**
   ```
   Año | Tenant      | Subtareas | Acción
   ----|-------------|-----------|-------
   2024| CISE        | 15        | ✅ MIGRAR
   2024| GRÚAS       | 10        | ✅ MIGRAR
   2023| CISE        | 18        | ✅ MIGRAR
   2020| CISE        | 5         | ⏳ NEGOCIAR
   2024| Otro Tenant | 2         | ❌ IGNORAR
   ```

---

### GAP 5: notas_internas en Cotizaciones (1200+ registros)

**En Bubble:**
```
Tabla: Cotizaciones
Campo: notas_internas (TEXT)

Buscar:
1. Todas las cotizaciones con notas_internas ≠ empty
```

**Pasos:**

1. **En Bubble** → Data → Cotizaciones
2. **Filtrar:**
   ```
   Filter: notas_internas is not empty
   ```
3. **Revisar:**
   ```
   Columnas:
   - _id
   - numero
   - created_at → AÑO
   - tenant_name
   - notas_internas (preview)
   ```

4. **Documentar:**
   ```
   Año | Tenant      | Registros | Acción
   ----|-------------|-----------|-------
   2024| CISE        | 450       | ✅ MIGRAR
   2024| GRÚAS       | 280       | ✅ MIGRAR
   2023| CISE        | 320       | ✅ MIGRAR
   2023| GRÚAS       | 150       | ✅ MIGRAR
   2020| CISE        | 50        | ⏳ NEGOCIAR
   2024| Otro Tenant | 100       | ❌ IGNORAR
   ```

---

## 📊 MATRIZ CONSOLIDADA (COMPLETAR DESPUÉS DE AUDITORÍA)

```
GAP 1: PDFs Cotizaciones
├─ MIGRAR (CISE/GRÚAS reciente): ___ archivos
├─ NEGOCIAR (años viejos): ___ archivos
└─ IGNORAR (otros tenants): ___ archivos

GAP 2: tareas_recursos
├─ MIGRAR: ___ tareas con recursos
├─ NEGOCIAR: ___ tareas
└─ IGNORAR: ___ tareas

GAP 3: progreso_porcentaje
├─ MIGRAR: ___ registros
├─ NEGOCIAR: ___ registros
└─ IGNORAR: ___ registros

GAP 4: tarea_padre_id
├─ MIGRAR: ___ subtareas
├─ NEGOCIAR: ___ subtareas
└─ IGNORAR: ___ subtareas

GAP 5: notas_internas
├─ MIGRAR: ___ registros
├─ NEGOCIAR: ___ registros
└─ IGNORAR: ___ registros

RESUMEN FINAL
├─ Total MIGRAR: ___ registros
├─ Total NEGOCIAR (años viejos): ___ registros
└─ Total IGNORAR (otros tenants): ___ registros
```

---

## 🎯 DECISIÓN POR RESULTADO

### Si encuentras registros de **2020 o anterior:**
```
Acción: DOCUMENTAR + NEGOCIAR CON CLIENTE

Mensaje sugerido:
"Encontramos X registros de [año] en la BD vieja de Bubble.
Estos no se migraron automáticamente porque son históricos.
¿Quieres que los incluyamos en v3.11? Esto agregaría Y horas más."
```

### Si encuentras registros de **otro tenant:**
```
Acción: IGNORAR COMPLETAMENTE

Razón: Según REGLA de scope, solo se migraron:
- CISE del Perú SAC
- GRÚAS del PACIFICO SAC

Otros tenants: No tocar.
```

### Si encuentras registros **recientes de CISE/GRÚAS:**
```
Acción: INCLUIR EN v3.11

Agregar a tickets correspondientes con cantidad exacta.
```

---

## 📝 DOCUMENTO FINAL PARA GOOGLE DOCS

Cuando termines auditoría, copiar este template:

```markdown
# AUDITORÍA BUBBLE v3.11 — REGISTROS NO MIGRADOS

**Fecha:** [hoy]
**Auditor:** [tu nombre]

## Resultados por GAP

### GAP 1: PDFs Cotizaciones
- **Para MIGRAR:** 40 PDFs (CISE 2024-2023, GRÚAS 2024)
- **Para NEGOCIAR:** 5 PDFs (CISE 2020-2021)
- **Para IGNORAR:** 3 PDFs (Otro tenant)
- **Acción:** Proceder con 40 PDFs en v3.11

### GAP 2: tareas_recursos
- **Para MIGRAR:** 240 tareas con recursos (95% OK)
- **Para NEGOCIAR:** 8 tareas (2020, baja frecuencia)
- **Para IGNORAR:** 2 tareas (otro tenant)
- **Acción:** Validar completitud de 240

### GAP 3: progreso_porcentaje
- **Para MIGRAR:** 380 registros (2024-2023)
- **Para NEGOCIAR:** 20 registros (2020)
- **Para IGNORAR:** 0 registros
- **Acción:** Proceder

### GAP 4: tarea_padre_id
- **Para MIGRAR:** 45 subtareas
- **Para NEGOCIAR:** 5 subtareas (2020)
- **Para IGNORAR:** 0 subtareas
- **Acción:** Proceder

### GAP 5: notas_internas
- **Para MIGRAR:** 1180 registros
- **Para NEGOCIAR:** 20 registros (2020)
- **Para IGNORAR:** 0 registros
- **Acción:** Proceder

## Resumen Decisión

| Gap | MIGRAR | NEGOCIAR | IGNORAR | Acción |
|-----|--------|----------|---------|--------|
| PDFs | 40 | 5 | 3 | ✅ GO |
| tareas_recursos | 240 | 8 | 2 | ✅ GO |
| progreso | 380 | 20 | 0 | ✅ GO |
| tarea_padre | 45 | 5 | 0 | ✅ GO |
| notas | 1180 | 20 | 0 | ✅ GO |

## Próximo Paso

✅ Proceder con v3.11 tickets
⏳ Contactar cliente: "¿Incluimos X registros de 2020?"
```

---

**Última actualización:** 2026-07-12  
**Status:** ✅ GUÍA LISTA PARA EJECUTAR EN BUBBLE
