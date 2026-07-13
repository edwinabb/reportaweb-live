# EB-new-module — Scaffold de nuevo módulo

Crea la estructura completa de un nuevo módulo siguiendo las convenciones del proyecto.

## Argumento

`$ARGUMENTS` = nombre del módulo en minúsculas sin espacios (ej: `inventario`, `mantenimiento`)

## Pasos

1. Crea `lib/actions/<nombre>.ts` con `'use server'` y funciones CRUD básicas:
   - `list<Nombre>(tenantId)` — lista activos del tenant
   - `getById(id)` — detalle con joins necesarios
   - `create<Nombre>(data)` — insert con tenant_id y captureWithContext en errores
   - `update<Nombre>(id, data)` — update con verificación de tenant
   - `delete<Nombre>(id)` — soft delete (campo `is_active = false`) o hard delete según el módulo
2. Crea `app/(dashboard)/<nombre>/page.tsx`:
   - `export const dynamic = 'force-dynamic'`
   - `searchParams` como `Promise<T>` + `await searchParams`
   - Llama al server action y pasa datos al Client Component
3. Crea `app/(dashboard)/<nombre>/loading.tsx` con el spinner estándar del proyecto.
4. Crea `components/<nombre>/<nombre>-table.tsx` como Client Component (`'use client'`).
5. Agrega entrada al sidebar en `components/layout/sidebar.tsx` en la sección correspondiente.
6. Registra el módulo en `CLAUDE.md` en la sección "Estado de módulos".
7. Reporta los archivos creados y los pasos manuales restantes (ej: crear tabla en Supabase, regen types).
