# Brand Guide — Reporta

> Pegable como contexto de marca al inicio de cualquier sesión de IA o como
> brief para dev externo. Auto-contenido: no depende de otros archivos.
> Extraído de `reportaweb3` al 2026-04-20 (web desktop) — los tokens son los
> mismos para la APP móvil (`reporta-app`) salvo ajustes de densidad.

---

## Prompt reutilizable (copiar desde aquí)

Estás construyendo UI para **Reporta**, sistema multi-tenant de gestión
operativa (planificación, cotizaciones, ventas, inspecciones) para empresas de
servicios — tenants actuales: CISE y GRUAS. Usá estos lineamientos:

### 1. Stack base

- **Framework:** Next.js 16 App Router (web) / Expo + React Native (móvil).
- **Estilos:** Tailwind CSS v4 + shadcn/ui (componentes primitivos ya
  instalados en `components/ui/`). Paleta y radio vienen de tokens CSS en
  `app/globals.css`. No crear tokens ad-hoc — usar los semánticos (`primary`,
  `secondary`, `muted`, `destructive`, `border`, `ring`).
- **Fuente:** Geist Sans (cuerpo) + Geist Mono (códigos, IDs). Cargadas en
  `app/layout.tsx` vía `next/font/google`. Variables: `--font-geist-sans`,
  `--font-geist-mono`. No importar otras fuentes.

### 2. Paleta de color

**Primario — Naranja Reporta** (CTAs, indicadores activos, marca):

| Uso | Tailwind | Hex | OKLCH |
|---|---|---|---|
| Logo wordmark | `text-orange-600` | `#EA580C` | `oklch(0.646 0.222 41.116)` |
| Botón CTA default | `bg-orange-600 hover:bg-orange-700` | `#EA580C → #C2410C` | — |
| Botón "+" acciones | `bg-orange-500 hover:bg-orange-600` | `#F97316 → #EA580C` | — |
| Indicador activo sidebar | `bg-orange-500` | `#F97316` | — |
| Fondo suave / badge interno | `bg-orange-100 text-orange-600` | `#FFEDD5 / #EA580C` | — |
| Borde sutil (cards login) | `border-orange-500/20` | — | — |
| Glow CTA | `shadow-lg shadow-orange-500/30` | — | — |

**Secundario — Slate oscuro** (texto fuerte, badges neutros):

- `text-slate-800` / `text-gray-800` para headings dentro de cards.
- `text-gray-500` para captions y subtítulos.
- `text-gray-400` para placeholders / "sin datos".

**Estados semánticos:**

| Estado | Tailwind | Uso |
|---|---|---|
| Éxito / aprobado | `bg-green-50 text-green-700 border-green-200` (o `-600` para fill) | Tarea confirmada, cotización APROBADA, toast success |
| Advertencia | `bg-amber-50 text-amber-700 border-amber-200` (o `yellow-*`) | Prioridad MEDIA, estado pendiente |
| Destructivo | `bg-red-50 text-red-700 border-red-200` (fill `red-600`) | Prioridad ALTA, CANCELADA, destructive actions |
| Información | `bg-blue-50 text-blue-700 border-blue-200` | Personal **interno** (vs naranja para externo), info cards |

**Tokens shadcn (no reinventar):**

```css
/* light mode — app/globals.css :root */
--background: oklch(0.985 0 0);      /* casi blanco   #FAFAFA */
--foreground: oklch(0.145 0 0);      /* casi negro    #252525 */
--primary: oklch(0.646 0.222 41.116);/* naranja marca #EA580C */
--primary-foreground: oklch(0.985 0 0);
--secondary: oklch(0.205 0 0);       /* slate 950     #0F172A */
--muted: oklch(0.97 0 0);            /* bg-gray-50    #F7F7F7 */
--muted-foreground: oklch(0.556 0 0);/* gris medio    #767676 */
--border: oklch(0.922 0 0);          /* border suave  #E5E5E5 */
--ring: oklch(0.646 0.222 41.116);   /* focus naranja */
--radius: 0.625rem;                  /* 10px          */
```

Dark mode mantiene naranja primario y vuelca fondos/textos (ver `.dark {}`).

### 3. Tipografía (tamaños)

Cuerpo default = 14 px (`text-sm`). Escala de uso:

| Token | Uso concreto |
|---|---|
| `text-2xl font-bold` | H1 de página (casi no usado — preferimos `text-xl`). |
| `text-xl font-bold text-gray-800` | Título de dialog (`DialogTitle`). Ej. nombre de tarea en `TareaDetailDialog`. |
| `text-lg font-bold` | Títulos de section dentro de cards (ej. "Asignación de Personal"). |
| `text-base` | Inputs, contenido de form principal. |
| `text-sm` | Body de tablas, labels de form, descriptions de card. **Default general.** |
| `text-sm font-medium` | Encabezados de columna en `Table`. |
| `text-xs` | Subtítulos, captions, fechas en listados. |
| `text-xs uppercase tracking-wider text-gray-500 font-bold` | **Section headers minúsculos** (ej. "DATOS DE LA TAREA", "RECURSOS ASIGNADOS"). Patrón recurrente. |
| `text-[11px] / text-[10px]` | Meta-info muy densa (badges "Externo", nombre de proveedor bajo el nombre del recurso). Usar con moderación. |
| `font-mono` | Solo códigos visibles al usuario: `T-2026-0001`, `CT-168-2023`, PIN, token. |

Pesos: la marca prefiere `font-medium` sobre `font-bold`. Reservar `font-bold`
y `font-black` para títulos y el wordmark "REPORTA" (`font-black italic`).

### 4. Espaciado, radios y sombras

- **Radius default:** `rounded-md` (6px) para inputs/botones chicos,
  `rounded-lg` (10px para cards y dialogs. `rounded-full` para avatar / badges
  circulares / botón "+".
- **Sombras:** `shadow-sm` (Card), `shadow-lg shadow-orange-500/30` (CTA
  "héroe" tipo submit del login), `shadow-xs` (inputs). Evitar `shadow-xl` o
  mayores — la marca es plana.
- **Padding de card:** `p-4` (contenido corto) o `p-6` (detallado).
  `CardContent` default ya trae `pt-6`.
- **Gap en layouts:** `gap-2` (badges/listas internas), `gap-3` (rows de
  botones), `gap-4` (grids de 2 columnas), `gap-6` (secciones de un mismo
  bloque).

### 5. Componentes clave (shadcn/ui — 31 instalados)

Form: `Button`, `Input`, `Label`, `Form`, `Select`, `Checkbox`, `RadioGroup`,
`Textarea`, `Switch`, `Calendar`.
Layout: `Card`, `Sheet`, `DropdownMenu`, `Accordion`, `Tabs`, `ScrollArea`,
`Breadcrumb`, `Separator`.
Overlays: `Dialog`, `AlertDialog`, `Popover`, `Tooltip`.
Data: `Table` + `data-table-*` (TanStack Table), `Badge`, `Skeleton`, `Avatar`.
Feedback: `Alert`, `Sonner` (toast).

**Nunca usar `window.confirm` / `window.alert`** — siempre `AlertDialog` (no
reversible) o `toast.error/success` (Sonner).

**Variantes de Button canónicas:**
- `variant="default"` — naranja primario (ya tokenizado).
- `variant="outline"` — fondo blanco, borde suave. Para acciones
  secundarias en toolbars.
- `variant="ghost"` — sin fondo, hover tenue. Para íconos y links inline.
- `variant="destructive"` — rojo, solo para acciones irreversibles.
- Tamaños: `size="sm"` (h-8), default (h-9), `size="icon"` (h-9 w-9).

### 6. Patrones UI recurrentes

**Dialog (detalle / form modal):**
```tsx
<DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
  <DialogHeader className="p-6 pb-2 border-b bg-gray-50/50">…</DialogHeader>
  {/* Tabs naranja */}
  <TabsTrigger className="data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 rounded-none bg-transparent" />
  <ScrollArea className="flex-1 bg-gray-50/30">…</ScrollArea>
</DialogContent>
```

**Row agrupadora (ej. header de fecha en listado):**
```tsx
<TableRow className="bg-orange-50/60 hover:bg-orange-50/60">
  <TableCell className="py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-700">
    Lunes 16 de Febrero, 2026
  </TableCell>
</TableRow>
```

**Badge Interno vs Externo** (convención en Reporta):
- **Interno** (mi personal / mi pool) → azul: `bg-blue-100 text-blue-700` con
  borde izquierdo `border-l-4 border-l-blue-500`.
- **Externo** (proveedor RH / alquiler) → naranja: `bg-orange-100 text-orange-700`
  con borde izquierdo `border-l-4 border-l-orange-500`.
- Maquinaria externa usa rojo (`border-l-red-500`) para contrastar con el
  naranja ya muy usado.

**CTA "+":** siempre `size="icon"` + `className="shrink-0 bg-orange-500 hover:bg-orange-600"`. Ícono `<Plus className="h-5 w-5" />`.

**Toast:** `toast.success("Mensaje claro, directo")` / `toast.error(msg)`.
No mezclar emojis salvo si el user lo pide.

### 7. Sidebar + navegación

- Ancho expandido ≈ 240px, colapsado = 56px.
- Item activo: `bg-accent font-semibold` + indicador naranja a la derecha
  (`w-1.5 h-4 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]`).
- Submenu activo: `bg-orange-500/10 text-orange-600`. Separador vertical
  `border-l-2 border-orange-500/20`.
- Iconos: `lucide-react` (ya instalado). Tamaño `h-4 w-4` en menú,
  `h-3.5 w-3.5` en sub-items.
- Logo: condicional. Si `companies.logo_url` existe → imagen con
  `w-28 h-9` (expandido) o `w-9 h-9` (colapsado). Fallback: wordmark
  `font-black text-lg tracking-tighter text-orange-600 italic` → "REPORTA"
  o badge "RE" con `bg-orange-500 text-white font-bold`.

### 8. Idioma y tono

- **Español latino neutro, registro "tú/tu"** (nunca "usted" ni "vos").
- Labels en **Title Case** o primera mayúscula ("Título de la tarea",
  "Cliente", "Comentarios o instrucciones especiales").
- Botones en **imperativo corto**: "Guardar", "Cancelar", "Crear", "Agregar".
- Estados en **mayúsculas** cuando son enums DB (`BORRADOR`, `CONFIRMADA`,
  `APROBADA`). Sustantivos en oración normal.
- Fechas: `date-fns` con `locale: es`. Formatos canónicos:
  - Listado: `"dd LLL"` → "16 Feb"
  - Rango: `"d 'de' MMMM, yyyy"` → "16 de Febrero, 2026"
  - Hora: `"HH:mm"` → "08:00-18:00"
  - Código mes + año en PDFs: `"Abr-2026"`.
- Moneda: `PEN` y `USD` (nunca EUR). Símbolo "S/." para soles informal,
  "USD" explícito.

### 9. Accesibilidad y estados

- Focus: `ring-2 ring-ring` (tokenizado → naranja). No quitar outlines.
- Estados de loading: `Skeleton` para listas, `Loader2` con
  `animate-spin` dentro de botones (`<Loader2 className="h-4 w-4 animate-spin" />`).
- Empty states: `p-12 border-2 border-dashed rounded-lg text-center text-muted-foreground bg-muted/10` + un mensaje accionable.
- `disabled:` siempre deja la forma clickeable detectable (shadcn lo maneja).

### 10. Qué NO hacer

- ❌ Colores inventados fuera de la paleta tokenizada.
- ❌ Fuentes que no sean Geist.
- ❌ Emojis en UI del producto (salvo si el user lo pide o en contenido que
  viene de DB).
- ❌ Shadows muy pesadas (`shadow-2xl` etc.).
- ❌ `window.confirm/alert`.
- ❌ `text-xs` para body largo (ilegible).
- ❌ Mezclar radius distintos en la misma card.
- ❌ Hardcodear "T-XXXX" o "CT-XXX" — siempre leer `codigo` real de DB.
- ❌ Hacer el naranja de fondo pleno en grandes áreas (abrumador).
  Reservarlo para CTAs, accents e indicadores activos.

---

## Fin del prompt

Archivo: `docs/BRAND-GUIDE.md` · Última revisión: 2026-04-20 · Referencia
viva: `app/globals.css`, `app/layout.tsx`, `components/ui/`.
