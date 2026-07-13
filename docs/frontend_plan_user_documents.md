# Plan de Implementación Frontend: Módulo de Documentos de Usuarios

Este documento detalla los pasos para construir la interfaz de usuario y la lógica de negocio (Server Actions) para el módulo de documentos, alineado con el diseño de base de datos multitenant y auditado.

## Fases del Desarrollo

### Fase 1: Definición de Tipos y Acciones de Servidor (Backend Logic)

Antes de construir la UI, definiremos las estructuras de datos y las funciones seguras para interactuar con Supabase.

1. **Definir Tipos (`types/user-documents.ts`)**:
    * Interfaces para `DocumentType` y `UserDocument`.
    * Zod Schemas para validación de formularios.

2. **Server Actions - Tipos (`lib/actions/document-types.ts`)**:
    * `getDocumentTypes()`: Listar tipos (Globales + Tenant actual).
    * `upsertDocumentType(data)`: Crear o editar tipo.
    * `deleteDocumentType(id)`: Soft-delete (`is_active = false`).

3. **Server Actions - Documentos (`lib/actions/user-documents.ts`)**:
    * `getUserDocuments(userId)`: Listar documentos de un usuario.
    * `uploadUserDocument(formData)`:
        * Recibe archivo y metadatos.
        * Consulta configuración del Tenant y Usuario para construir el `storage_path` estandarizado.
        * Sube archivo a Storage (`upsert`).
        * Guarda registro en DB.
    * `deleteUserDocument(id)`: Soft-delete.

### Fase 2: Módulo de Configuración (Administración de Tipos)

Permite a los administradores definir qué documentos se solicitarán.

**Ruta sugerida:** `/config/document-types` (Nueva página) o `/settings/document-types`.

1. **Componente `DocumentTypeDialog`**:
    * Formulario con React Hook Form.
    * Campos: Nombre, Código, Categoría (Select: Vencimiento/Seguro/Sin), Días Alerta.

2. **Componente `DocumentTypesTable`**:
    * DataTable con columnas: Nombre, Categoría, Alerta, Estado, Acciones (Editar/Eliminar).
    * Filtro por nombre.

### Fase 3: Módulo de Gestión de Documentos (Perfil de Usuario)

Integración en la ficha del usuario para ver y cargar su documentación.

**Ubicación:** `/users/[id]` (Nueva pestaña "Documentos").

1. **Componente `UserDocumentsList`**:
    * Lista visual (Cards o Tabla compacta).
    * **Indicadores de Estado (Semáforo)**:
        * 🔴 Vencido (Fecha vencimiento < Hoy).
        * 🟡 Por vencer (Fecha vencimiento < Hoy + Días Alerta).
        * 🟢 Vigente.
    * Acciones: Ver archivo (Link a storage), Editar, Eliminar.

2. **Componente `UserDocumentUploadForm`**:
    * Formulario modal.
    * **Selección de Tipo**: Dropdown filtrado por tipos activos.
    * **Lógica Condicional**:
        * Si el tipo es "Con Vencimiento", mostrar y obligar campos de fecha (`Válido desde`, `Válido hasta`).
    * **Carga de Archivo**: Input file (acepta PDF, Imágenes).
    * **Previsualización**: Mostrar nombre del archivo seleccionado.

### Fase 4: Integración y Pulido

1. **Navegación**:
    * Agregar enlace a "Tipos de Documentos" en el menú de configuración.
    * Agregar pestaña "Documentos" en la vista de detalle de usuario.

2. **Auditoría y Seguridad**:
    * Asegurar que `created_by` y `modified_by` se llenen desde la sesión actual.
    * Validar permisos (solo admins pueden gestionar Tipos; usuarios/admins pueden cargar docs).

## Estructura de Archivos Propuesta

```text
/types
  └── user-documents.ts       # Interfaces y Zod Schemas

/lib/actions
  ├── document-types.ts       # CRUD Tipos
  └── user-documents.ts       # CRUD Documentos y Lógica Storage

/components/settings/document-types
  ├── document-types-table.tsx
  └── document-type-dialog.tsx

/components/users/documents
  ├── user-documents-list.tsx # Lista con semáforos
  ├── user-document-card.tsx  # Item individual (opcional)
  └── upload-document-dialog.tsx # Formulario complejo de carga

/app/(dashboard)/settings/document-types/page.tsx # Página de configuración
```

## Dependencias Clave

* `react-hook-form` + `zod`: Manejo de formularios robustos.
* `shadcn/ui`: Dialog, Form, Input, Select, Table, Badge (para estados).
* `lucide-react`: Iconos para archivos y estados.
