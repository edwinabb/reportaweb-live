# Auditoría módulo — Sitios (Catálogos #3)

**Fecha:** 2026-04-19
**Cutover:** 2026-04-26 (7 días)
**Screenshots referencia:** `3- Reporta Next - Sitios.pdf`

En Bubble, **Sitios** es módulo top-level. En Next es sub-entry bajo Terceros (`/terceros/sitios`). Aceptado como mejora arquitectónica.

---

## 3.1 Sitios (listado + CRUD)

**Archivos Next:** [app/(dashboard)/terceros/sitios/page.tsx](../../app/(dashboard)/terceros/sitios/page.tsx) · [client-page.tsx](../../app/(dashboard)/terceros/sitios/client-page.tsx) · [components/terceros/sitio-dialog.tsx](../../components/terceros/sitio-dialog.tsx) · [lib/actions/sitios.ts](../../lib/actions/sitios.ts)

| # | Bubble | Next.js | Gap | Severidad | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Columnas: código, sitio (nombre), tipo, dirección, ciudad, **departamento**, terceros (empresa) | código, nombre, terceros[] (badges), tipo, dirección, ciudad | Falta columna `departamento` en listado | 🟢 | 15 min |
| 2 | Búsqueda por nombre | Búsqueda por nombre | ✅ | ✅ | — |
| 3 | Filtros: Empresa, Estado/Departamento, Ciudad | Sólo tabs Activos/Papelera | **Falta panel de filtros** (con 232 sitios importa) | 🟡 | 1.5h |
| 4 | Descargar Excel | ❌ | Falta export Excel | 🟡 | 1h |
| 5 | Detail VER SITIO: código, nombre, tercero(s), tipo, **dirección asociada a coordenadas**, comentarios | Dialog edita código, nombre, tercero(s), tipo, dirección, ciudad, comentarios. **latitud/longitud existen en schema pero NO se renderizan** | Falta UI para lat/long. Si "dirección asociada a coordenadas" implica integración con mapa/geocoding, falta también eso | 🟡 | 2h UI · 4h+ si hay geocoding |
| 6 | Tipo: select con "+" para agregar nuevo tipo | Select de tipos + "+" via `/settings/sitios` (Tipos de Sitios) | ✅ | ✅ | — |
| 7 | Tercero(s) asociado(s) — multi | Multi-select terceros | ✅ | ✅ | — |
| 8 | Menú fila: Ver, Editar, Deshabilitar | Edit + Delete (soft-delete con Papelera). No hay Ver solo-lectura | Falta modo "Ver" | 🟢 | 45 min |
| 9 | Paginación (232 items) | Client-side via react-table | Escala OK para 232 | ✅ | — |

**Total Sitios:** ~3.5-5.5h (depende de qué tan profundo va el tema coordenadas).

---

## Resumen y recomendación pre-cutover

### 🔴 BLOQUEA-CUTOVER

**Ninguno.** Daily ops funciona.

### 🟡 POST-CUTOVER (total ~4.5h sin geocoding)

1. **Panel de filtros Empresa/Depto/Ciudad** (1.5h) — con 232 sitios, sin filtros es UX friccionoso.
2. **Export Excel** (1h).
3. **UI para lat/long en dialog** (2h) — los campos ya existen en DB (probablemente vinieron de Bubble migrados).

### 🟢 MEJORAS

- Columna departamento en listado (15 min).
- Modo "Ver" solo-lectura (45 min).

### Pregunta abierta

**Coordenadas / geocoding:** Bubble dice "dirección asociada a coordenadas". ¿Era una integración con Google Maps / geocoding inverso, o sólo campos manuales de lat/long? Si era geocoding, queda como **pregunta separada** para la fase 4 (post-cutover) porque requiere definir proveedor (Google Maps API, OpenStreetMap) + budget.
