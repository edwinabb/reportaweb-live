# UI Template — Páginas de Listado (estándar)

**Versión:** 1.0 — 2026-07-14
**Estado:** ⏳ En revisión con usuario (aplicado a Usuarios, Tipos de Documento, Documentación)
**Objetivo:** Aplicar a TODOS los módulos de listado (Maquinaria, Terceros, Sitios, EPP, etc.)

---

## Estructura de página

```
║ Breve descripción de la página…                                          ║
║ [Buscar…            ]    [Extras] [Activos|Papelera] [↓XLS] [+ Nuevo]    ║
╟──────────────────────────────────────────────────────────────────────────╢
║ COLUMNAS sin ordenamiento │ filtros ▼ embudo en columnas tipificadas     ║
║ (nombre del registro en ROJO si está inactivo)                           ║
╟──────────────────────────────────────────────────────────────────────────╢
║ N registro(s) │ Filas por página [10 ▾] │ Página 1 de M │ ⏮ ◀ ▶ ⏭        ║
```

## Reglas

1. **Encabezado de página:** SIN breadcrumb/path, SIN título visible.
   Solo `<PageDescription>` con 1-2 frases (qué es la página y qué se puede hacer).
   Mantener un `<h1 className="sr-only">` por accesibilidad.

2. **Búsqueda multicampo:** un solo input, case-insensitive, coincidencia en
   cualquier posición, sobre los campos identificatorios (ej. nombre + nro documento).
   Placeholder explícito: `"Buscar por nombre o nro documento..."`.

3. **Sin ordenamiento por columna:** títulos fijos, sin flechas de sort.

4. **Filtros por columna (embudo):** usar `<ColumnFilterHeader>` en columnas
   tipificadas (estados, categorías, roles, tipos). Ícono azul cuando hay filtro
   activo + opción "Limpiar filtro". `multiple={false}` cuando el filtro se
   aplica en servidor con un solo valor.

5. **Botonera derecha (en este orden):**
   `[Extras específicos] [Activos|Papelera] [↓XLS] [+ Nuevo]`
   - **Activos/Papelera:** vista por defecto = solo activos. Papelera = inactivos.
   - **↓XLS:** exporta **lo filtrado** con `exportToExcel(pagina, filas)` →
     nombre `PAGINA-AAAA-MM-DD-HH-MM.xls` (ej. `USUARIOS-2026-07-14-20-06.xls`).
   - **+ Nuevo:** botón naranja (`bg-orange-600`).
   - SIN botón "Vista"/opciones de columnas.

6. **Registros inactivos:** el nombre/identificador se pinta `text-red-600`.

7. **Paginación (siempre al pie):** contador `N registro(s)` + `Filas por página`
   (10/20/50) + `Página X de Y` + ⏮ ◀ ▶ ⏭.
   - Tablas cliente (tanstack): `DataTable` ya la incluye (`DataTablePagination`).
   - Tablas manuales o server-side: `<TablePaginationBar>`.

8. **Datasets grandes → servidor:** si la tabla puede superar ~500 filas en prod
   (ej. Documentación), filtros + búsqueda + paginación van por URL params y se
   resuelven en el servidor. La URL filtrada debe ser copiable/compartible.

## Componentes compartidos

| Pieza | Archivo |
|-------|---------|
| Filtro embudo de columna | `components/ui/column-filter-header.tsx` |
| Barra de paginación manual/server | `components/ui/table-pagination-bar.tsx` |
| Export Excel estándar | `lib/utils/export-excel.ts` |
| Descripción de página | `components/ui/page-description.tsx` |
| Tabla tanstack con toolbar/paginación | `components/ui/data-table.tsx` |

## Páginas de referencia (implementación)

- **Cliente (tanstack):** `/users` → `app/(dashboard)/users/client-page.tsx`
- **Cliente (tabla manual):** `/settings/document-types` → `components/settings/document-types/document-types-table.tsx`
- **Servidor (URL params):** `/users/documents` → `components/users/documents/global-documents-table.tsx`
- **Vista especial (depuración en lote):** `/users/documents/depurar`

## Pendientes de decisión

- Confirmar orden de grupos en Depurar vencidos (hoy: +6 meses primero → +1 al final;
  dentro de cada grupo, del vencimiento más reciente al más antiguo).
- Al validar módulo 2 (Maquinaria), revisar si el template necesita ajustes antes
  de replicarlo al resto.
