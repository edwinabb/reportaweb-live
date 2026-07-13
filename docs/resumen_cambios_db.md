# Resumen de Cambios en la Base de Datos (Local vs Nube)

Este documento resume las modificaciones realizadas en el esquema local que deben ser aplicadas al proyecto en la nube (`timbhcrbisxeniquwwmm`).

## 🆕 Nuevas Tablas (Módulos Principales)

- **Control de Cotizaciones**: `cotizaciones`, `cotizaciones_detalle`, `cotizaciones_historial`, `cotizaciones_configuracion`.
- **Catálogos Normalizados**: `rubros`, `paises`, `ubigeo` (con datos de Perú).
- **Finanzas**: `tasas_cambio`, `plazos_pago`, `formas_pago`.
- **Operaciones**: `servicios`, `maquinaria`, `maquinaria_modelos`, `maquinaria_documentos`.
- **Configuración**: `companies_consecutives`, `app_calendario_festivos`, `app_hora_intervalos`.

## 🛠️ Modificaciones en Tablas Existientes

- **`companies`**:
  - Se agregaron campos: `website`, `email`, `phone`, `gerente_general`, `direccion`, `ubicacion_ciudad`, `ubicacion_pais`.
- **`profiles`**:
  - Se agregó `bubble_id` (para auditoría e integración con sistema anterior).
  - Se agregó `tenant_id` (para aislamiento de datos).
- **`terceros`**:
  - Se agregaron llaves foráneas a: `rubro_id`, `pais_id`, `ubigeo_codigo`.

## 🔒 Mejoras de Seguridad y Auditoría

- **RLS (Row Level Security)**: Habilitado en todas las nuevas tablas con políticas de aislamiento por `tenant_id`.
- **Auditoría**: Se agregaron campos `created_by` y `updated_by` en todas las tablas transaccionales y de catálogos para seguimiento histórico.
- **Triggers**: Implementación de triggers automáticos para la columna `updated_at`.

## 📂 Almacenamiento (Storage)

- Se requiere la creación de los buckets:
  - `logos`: Para logotipos de empresas.
  - `banca`: Para firmas y documentos de configuración.
  - `documentos`: Para archivos adjuntos de maquinaria y personal.
