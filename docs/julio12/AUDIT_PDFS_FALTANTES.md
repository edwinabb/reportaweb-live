---
name: audit-pdfs-faltantes
description: Auditoría específica - Año + Tenant de PDFs faltantes
metadata: 
  node_type: memory
  type: project
  priority: CRITICAL
  created: 2026-07-12
  depends_on: rule_migracion_tenants_scope.md
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# 🔍 AUDITORÍA: PDFs FALTANTES (Año + Tenant)

**Objetivo:** Determinar exactamente:
1. ¿De qué años son los PDFs faltantes?
2. ¿De qué tenants?

**Importante:** Aplicar REGLA: Solo contar CISE + GRUAS

---

## 📋 PASOS PARA AUDITAR

### PASO 1: Acceder a Bubble

1. Ir a **Bubble → Data → Cotizaciones**
2. Crear una nueva **Query/View** temporal

### PASO 2: Filtrar por Tenants válidos

```
Filter:
  tenant_name = "CISE del Perú SAC" OR tenant_name = "GRUAS del PACIFICO SAC"
```

### PASO 3: Identificar PDFs faltantes

```
Filter (adicional):
  pdf_url ≠ empty
```

### PASO 4: Agrupar por AÑO

Crear columna calculada o pivot por:
```
EXTRACT(YEAR FROM fecha_emision)
```

Resultado esperado:
```
AÑO      | CANTIDAD | TENANT
---------|----------|------------------
2024     | 15       | CISE del Perú SAC
2024     | 8        | GRUAS del PACIFICO
2023     | 12       | CISE del Perú SAC
2023     | 5        | GRUAS del PACIFICO
2022     | 3        | CISE del Perú SAC
---------|----------|------------------
TOTAL    | 43       |
```

---

## 🔍 ALTERNATIVA: USAR BUBBLE CONSOLE

Si Bubble tiene API accesible, ejecutar:

```javascript
// En Bubble Console o script
const cotizaciones = await fetch('/data/Cotizaciones', {
  params: {
    constraints: [
      { key: 'tenant_name', value: 'CISE del Perú SAC' },
      { key: 'pdf_url', operator: '≠', value: 'empty' }
    ]
  }
});

const byYear = {};
cotizaciones.forEach(c => {
  const year = new Date(c.fecha_emision).getFullYear();
  if (!byYear[year]) byYear[year] = 0;
  byYear[year]++;
});

console.table(byYear);  // Ver resultados
```

---

## 📊 CHECKLIST DE AUDITORÍA

Cuando termines de auditar, completa esto:

```
CISE del Perú SAC
├─ 2024: ___ PDFs
├─ 2023: ___ PDFs
├─ 2022: ___ PDFs
├─ 2021: ___ PDFs
└─ 2020: ___ PDFs

GRUAS del PACIFICO SAC
├─ 2024: ___ PDFs
├─ 2023: ___ PDFs
├─ 2022: ___ PDFs
├─ 2021: ___ PDFs
└─ 2020: ___ PDFs

TOTAL PDFs A MIGRAR: ___

OTROS TENANTS ENCONTRADOS: 
├─ Nombre: ___
├─ PDFs: ___
└─ Acción: [ESCALATE A CTO]
```

---

## ✅ RESULTADO ESPERADO

Una vez hagas auditoría, documento debe decir:

```
RESULTADO DE AUDITORÍA v3.11-001

PDFs Faltantes por Año/Tenant:
- CISE 2024: 15 archivos
- CISE 2023: 12 archivos
- GRUAS 2024: 8 archivos
- GRUAS 2023: 5 archivos
- CISE 2022: 3 archivos

TOTAL: 43 PDFs para migrar
TAMAÑO ESTIMADO: ~500MB
TIEMPO ESTIMADO: 6 horas (descarga + upload)

Otros tenants encontrados: NINGUNO ✅
```

---

## 🚨 SI ENCUENTRAS OTROS TENANTS

**Decisión:**
1. Documentar cuáles son
2. Crear issue separado: "PDFs de [otro tenant] - ¿incluir?"
3. NO los incluyas en REP-3.11-001
4. Escalar a CTO para decisión

---

## 📌 CÓMO GUARDAR RESULTADO

Cuando termines auditoría:

1. Copia el checklist completo (arriba)
2. Pégalo en el ticket **REP-3.11-001** (sección "Auditoría Results")
3. Inicia migración con números reales

---

**Creado:** 2026-07-12  
**Urgencia:** ALTA (bloquea REP-3.11-001)  
**Acción:** Ejecutar auditoría hoy si es posible
