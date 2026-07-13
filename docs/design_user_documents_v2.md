# Diseño del Módulo de Documentos de Usuarios (Refinado)

## 1. Visión General

Este módulo gestionará la documentación del personal (Usuarios), soportando multitenencia, auditoría completa y soft-delete. Se diseñará específicamente para facilitar la migración desde Bubble (tenants: CISE y GRUAS DEL PACIFICO).

## 2. Estándares y Reglas de Negocio

1. **Auditoría**: Todas las tablas incluyen `created_at`, `modified_at`, `created_by`, `modified_by`.
2. **Soft Delete**: Se utiliza el campo `is_active` (boolean). `false` indica eliminado.
3. **Multitenant**: Todas las tablas incluyen `tenant_id`.
4. **Archivos**:
    * **Tipos permitidos**: PDF, Imágenes (JPG, PNG).
    * **Restricciones**: No ZIP, no ejecutables. Máximo 20MB.
    * **Bucket**: `doc_usuarios` (Privado).
    * **Ruta de Almacenamiento**:
        `{tenant_clean}/{nombre_apellido_usuario}/{nombre_documento}/{fecha_vencimiento_YYYYMMDD}/{archivo}`
        * *Ejemplo*: `cise/juan_perez/antecedentes_penales/20251231/archivo.pdf`
        * Nota: Si no tiene vencimiento, usar `sin_vencimiento` en lugar de la fecha.

## 3. Estructura de Base de Datos

### 3.1. Tabla: `document_types` (Tipos de Documento)

Catálogo de tipos de documentos. Puede tener registros globales (tenant_id nulo) o específicos por tenant.

| Columna | Tipo | Restricción | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Identificador único |
| `tenant_id` | UUID | FK | Referencia a `companies(id)`. Nulo para globales. |
| `name` | TEXT | NOT NULL | Nombre del documento |
| `code` | TEXT | | Código/Abreviatura |
| `category` | ENUM | NOT NULL | 'seguro', 'con_vencimiento', 'sin_vencimiento' |
| `expiration_alert_days` | INT | DEFAULT 30 | Días para alerta previa |
| `is_active` | BOOL | DEFAULT TRUE | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Auditoría |
| `modified_at` | TIMESTAMPTZ | | Auditoría |
| `created_by` | UUID | FK `profiles(id)` | Auditoría |
| `modified_by` | UUID | FK `profiles(id)` | Auditoría |
| `bubble_id` | TEXT | UNIQUE | ID original de Bubble para migración |

### 3.2. Tabla: `user_documents` (Documentos de Usuario)

Registro de documentos asignados y cargados.

| Columna | Tipo | Restricción | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Identificador único |
| `tenant_id` | UUID | FK NOT NULL | Referencia a `companies(id)` |
| `user_id` | UUID | FK NOT NULL | Referencia a `profiles(id)` |
| `document_type_id` | UUID | FK NOT NULL | Referencia a `document_types(id)` |
| `file_path` | TEXT | NOT NULL | Ruta relativa en Storage |
| `file_name` | TEXT | NOT NULL | Nombre original del archivo |
| `file_size` | INT | | Tamaño en bytes |
| `content_type` | TEXT | | Mime type (application/pdf, image/...) |
| `valid_from` | DATE | | Inicio de vigencia |
| `valid_until` | DATE | | Fin de vigencia (NULL si no aplica) |
| `status` | TEXT | GENERATED | Estado calculado (VIGENTE/VENCIDO/POR_VENCER) |
| `is_active` | BOOL | DEFAULT TRUE | Soft delete |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Auditoría |
| `modified_at` | TIMESTAMPTZ | | Auditoría |
| `created_by` | UUID | FK `profiles(id)` | Auditoría |
| `modified_by` | UUID | FK `profiles(id)` | Auditoría |
| `bubble_id` | TEXT | UNIQUE | ID original de Bubble para migración |
| `migration_status` | TEXT | | 'PENDING', 'COMPLETED', 'ERROR' |

## 4. Estrategia de Migración: Bubble a Supabase

### 4.1. Preparación

1. **Scopes**: Tenants `CISE` y `GRUAS DEL PACIFICO`.
2. **Mapping de Usuarios**: Se requiere un mapa `Bubble User ID` -> `Supabase User UUID`.
3. **Mapping de Tipos**: Se requiere mapa `Bubble Doc Type ID` -> `Supabase Doc Type UUID`.

### 4.2. Algoritmo de Migración

Para cada documento en Bubble (CSV export):

1. Validar existencia de usuario en Supabase (por email o bubble_id).
2. Validar existencia de Tipo de Documento.
3. Determinar ruta de destino:
    * Limpiar nombre de tenant.
    * Concatenar nombre y apellido de usuario (limpio).
    * Concatenar nombre documento.
    * Formatear fecha vencimiento (o 'sin_vencimiento').
4. Descargar archivo desde URL de Bubble.
5. Validar tipo (PDF/IMG) y tamaño (<20MB).
6. Subir a Supabase Storage con la ruta generada.
7. Insertar registro en `user_documents` con:
    * `created_at` original de Bubble.
    * `created_by` mapeado (o usuario sistema migracion).
    * `bubble_id`.
    * `migration_status` = 'COMPLETED'.

## 5. Script SQL (Supabase)

El script de creación de tablas incluirá trigers para `modified_at` y definiciones de Storage Bucket.
