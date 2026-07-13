# Inconsistencias de Migración Bubble → Supabase
**Generado:** 2026-05-23 | **Tenants auditados:** CISE · GRUAS DEL PACÍFICO  
**Estado:** Pendiente revisión uno a uno

---

## Cómo usar este documento

Cada inconsistencia tiene:
- **ID** único para referencias
- **Nivel**: 🔴 Crítico · 🟡 Alto · 🟠 Medio · 🟢 Bajo
- **Decisión**: columna para que el revisor anote ACEPTAR / CORREGIR / INVESTIGAR
- **Afectados**: conteo real de registros impactados

---

## 🔴 CRÍTICO — Afectan funcionalidad del sistema

---

### INC-001 · `facturas_compra` — PDF en columna incorrecta
| Campo | Valor |
|-------|-------|
| **Tabla** | `facturas_compra` |
| **Columna script** | `pdf_factura` (Bubble URL original) |
| **Columna web app** | `pdf_factura_url` (URL Supabase Storage) |
| **Problema** | El script de migración escribe el PDF en `pdf_factura` (texto libre, URL de Bubble). La web app lee de `pdf_factura_url`. Resultado: 0% de PDFs visibles en la UI para facturas de compra históricas. |
| **Afectados** | CISE: 74 facturas · GRUAS: 1,287 facturas = **1,361 total** |
| **Script causante** | `migrate-finance-tables.ts` |
| **Corrección sugerida** | Al ejecutar `migrate-finance-files.ts`, asegurar que el resultado se escriba en `pdf_factura_url`. Luego verificar si `pdf_factura` tiene URLs de Bubble que se puedan migrar. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-002 · `reportes_maquinaria` — `valorizacion_compra` y `valorizacion_venta` son Bubble IDs
| Campo | Valor |
|-------|-------|
| **Tabla** | `reportes_maquinaria` |
| **Columnas** | `valorizacion_compra` (TEXT), `valorizacion_venta` (TEXT) |
| **Problema** | Almacenan Bubble IDs como texto (ej: `1705956236024x111563751262257150`). No hay FK real a la tabla `valorizaciones` de Supabase. Si el web app intenta filtrar o unir reportes por valorización, no funcionará. |
| **Afectados** | GRUAS: 8,465 con val_compra · 15,462 con val_venta. CISE: 269 · 4,376 |
| **Muestra** | `1705956236024x111563751262257150` (Bubble ID, no UUID) |
| **Script causante** | `migrate-maquinaria-reports-data.ts` |
| **Corrección sugerida** | Resolver Bubble ID → UUID de `valorizaciones` via `bubble_id` column. Crear patch script. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-003 · `cotizaciones_detalle` — `tarea_id` al 100% NULL
| Campo | Valor |
|-------|-------|
| **Tabla** | `cotizaciones_detalle` |
| **Columna** | `tarea_id` |
| **Problema** | El 100% de los ítems de cotización no tiene tarea vinculada. La relación cotización↔tarea existe en `cotizaciones.tarea_id` pero no se propagó a los ítems. La web app puede depender de este vínculo para mostrar el ítem en el contexto de la tarea. |
| **Afectados** | CISE: 3,484 · GRUAS: 703 = **4,187 registros** |
| **Script causante** | No existe script para este vínculo |
| **Corrección sugerida** | SQL patch (ver Plan de Ejecución Fase 4): `UPDATE cotizaciones_detalle SET tarea_id = c.tarea_id FROM cotizaciones c WHERE c.id = cotizacion_id AND tarea_id IS NULL` |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

## 🟡 ALTO — Datos faltantes visibles en UI

---

### INC-004 · `tareas` — `cliente_nombre` y `sitio` al 100% NULL
| Campo | Valor |
|-------|-------|
| **Tabla** | `tareas` |
| **Columnas** | `cliente_nombre` (TEXT), `sitio` (TEXT) |
| **Problema** | Campos desnormalizados para display rápido (sin JOIN) que el script seteó intencionalmente a NULL. Si la UI los usa para listar tareas sin hacer JOIN a `terceros`/`terceros_sitios`, todas las tareas históricas aparecerán sin cliente ni sitio. |
| **Afectados** | CISE: 4,937 · GRUAS: 9,454 = **14,391 tareas** (100%) |
| **Script causante** | `migrate-tareas-mig5.ts` (línea: `cliente_nombre: null, sitio: null`) |
| **Corrección sugerida** | Patch SQL que pueble `cliente_nombre` desde `terceros.razon_social` via `cliente_id`, y `sitio` desde `terceros_sitios.nombre` via `sitio_id`. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-005 · `facturas_venta` — `editor_id` al 100% NULL
| Campo | Valor |
|-------|-------|
| **Tabla** | `facturas_venta` |
| **Columna** | `editor_id` (TEXT) |
| **Problema** | Script intentó mapear `editor_id` pero ningún registro tiene valor. Puede ser que el campo Bubble no existía en todos los registros, o el mapeo falló silenciosamente. |
| **Afectados** | CISE: 1,330 · GRUAS: 1,559 = **2,889 facturas** (100%) |
| **Script causante** | `migrate-finance-tables.ts` |
| **Corrección sugerida** | Verificar si `editor_id` es necesario para la web app. Si sí, re-mapear desde `Created By` o `id_editor` de Bubble. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-006 · `cotizaciones` GRUAS — 249 cotizaciones activas sin PDF
| Campo | Valor |
|-------|-------|
| **Tabla** | `cotizaciones` |
| **Columna** | `pdf_url` |
| **Problema** | GRUAS tiene 249 cotizaciones en estado activo (no BORRADOR/ANULADA) sin PDF. Script `migrate-cotizaciones-bubble.ts` no descargó los PDFs de GRUAS (solo 7/269 tienen PDF). |
| **Afectados** | GRUAS: 249 activas sin PDF · CISE: 75 activas sin PDF |
| **Desglose por año** | GRUAS 2023: 66 · 2024: 84 · 2025: 81 · 2026: 31 |
| **Corrección sugerida** | Re-ejecutar `migrate-cotizaciones-bubble.ts` (es idempotente). |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-007 · `maquinarias` — fotos al ~90% faltantes
| Campo | Valor |
|-------|-------|
| **Tabla** | `maquinarias` |
| **Columna** | `foto_url` |
| **Problema** | La gran mayoría de equipos no tiene foto migrada a Supabase Storage. |
| **Afectados** | CISE: 113/127 sin foto (89%) · GRUAS: 139/140 sin foto (99%) |
| **Corrección sugerida** | Re-ejecutar `migrate-maquinaria-files.ts`. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-008 · `terceros` — `logo_url` al 100% faltante
| Campo | Valor |
|-------|-------|
| **Tabla** | `terceros` |
| **Columna** | `logo_url` |
| **Problema** | Cero logos migrados para ningún cliente/proveedor en ambos tenants. El script `migrate-terceros-bubble.ts` incluye la lógica de subida pero no produjo resultados. |
| **Afectados** | CISE: 388 terceros · GRUAS: 226 terceros = **614 total** (100%) |
| **Corrección sugerida** | Re-ejecutar `migrate-terceros-bubble.ts` y verificar la sección de logo upload. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

## 🟠 MEDIO — Datos incompletos, impacto funcional parcial

---

### INC-009 · `reportes_maquinaria` — `cotizacion_compra_item_id` al 100% NULL
| Campo | Valor |
|-------|-------|
| **Tabla** | `reportes_maquinaria` |
| **Columna** | `cotizacion_compra_item_id` |
| **Problema** | Campo nuevo en Supabase sin equivalente directo en Bubble. El 100% de registros tiene NULL. Puede afectar el flujo de valorización de compras desde la app. |
| **Afectados** | CISE: 5,747 · GRUAS: 18,194 = **23,941** (100%) |
| **Corrección sugerida** | Determinar si este campo es necesario para registros históricos o solo aplica a registros nuevos creados desde la app. Si aplica a históricos, crear lógica de resolución via `cotizacion_item_id` de la tarea vinculada. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-010 · `cotizaciones` — `moneda` defaultea a 'USD' (98.5% CISE, 85% GRUAS)
| Campo | Valor |
|-------|-------|
| **Tabla** | `cotizaciones` |
| **Columna** | `moneda` |
| **Problema** | Script usa `'USD'` como default cuando el campo de Bubble no mapea correctamente. CISE tiene 2,327 USD vs 36 PEN. Para empresa peruana esto es inusual, pero puede ser correcto si facturan en dólares. |
| **Afectados** | CISE: 2,327 USD / 36 PEN · GRUAS: 228 USD / 41 PEN |
| **Nota** | Las 41 cotizaciones PEN de GRUAS tienen 0 PDFs (probablemente borradores/sin uso). |
| **Corrección sugerida** | Verificar en Bubble la distribución real de monedas para confirmar si el 98% USD es correcto. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-011 · `reportes_usuario` CISE — `item_cotizacion_id` al 43% NULL
| Campo | Valor |
|-------|-------|
| **Tabla** | `reportes_usuario` |
| **Columna** | `item_cotizacion_id` |
| **Problema** | CISE tiene 5,169/12,050 registros sin vínculo a ítem de cotización. GRUAS está bien (143/14,707 = 1%). Puede ser que CISE históricamente creaba reportes sin cotización, o que el mapeo falló para ciertos años. |
| **Afectados** | CISE: 5,169 (43%) · GRUAS: 143 (1%) |
| **Desglose CISE** | 2022: 628/1201 · 2023: 1,288/2,984 · 2024: 1,270/3,285 · 2025: 1,442/3,398 · 2026: 541/1,182 |
| **Corrección sugerida** | Verificar en Bubble si esos reportes de CISE realmente no tenían cotización, o si el campo `id_item_cotizacion` estaba vacío en Bubble. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-012 · `reportes_maquinaria` — `maquinaria_id` y `operador_id` con ~5% NULL
| Campo | Valor |
|-------|-------|
| **Tabla** | `reportes_maquinaria` |
| **Columnas** | `maquinaria_id`, `operador_id` |
| **Problema** | Registros donde la maquinaria u operador fue borrado en Bubble antes de la migración. El FK no pudo resolverse y quedó NULL. |
| **Afectados** | CISE: 364 sin maquinaria · 493 sin operador. GRUAS: 827 sin maquinaria · 831 sin operador |
| **Desglose por año** | Ver auditoría principal — distribuidos uniformemente 2022–2026, no concentrados en un año |
| **Corrección sugerida** | Ejecutar `fix-reports-v2.ts` para re-intentar resolución con datos frescos de Bubble. Los que sigan NULL después son irrecuperables (maquinaria/operador borrado). |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-013 · `reportes_usuario` — PDFs 2026 al 100% faltantes, 2025 al 22–44%
| Campo | Valor |
|-------|-------|
| **Tabla** | `reportes_usuario` |
| **Columna** | `pdf_url` |
| **Problema** | El script `migrate-user-reports-files.ts` no alcanzó los registros de 2026 en corridas anteriores. Actualmente en ejecución (21,300+ procesados). |
| **Afectados** | 2026: CISE 1,182 + GRUAS 3,407 = 4,589 sin PDF. 2025: CISE 731 + GRUAS 2,194 = 2,925 sin PDF |
| **Estado** | Script corriendo HOY (2026-05-23). Verificar al terminar. |
| **Corrección sugerida** | Esperar a que termine el run actual. Si sigue habiendo faltantes, re-ejecutar. |
| **Decisión** | ⬜ PENDIENTE RUN ACTUAL |

---

### INC-014 · `facturas_venta` — `lista_items` almacena Bubble IDs como TEXT[]
| Campo | Valor |
|-------|-------|
| **Tabla** | `facturas_venta` |
| **Columna** | `lista_items` (TEXT[]) |
| **Problema** | Array de Bubble IDs de ítems de factura. No vincula a ninguna tabla de Supabase. Si la web app intenta resolver los ítems de una factura de venta histórica, no encontrará nada. |
| **Afectados** | CISE: 1,330 · GRUAS: 1,559 facturas (todas con lista_items probable) |
| **Corrección sugerida** | Determinar si existe tabla `facturas_venta_items` en Supabase y si los ítems fueron migrados por separado. Si existe, crear patch de resolución. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

## 🟢 BAJO — Decisiones de negocio / impacto cosmético

---

### INC-015 · `tareas` — `prioridad` al 100% 'MEDIA'
| Campo | Valor |
|-------|-------|
| **Tabla** | `tareas` |
| **Columna** | `prioridad` |
| **Problema** | Bubble no tenía campo de prioridad. El script asignó 'MEDIA' como constante a todos los registros. |
| **Afectados** | CISE: 4,937 · GRUAS: 9,454 = 14,391 tareas |
| **Decisión** | ⬜ ACEPTAR (comportamiento esperado) / CORREGIR |

---

### INC-016 · `maquinaria_tipos_docs` — `es_obligatorio` al 100% `false`
| Campo | Valor |
|-------|-------|
| **Tabla** | `maquinaria_tipos_docs` |
| **Columna** | `es_obligatorio` |
| **Problema** | Bubble no tenía este campo. Script usó `false` como constante. Puede afectar alertas de vencimiento de documentos. |
| **Afectados** | CISE: 14 tipos · GRUAS: 16 tipos |
| **Decisión** | ⬜ ACEPTAR / CORREGIR MANUALMENTE |

---

### INC-017 · `reportes_maquinaria` — `factura_venta_item_id_bubble` con Bubble ID
| Campo | Valor |
|-------|-------|
| **Tabla** | `reportes_maquinaria` |
| **Columna** | `factura_venta_item_id_bubble` (TEXT) |
| **Problema** | Campo de backup que almacena el Bubble ID del ítem de factura. Diseñado intencionalmente como campo de trazabilidad, no como FK real. Solo relevante si se necesita auditoría histórica. |
| **Afectados** | Todos los reportes con factura asociada en Bubble |
| **Decisión** | ⬜ ACEPTAR (es campo de trazabilidad por diseño) |

---

### INC-018 · `profiles` CISE — 4 perfiles sin `bubble_id`
| Campo | Valor |
|-------|-------|
| **Tabla** | `profiles` |
| **Columna** | `bubble_id` |
| **Problema** | 4 perfiles de CISE (de 103 total) no tienen `bubble_id`. Probablemente son cuentas creadas directamente en Supabase después de la migración (ej: admin del sistema). |
| **Afectados** | CISE: 4 perfiles |
| **Decisión** | ⬜ ACEPTAR (cuentas nuevas) / INVESTIGAR |

---

## 🔴 CRÍTICO — Hallazgos auditoría completa (148 tablas)

---

### INC-019 · `reportes_usuario.tenant_id` — tipo TEXT en lugar de UUID
| Campo | Valor |
|-------|-------|
| **Tabla** | `reportes_usuario` |
| **Columna** | `tenant_id` |
| **Problema** | Única tabla del sistema donde `tenant_id` es tipo TEXT en lugar de UUID. Todas las demás tablas usan UUID. Causa: script de migración mapeó el tenant_id como string de Bubble. Puede romper JOINs, RLS policies y comparaciones directas con otras tablas. |
| **Afectados** | CISE: 12,050 · GRUAS: 14,707 = **26,757 registros** |
| **Script causante** | `migrate-user-reports-data.ts` |
| **Corrección sugerida** | Verificar si RLS funciona correctamente. Si tenant_id contiene UUIDs válidos en texto, hacer `ALTER TABLE reportes_usuario ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid`. Hacer dry-run primero. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-020 · `formatos_informes` — 26 registros CISE con `bubble_id` NULL
| Campo | Valor |
|-------|-------|
| **Tabla** | `formatos_informes` |
| **Columna** | `bubble_id` |
| **Problema** | Los 26 registros de CISE tienen bubble_id NULL (100%). GRUAS tiene 0 registros. No se puede reconciliar con Bubble ni detectar duplicados en re-migración. |
| **Afectados** | CISE: 26/26 (100%) sin bubble_id |
| **Corrección sugerida** | Verificar si estos registros fueron creados manualmente en Supabase o si el script de migración de formatos no los capturó. Si son de Bubble, re-ejecutar la migración de formatos. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-021 · `areas` — 57% de registros sin `bubble_id`
| Campo | Valor |
|-------|-------|
| **Tabla** | `areas` |
| **Columna** | `bubble_id` |
| **Problema** | 25 de 44 registros (57%) no tienen bubble_id. Sin este campo no es posible hacer upsert idempotente ni detectar duplicados. |
| **Afectados** | 25/44 registros (CISE: 9, GRUAS: 8) |
| **Corrección sugerida** | Identificar si existe script de migración para `areas`. Si fue migración manual, aceptar. Si fue script, revisar el código de inserción. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

### INC-022 · `document_types` — solo GRUAS tiene datos (CISE = 0)
| Campo | Valor |
|-------|-------|
| **Tabla** | `document_types` |
| **Problema** | GRUAS tiene 11 registros, CISE tiene 0. Si la tabla es compartida entre tenants con RLS, puede ser correcto. Si es por tenant, CISE no tiene tipos de documento migrados. |
| **Afectados** | CISE: 0 registros |
| **Corrección sugerida** | Verificar si `document_types` es una tabla global (sin tenant_id) o por tenant. Si es global, verificar si CISE usaba esta tabla en Bubble. |
| **Decisión** | ⬜ ACEPTAR / CORREGIR / INVESTIGAR |

---

## 🟢 BAJO — Tablas vacías (app móvil y features nuevas)

---

### INC-023 · Tablas `app_*` y operacionales — completamente vacías
| Campo | Valor |
|-------|-------|
| **Tablas** | `app_allowances`, `app_asistencias`, `app_combustible`, `app_eventos_clima`, `app_eventos_operacionales`, `app_kpi_snapshots`, `app_mantenimiento_np`, `app_paradas` |
| **Problema** | Tablas de la app móvil nueva que nunca tuvieron datos en Bubble (son features nuevas). Están vacías por diseño. |
| **Afectados** | 0 registros en todas |
| **Decisión** | ⬜ ACEPTAR (tablas nuevas, se poblarán desde la app) |

---

### INC-024 · `cobros_venta`, `bancos`, `bitacora_operaciones`, `branches`, `catalogos` — vacías
| Campo | Valor |
|-------|-------|
| **Tablas** | `cobros_venta`, `bancos`, `bitacora_operaciones`, `branches`, `catalogos` |
| **Problema** | Tablas que podrían tener datos históricos de Bubble pero están vacías. Verificar si existían en Bubble o son features nuevas. |
| **Afectados** | 0 registros |
| **Corrección sugerida** | Revisar en Bubble si `cobros_venta` y `bancos` tienen datos. Si los tienen, identificar el script de migración correspondiente. |
| **Decisión** | ⬜ ACEPTAR / INVESTIGAR |

---

## Resumen ejecutivo

| Nivel | Cantidad | Registros afectados | Acción prioritaria |
|-------|:--------:|--------------------:|-------------------|
| 🔴 Crítico | 5 | ~56,000 | INC-001: fix columna PDF facturas · INC-002: resolver val_bubble_ids · INC-003: patch tarea_id · INC-019: tenant_id tipo TEXT · INC-020: formatos_informes bubble_id null |
| 🟡 Alto | 5 | ~18,000 | Re-ejecutar scripts de archivos (INC-006, 007, 008) · Patch cliente_nombre (INC-004) |
| 🟠 Medio | 6 | ~35,000 | Mayormente aceptables como históricos (verificar INC-010 moneda) |
| 🟢 Bajo | 8 | ~14,400 | INC-021/022/023/024: tablas nuevas o sin impacto funcional |

---

## Registro de decisiones

| ID | Fecha | Decisión | Responsable | Notas |
|----|-------|----------|-------------|-------|
| INC-001 | | | | |
| INC-002 | | | | |
| INC-003 | | | | |
| INC-004 | | | | |
| INC-005 | | | | |
| INC-006 | | | | |
| INC-007 | | | | |
| INC-008 | | | | |
| INC-009 | | | | |
| INC-010 | | | | |
| INC-011 | | | | |
| INC-012 | | | | |
| INC-013 | | | | |
| INC-014 | | | | |
| INC-015 | | | | |
| INC-016 | | | | |
| INC-017 | | | | |
| INC-018 | | | | |
| INC-019 | | | | |
| INC-020 | | | | |
| INC-021 | | | | |
| INC-022 | | | | |
| INC-023 | | | | |
| INC-024 | | | | |
