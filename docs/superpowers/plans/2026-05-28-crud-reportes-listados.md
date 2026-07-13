# CRUD Completo en Listados de Reportes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar botón "Nuevo" y "Editar" a las 4 páginas de listado (R. Checklist, R. Maquinaria, R. Personal, R. Gastos), con un selector de tarea compartido con filtros de cliente y fecha, y generación automática de PDF al guardar.

**Architecture:** `SeleccionarTareaDialog` es un componente compartido con filtros cliente+fecha. Las páginas de listado se dividen en server (data fetch) + client (tabla + dialogs). Los forms existentes de maquinaria y personal se extienden con soporte para edición. Al crear o editar un reporte, se dispara la generación del PDF (GET al route existente) y se guarda el URL en DB.

**Tech Stack:** Next.js App Router, React Hook Form + Zod, Supabase JS, shadcn/ui, existing reporte-*-form components, Gotenberg PDF (via rutas existentes).

---

## Contexto clave para implementadores

### Rutas PDF existentes
- `GET /api/reportes-maquinaria/[id]/pdf` — genera, guarda en bucket `reporte-maquinaria`, actualiza `pdf_url`
- `GET /api/reportes-personal/[id]/pdf` — genera, guarda en bucket `informes-personal`, actualiza `pdf_url`
- No existe ruta PDF para `reportes_combustible` — se omite por ahora

### Funciones existentes
- `getTercerosForSelect()` → `{id, razon_social}[]` — `lib/actions/terceros.ts`
- `getMaquinarias(query?, onlyActive?)` → `Maquinaria[]` — `lib/actions/maquinarias.ts`
- `getProfiles(onlyActive?)` → `Profile[]` — `lib/actions/users.ts`
- `getTerceroPersonalList()` → terceros[] — `lib/actions/reportes.ts`
- `getConfigInformeMaquinaria()` — `lib/actions/informes-config.ts`
- `getConfigInformePersonal()` — `lib/actions/informes-config.ts`
- `createReporteMaquinaria(payload)` returns `{success, message}` — `lib/actions/reportes.ts`
- `createReportePersonal(payload)` returns `{success, message}` — `lib/actions/reportes.ts`
- `createReporteCombustible(payload)` returns `{success, message}` — `lib/actions/reportes.ts`

### Forms existentes — puntos exactos de modificación
- `components/reportes/reporte-maquinaria-form.tsx`
  - Import en línea 14: `import { createReporteMaquinaria } from "@/lib/actions/reportes"`
  - `useForm` en línea 103: `const form = useForm({ resolver: zodResolver(schema), defaultValues: { ... } })`
  - `onSubmit` llama `createReporteMaquinaria(payload)` en línea 204
  - Props interface en línea 80-87
- `components/reportes/reporte-personal-form.tsx`
  - Import en línea 20: `import { createReportePersonal } from "@/lib/actions/reportes"`
  - `useForm` en línea 93: misma estructura
  - `onSubmit` llama `createReportePersonal(payload)` en línea 243
  - Props interface en línea 64-72

### Patrón listing page split
```
app/(dashboard)/informes/maquinaria/page.tsx (server) → fetchea data → <ReportesMaquinariaSection />
components/reportes/reportes-maquinaria-section.tsx (client) → tabla + dialogs + router.refresh()
```

---

## File Map

| File | Acción |
|---|---|
| `lib/actions/tareas.ts` | Modify — add `searchTareasConFiltros`, export `TareaConRecursos` |
| `lib/actions/reportes.ts` | Modify — retornar `id` en creates, add update + getById |
| `components/shared/seleccionar-tarea-dialog.tsx` | Create |
| `components/reportes/reporte-maquinaria-form.tsx` | Modify — add `reporteId?`, `initialData?` |
| `components/reportes/reporte-maquinaria-dialog.tsx` | Create |
| `components/reportes/reportes-maquinaria-section.tsx` | Create |
| `app/(dashboard)/informes/maquinaria/page.tsx` | Modify |
| `components/reportes/reporte-personal-form.tsx` | Modify — add `reporteId?`, `initialData?` |
| `components/reportes/reporte-personal-dialog.tsx` | Create |
| `components/reportes/reportes-personal-section.tsx` | Create |
| `app/(dashboard)/informes/personal/page.tsx` | Modify |
| `components/reportes/reporte-combustible-form.tsx` | Create |
| `components/reportes/reporte-combustible-dialog.tsx` | Create |
| `components/reportes/reportes-gastos-section.tsx` | Create |
| `app/(dashboard)/informes/gastos/page.tsx` | Modify |
| `components/informes/nuevo-informe-dialog.tsx` | Modify — usar SeleccionarTareaDialog |
| `components/informes/informes-list.tsx` | Modify — icono Editar por fila |

---

## Task 1: `searchTareasConFiltros` + tipo `TareaConRecursos`

**Files:**
- Modify: `lib/actions/tareas.ts`

- [ ] **Step 1: Agregar tipo y función al final del archivo**

```typescript
// --- BÚSQUEDA CON FILTROS ---

export type TareaConRecursos = {
    id: string
    codigo: string | null
    titulo: string
    fecha_inicio: string | null
    fecha_fin: string | null
    cliente: { id: string; razon_social: string | null } | null
    sitio: { id: string; nombre: string | null } | null
    recursos: Array<{
        tipo_recurso: string
        personal: { first_name: string | null; last_name: string | null } | null
        maquinaria: { nombre: string | null; codigo_interno: string | null } | null
    }>
}

export async function searchTareasConFiltros(
    clienteId?: string | null,
    fecha?: string | null,
): Promise<TareaConRecursos[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    // Filtro por fecha: obtener tarea_ids que cubren esa fecha
    let tareaIds: string[] | null = null
    if (fecha) {
        const { data: fechasData } = await adminClient
            .from('tareas_fechas')
            .select('tarea_id')
            .lte('fecha_inicio', fecha)
            .gte('fecha_fin', fecha)
            .eq('tenant_id', tenantId)
        tareaIds = (fechasData ?? []).map((f: any) => f.tarea_id)
        if (tareaIds.length === 0) return []
    }

    let query = adminClient
        .from('tareas')
        .select(`
            id, codigo, titulo,
            cliente:terceros!tareas_cliente_id_fkey(id, razon_social),
            sitio:terceros_sitios!tareas_sitio_id_fkey(id, nombre),
            recursos:tareas_recursos(
                tipo_recurso,
                personal:profiles(first_name, last_name),
                maquinaria:maquinarias(nombre, codigo_interno)
            ),
            fechas:tareas_fechas(fecha_inicio, fecha_fin)
        `)
        .eq('tenant_id', tenantId)
        .neq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(30)

    if (clienteId) query = query.eq('cliente_id', clienteId)
    if (tareaIds) query = query.in('id', tareaIds)

    const { data, error } = await query
    if (error) { console.error('searchTareasConFiltros error:', error); return [] }

    return (data ?? []).map((r: any) => {
        const fechas = (r.fechas ?? []) as Array<{ fecha_inicio: string; fecha_fin: string }>
        const fecha_inicio = fechas.reduce<string | null>(
            (min, f) => (!min || f.fecha_inicio < min ? f.fecha_inicio : min), null,
        )
        const fecha_fin = fechas.reduce<string | null>(
            (max, f) => (!max || f.fecha_fin > max ? f.fecha_fin : max), null,
        )
        const norm = (v: unknown) => Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
        return {
            id: r.id,
            codigo: r.codigo,
            titulo: r.titulo,
            fecha_inicio,
            fecha_fin,
            cliente: norm(r.cliente),
            sitio: norm(r.sitio),
            recursos: (r.recursos ?? []).map((rec: any) => ({
                tipo_recurso: rec.tipo_recurso,
                personal: norm(rec.personal),
                maquinaria: norm(rec.maquinaria),
            })),
        }
    })
}
```

Note: if `lib/actions/tareas.ts` doesn't already import `getSupabaseContext`, add:
```typescript
import { getSupabaseContext } from '@/lib/action-context'
```

- [ ] **Step 2: Verificar TypeScript**
```
npx tsc --noEmit
```

- [ ] **Step 3: Commit**
```bash
git add lib/actions/tareas.ts
git commit -m "feat(tareas): searchTareasConFiltros con filtros cliente y fecha"
```

---

## Task 2: `SeleccionarTareaDialog` component

**Files:**
- Create: `components/shared/seleccionar-tarea-dialog.tsx`

- [ ] **Step 1: Crear el directorio y el componente**

```typescript
'use client'

import * as React from 'react'
import { Building2, Calendar, MapPin, Users, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { searchTareasConFiltros, type TareaConRecursos } from '@/lib/actions/tareas'
import { getTercerosForSelect } from '@/lib/actions/terceros'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (tarea: TareaConRecursos) => void
    title?: string
}

export function SeleccionarTareaDialog({ open, onOpenChange, onSelect, title = 'Seleccionar tarea' }: Props) {
    const [clientes, setClientes] = React.useState<{ value: string; label: string }[]>([])
    const [clienteId, setClienteId] = React.useState('')
    const [fecha, setFecha] = React.useState('')
    const [tareas, setTareas] = React.useState<TareaConRecursos[]>([])
    const [loading, setLoading] = React.useState(false)

    const fetchTareas = React.useCallback(async (cId: string, f: string) => {
        setLoading(true)
        const result = await searchTareasConFiltros(cId || null, f || null)
        setTareas(result)
        setLoading(false)
    }, [])

    React.useEffect(() => {
        if (!open) return
        getTercerosForSelect().then(data =>
            setClientes(data.map(c => ({ value: c.id, label: c.razon_social })))
        )
        fetchTareas('', '')
    }, [open, fetchTareas])

    const handleClienteChange = (val: string) => {
        setClienteId(val)
        fetchTareas(val, fecha)
    }

    const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFecha(e.target.value)
        fetchTareas(clienteId, e.target.value)
    }

    const handleSelect = (tarea: TareaConRecursos) => {
        onSelect(tarea)
        onOpenChange(false)
    }

    const reset = () => { setClienteId(''); setFecha(''); setTareas([]) }

    const fmt = (s: string | null) =>
        s ? new Date(s + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : null

    return (
        <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset() }}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="flex gap-3 pt-1">
                    <div className="flex-1 space-y-1">
                        <Label className="text-xs">Cliente</Label>
                        <SearchableSelect
                            options={clientes}
                            value={clienteId}
                            onChange={handleClienteChange}
                            placeholder="Todos los clientes"
                            searchPlaceholder="Buscar cliente…"
                            emptyText="Sin resultados"
                        />
                    </div>
                    <div className="w-44 space-y-1">
                        <Label className="text-xs">Fecha</Label>
                        <Input type="date" value={fecha} onChange={handleFechaChange} className="h-9" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md mt-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Cargando tareas…
                        </div>
                    ) : tareas.length === 0 ? (
                        <p className="text-center py-12 text-muted-foreground text-sm">
                            No hay tareas con esos filtros.
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {tareas.map(t => {
                                const personal = t.recursos
                                    .filter(r => r.tipo_recurso === 'PERSONAL' && r.personal)
                                    .map(r => `${r.personal!.first_name ?? ''} ${r.personal!.last_name ?? ''}`.trim())
                                const maquinas = t.recursos
                                    .filter(r => r.tipo_recurso === 'MAQUINARIA' && r.maquinaria)
                                    .map(r => r.maquinaria!.codigo_interno ?? r.maquinaria!.nombre ?? '')
                                const recursos = [...personal, ...maquinas]
                                return (
                                    <li key={t.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(t)}
                                            className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                                                    {t.codigo}
                                                </span>
                                                <span className="text-sm font-medium truncate">{t.titulo}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                                                {t.cliente?.razon_social && (
                                                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{t.cliente.razon_social}</span>
                                                )}
                                                {t.sitio?.nombre && (
                                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.sitio.nombre}</span>
                                                )}
                                                {(t.fecha_inicio || t.fecha_fin) && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {fmt(t.fecha_inicio)}{t.fecha_fin && ` → ${fmt(t.fecha_fin)}`}
                                                    </span>
                                                )}
                                                {recursos.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />{recursos.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
```

- [ ] **Step 2: Verificar TypeScript**
```
npx tsc --noEmit
```

- [ ] **Step 3: Commit**
```bash
git add components/shared/seleccionar-tarea-dialog.tsx
git commit -m "feat(shared): SeleccionarTareaDialog con filtros cliente y fecha"
```

---

## Task 3: Actualizar `lib/actions/reportes.ts` — retornar ID + update + getById

**Files:**
- Modify: `lib/actions/reportes.ts`

- [ ] **Step 1: Modificar `createReporteMaquinaria` para retornar el ID y revalidar**

Reemplazar:
```typescript
    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Reporte de maquinaria guardado' }
```
con:
```typescript
    if (error) return { success: false, message: error.message, id: null }
    safeRevalidatePath('/informes/maquinaria')
    return { success: true, message: 'Reporte de maquinaria guardado', id: (insertResult.data?.[0]?.id ?? null) as string | null }
```

Y cambiar la línea del insert para capturar data:
```typescript
    const { error, data: insertResult } = await adminClient
        .from('reportes_maquinaria')
        .insert({ ...data, tenant_id: tenantId, created_by: user.id })
        .select('id')
```

- [ ] **Step 2: Modificar `createReportePersonal` de la misma forma**

Cambiar el insert:
```typescript
    const { error, data: insertResult } = await adminClient
        .from('reportes_personal')
        .insert({ ...data, tenant_id: tenantId, created_by: user.id })
        .select('id')
```

Reemplazar el return:
```typescript
    if (error) return { success: false, message: error.message, id: null }
    safeRevalidatePath('/informes/personal')
    return { success: true, message: 'Reporte de personal guardado', id: (insertResult?.[0]?.id ?? null) as string | null }
```

- [ ] **Step 3: Modificar `createReporteCombustible` de la misma forma**

Cambiar el insert:
```typescript
    const { error, data: insertResult } = await adminClient
        .from('reportes_combustible')
        .insert({ ...data, tenant_id: tenantId, created_by: user.id })
        .select('id')
```

Return:
```typescript
    if (error) return { success: false, message: error.message, id: null }
    safeRevalidatePath('/informes/gastos')
    return { success: true, message: 'Reporte de combustible guardado', id: (insertResult?.[0]?.id ?? null) as string | null }
```

- [ ] **Step 4: Agregar funciones getById y update al final del archivo**

```typescript
// --- GETBYID + UPDATE ---

export async function getReporteMaquinariaById(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null
    const { data } = await adminClient
        .from('reportes_maquinaria').select('*').eq('id', id).eq('tenant_id', tenantId).single()
    return data ?? null
}

export async function updateReporteMaquinaria(id: string, payload: Record<string, unknown>) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado', id: null }
    const { error } = await adminClient
        .from('reportes_maquinaria')
        .update(payload)
        .eq('id', id).eq('tenant_id', tenantId)
    if (error) return { success: false, message: error.message, id: null }
    safeRevalidatePath('/informes/maquinaria')
    return { success: true, message: 'Reporte actualizado', id }
}

export async function getReportePersonalById(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null
    const { data } = await adminClient
        .from('reportes_personal').select('*').eq('id', id).eq('tenant_id', tenantId).single()
    return data ?? null
}

export async function updateReportePersonal(id: string, payload: Record<string, unknown>) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado', id: null }
    const { error } = await adminClient
        .from('reportes_personal')
        .update(payload)
        .eq('id', id).eq('tenant_id', tenantId)
    if (error) return { success: false, message: error.message, id: null }
    safeRevalidatePath('/informes/personal')
    return { success: true, message: 'Reporte actualizado', id }
}

export async function getReporteCombustibleById(id: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null
    const { data } = await adminClient
        .from('reportes_combustible').select('*').eq('id', id).eq('tenant_id', tenantId).single()
    return data ?? null
}

export async function updateReporteCombustible(id: string, payload: Record<string, unknown>) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado', id: null }
    const { error } = await adminClient
        .from('reportes_combustible')
        .update(payload)
        .eq('id', id).eq('tenant_id', tenantId)
    if (error) return { success: false, message: error.message, id: null }
    safeRevalidatePath('/informes/gastos')
    return { success: true, message: 'Reporte actualizado', id }
}
```

- [ ] **Step 5: Verificar TypeScript**
```
npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add lib/actions/reportes.ts
git commit -m "feat(reportes): retornar id en creates, add update + getById actions"
```

---

## Task 4: R. Maquinaria — edit mode en form + dialog + section + page

**Files:**
- Modify: `components/reportes/reporte-maquinaria-form.tsx`
- Create: `components/reportes/reporte-maquinaria-dialog.tsx`
- Create: `components/reportes/reportes-maquinaria-section.tsx`
- Modify: `app/(dashboard)/informes/maquinaria/page.tsx`

- [ ] **Step 1: Modificar `reporte-maquinaria-form.tsx` — soporte edit mode**

**Cambio 1** — línea 14, agregar import:
```typescript
import { createReporteMaquinaria, updateReporteMaquinaria } from "@/lib/actions/reportes"
```

**Cambio 2** — reemplazar la `Props` interface (líneas 80-87):
```typescript
interface Props {
    tareaId: string
    maquinariaList: MaquinariaOption[]
    personalList: PersonalOption[]
    config: ConfigInformeMaquinaria | null
    reporteId?: string
    initialData?: Partial<FormValues>
    onSuccess: (id: string) => void
    onCancel: () => void
}
```

**Cambio 3** — actualizar la firma de la función (línea 89):
```typescript
export function ReporteMaquinariaForm({ tareaId, maquinariaList, personalList, config, reporteId, initialData, onSuccess, onCancel }: Props) {
```

**Cambio 4** — en `useForm(...)` (línea 103), agregar `defaultValues` dinámicos. Reemplazar:
```typescript
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            maquinaria_id: "",
            operador_id: "",
```
con:
```typescript
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: initialData ?? {
            maquinaria_id: "",
            operador_id: "",
```
(el resto del objeto defaultValues no cambia, solo se envuelve en `initialData ?? { ... }`)

**Cambio 5** — en `onSubmit`, reemplazar (línea 204):
```typescript
            const res = await createReporteMaquinaria(payload)
            if (res.success) {
                toast.success("Reporte maquinaria guardado")
                onSuccess()
```
con:
```typescript
            const res = reporteId
                ? await updateReporteMaquinaria(reporteId, { ...payload, tarea_id: undefined })
                : await createReporteMaquinaria(payload)
            if (res.success) {
                toast.success(res.message)
                onSuccess(res.id ?? reporteId ?? '')
```

- [ ] **Step 2: Crear `components/reportes/reporte-maquinaria-dialog.tsx`**

```typescript
'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReporteMaquinariaForm } from './reporte-maquinaria-form'
import { getMaquinarias } from '@/lib/actions/maquinarias'
import { getProfiles } from '@/lib/actions/users'
import { getConfigInformeMaquinaria } from '@/lib/actions/informes-config'
import { getReporteMaquinariaById } from '@/lib/actions/reportes'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    tareaId?: string
    reporteId?: string
    onSuccess: () => void
}

export function ReporteMaquinariaDialog({ open, onOpenChange, tareaId, reporteId, onSuccess }: Props) {
    const [loading, setLoading] = React.useState(false)
    const [maquinariaList, setMaquinariaList] = React.useState<any[]>([])
    const [personalList, setPersonalList] = React.useState<any[]>([])
    const [config, setConfig] = React.useState<any>(null)
    const [initialData, setInitialData] = React.useState<any>(undefined)
    const [resolvedTareaId, setResolvedTareaId] = React.useState('')

    React.useEffect(() => {
        if (!open) return
        setLoading(true)
        ;(async () => {
            const [maq, perfiles, cfg] = await Promise.all([
                getMaquinarias(),
                getProfiles(),
                getConfigInformeMaquinaria(),
            ])
            setMaquinariaList(maq.map((m: any) => ({ id: m.id, nombre: m.nombre, codigo_interno: m.codigo_interno })))
            setPersonalList(perfiles.map((p: any) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name })))
            setConfig(cfg)

            if (reporteId) {
                const r = await getReporteMaquinariaById(reporteId)
                if (r) {
                    setResolvedTareaId(r.tarea_id ?? '')
                    setInitialData({
                        maquinaria_id: r.maquinaria_id ?? '',
                        operador_id: r.operador_id ?? '',
                        rigger1_id: r.rigger1_id ?? '',
                        rigger2_id: r.rigger2_id ?? '',
                        fecha_reporte: r.fecha_reporte ?? '',
                        tipo_uso: r.tipo_uso ?? 'OPERACION',
                        horas_alquiler: r.horas_alquiler != null ? String(r.horas_alquiler) : '',
                        jornada1_inicio: r.jornada1_inicio ? r.jornada1_inicio.substring(11, 16) : '',
                        jornada1_fin: r.jornada1_fin ? r.jornada1_fin.substring(11, 16) : '',
                        jornada2_inicio: r.jornada2_inicio ? r.jornada2_inicio.substring(11, 16) : '',
                        jornada2_fin: r.jornada2_fin ? r.jornada2_fin.substring(11, 16) : '',
                        jornada3_inicio: r.jornada3_inicio ? r.jornada3_inicio.substring(11, 16) : '',
                        jornada3_fin: r.jornada3_fin ? r.jornada3_fin.substring(11, 16) : '',
                        total_horas: r.total_horas != null ? String(r.total_horas) : '0',
                        horas_recorrido: r.horas_recorrido != null ? String(r.horas_recorrido) : '0',
                        tipo_recorrido: r.tipo_recorrido ?? 'NO_APLICA',
                        tonelaje_solicitado: r.tonelaje_solicitado != null ? String(r.tonelaje_solicitado) : '',
                        salida_autorizada_por: r.salida_autorizada_por ?? '',
                        nombre_cliente_firmante: r.nombre_cliente_firmante ?? '',
                        cargo_cliente_firmante: r.cargo_cliente_firmante ?? '',
                        trabajo_realizado: r.trabajo_realizado ?? '',
                    })
                }
            } else {
                setResolvedTareaId(tareaId ?? '')
                setInitialData(undefined)
            }
            setLoading(false)
        })()
    }, [open, tareaId, reporteId])

    // Disparar generación de PDF en segundo plano tras guardar
    const handleSuccess = async (id: string) => {
        onOpenChange(false)
        onSuccess()
        if (id) {
            fetch(`/api/reportes-maquinaria/${id}/pdf`).catch(() => {/* fire-and-forget */})
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{reporteId ? 'Editar reporte de maquinaria' : 'Nuevo reporte de maquinaria'}</DialogTitle>
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
                    </div>
                ) : resolvedTareaId ? (
                    <ReporteMaquinariaForm
                        tareaId={resolvedTareaId}
                        maquinariaList={maquinariaList}
                        personalList={personalList}
                        config={config}
                        reporteId={reporteId}
                        initialData={initialData}
                        onSuccess={handleSuccess}
                        onCancel={() => onOpenChange(false)}
                    />
                ) : (
                    <p className="py-8 text-center text-muted-foreground text-sm">No se pudo cargar la tarea.</p>
                )}
            </DialogContent>
        </Dialog>
    )
}
```

- [ ] **Step 3: Crear `components/reportes/reportes-maquinaria-section.tsx`**

```typescript
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, FileDown, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SeleccionarTareaDialog } from '@/components/shared/seleccionar-tarea-dialog'
import { ReporteMaquinariaDialog } from './reporte-maquinaria-dialog'
import type { TareaConRecursos } from '@/lib/actions/tareas'

type Reporte = {
    id: string; fecha_reporte: string | null; id_documento_interno: string | null
    total_horas: number | null; pdf_url: string | null
    tarea: { codigo: string; titulo: string } | null
    maquinaria: { nombre: string; codigo_interno: string } | null
    operador: { first_name: string; last_name: string } | null
}

export function ReportesMaquinariaSection({ reportes }: { reportes: Reporte[] }) {
    const router = useRouter()
    const [selectOpen, setSelectOpen] = React.useState(false)
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [tareaId, setTareaId] = React.useState<string>()
    const [editId, setEditId] = React.useState<string>()

    const openNuevo = () => setSelectOpen(true)
    const onTareaSelect = (t: TareaConRecursos) => { setEditId(undefined); setTareaId(t.id); setDialogOpen(true) }
    const openEdit = (id: string) => { setTareaId(undefined); setEditId(id); setDialogOpen(true) }
    const onSuccess = () => router.refresh()

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Reportes de Maquinaria</h1>
                    <p className="text-sm text-muted-foreground">{reportes.length} registros</p>
                </div>
                <Button onClick={openNuevo} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo reporte
                </Button>
            </div>

            <div className="rounded-lg border bg-background overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Documento</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Equipo</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Operador</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarea</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Horas</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reportes.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No hay reportes.</td></tr>
                        )}
                        {reportes.map(r => (
                            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs">{r.fecha_reporte}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{r.id_documento_interno || '—'}</td>
                                <td className="px-4 py-3">
                                    {r.maquinaria ? <div><div className="font-medium">{r.maquinaria.nombre}</div><div className="text-xs text-muted-foreground">{r.maquinaria.codigo_interno}</div></div> : '—'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {r.operador ? `${r.operador.first_name} ${r.operador.last_name}` : '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {r.tarea ? <div><Badge variant="outline" className="font-mono text-xs">{r.tarea.codigo}</Badge><div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{r.tarea.titulo}</div></div> : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{r.total_horas ? `${r.total_horas}h` : '—'}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-1">
                                        {r.pdf_url && (
                                            <Link href={`/api/reportes-maquinaria/${r.id}/pdf`} target="_blank"
                                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                                <FileDown className="h-3.5 w-3.5" />PDF
                                            </Link>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(r.id)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SeleccionarTareaDialog open={selectOpen} onOpenChange={setSelectOpen} onSelect={onTareaSelect} title="Seleccionar tarea — R. Maquinaria" />
            <ReporteMaquinariaDialog open={dialogOpen} onOpenChange={setDialogOpen} tareaId={tareaId} reporteId={editId} onSuccess={onSuccess} />
        </>
    )
}
```

- [ ] **Step 4: Reemplazar `app/(dashboard)/informes/maquinaria/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { getAllReportesMaquinaria } from '@/lib/actions/reportes'
import { ReportesMaquinariaSection } from '@/components/reportes/reportes-maquinaria-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Maquinaria — Reporta.la' }

export default async function ReportesMaquinariaPage() {
    const reportes = await getAllReportesMaquinaria()
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesMaquinariaSection reportes={reportes as any} />
        </div>
    )
}
```

- [ ] **Step 5: Verificar TypeScript**
```
npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add components/reportes/reporte-maquinaria-form.tsx components/reportes/reporte-maquinaria-dialog.tsx components/reportes/reportes-maquinaria-section.tsx app/(dashboard)/informes/maquinaria/page.tsx
git commit -m "feat(maquinaria): Nuevo + Editar desde listado, PDF auto-generado"
```

---

## Task 5: R. Personal — edit mode + dialog + section + page

**Files:**
- Modify: `components/reportes/reporte-personal-form.tsx`
- Create: `components/reportes/reporte-personal-dialog.tsx`
- Create: `components/reportes/reportes-personal-section.tsx`
- Modify: `app/(dashboard)/informes/personal/page.tsx`

- [ ] **Step 1: Modificar `reporte-personal-form.tsx` — soporte edit mode**

**Cambio 1** — línea 20, agregar import:
```typescript
import { createReportePersonal, updateReportePersonal } from "@/lib/actions/reportes"
```

**Cambio 2** — reemplazar `Props` interface (línea 64):
```typescript
interface Props {
    tareaId: string
    personalList: PersonalOption[]
    terceroPersonalList: TerceroPersonalOption[]
    config: ConfigInformePersonal | null
    reporteId?: string
    initialData?: Partial<FormValues>
    onSuccess: (id: string) => void
    onCancel: () => void
}
```

**Cambio 3** — actualizar función (línea 76):
```typescript
export function ReportePersonalForm({ tareaId, personalList, terceroPersonalList, config, reporteId, initialData, onSuccess, onCancel }: Props) {
```

**Cambio 4** — en `useForm` (línea 93), envolver `defaultValues` en `initialData ??`:
```typescript
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: initialData ?? {
            personal_id: "",
            // ... resto sin cambio
```

**Cambio 5** — en `onSubmit` (línea 243), reemplazar:
```typescript
            const res = await createReportePersonal(payload)
            if (res.success) {
                toast.success("Reporte de personal guardado")
                onSuccess()
```
con:
```typescript
            const res = reporteId
                ? await updateReportePersonal(reporteId, { ...payload, tarea_id: undefined })
                : await createReportePersonal(payload)
            if (res.success) {
                toast.success(res.message)
                onSuccess(res.id ?? reporteId ?? '')
```

- [ ] **Step 2: Crear `components/reportes/reporte-personal-dialog.tsx`**

```typescript
'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReportePersonalForm } from './reporte-personal-form'
import { getProfiles } from '@/lib/actions/users'
import { getConfigInformePersonal } from '@/lib/actions/informes-config'
import { getReportePersonalById, getTerceroPersonalList } from '@/lib/actions/reportes'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    tareaId?: string
    reporteId?: string
    onSuccess: () => void
}

export function ReportePersonalDialog({ open, onOpenChange, tareaId, reporteId, onSuccess }: Props) {
    const [loading, setLoading] = React.useState(false)
    const [personalList, setPersonalList] = React.useState<any[]>([])
    const [terceroPersonalList, setTerceroPersonalList] = React.useState<any[]>([])
    const [config, setConfig] = React.useState<any>(null)
    const [initialData, setInitialData] = React.useState<any>(undefined)
    const [resolvedTareaId, setResolvedTareaId] = React.useState('')

    React.useEffect(() => {
        if (!open) return
        setLoading(true)
        ;(async () => {
            const [perfiles, terceros, cfg] = await Promise.all([
                getProfiles(),
                getTerceroPersonalList(),
                getConfigInformePersonal(),
            ])
            setPersonalList(perfiles.map((p: any) => ({ id: p.id, first_name: p.first_name, last_name: p.last_name })))
            setTerceroPersonalList(terceros)
            setConfig(cfg)

            if (reporteId) {
                const r = await getReportePersonalById(reporteId)
                if (r) {
                    setResolvedTareaId(r.tarea_id ?? '')
                    setInitialData({
                        tipo_personal: r.tipo_personal ?? 'INTERNO',
                        personal_id: r.personal_id ?? '',
                        tercero_personal_id: r.tercero_personal_id ?? '',
                        fecha_reporte: r.fecha_reporte ?? '',
                        jornada1_inicio: r.jornada1_inicio ? r.jornada1_inicio.substring(11, 16) : '',
                        jornada1_fin: r.jornada1_fin ? r.jornada1_fin.substring(11, 16) : '',
                        jornada2_inicio: r.jornada2_inicio ? r.jornada2_inicio.substring(11, 16) : '',
                        jornada2_fin: r.jornada2_fin ? r.jornada2_fin.substring(11, 16) : '',
                        jornada3_inicio: r.jornada3_inicio ? r.jornada3_inicio.substring(11, 16) : '',
                        jornada3_fin: r.jornada3_fin ? r.jornada3_fin.substring(11, 16) : '',
                        total_horas: r.total_horas != null ? String(r.total_horas) : '0',
                        horas_extras: r.horas_extras != null ? String(r.horas_extras) : '0',
                        horas_extras_extraordinarias: r.horas_extras_extraordinarias != null ? String(r.horas_extras_extraordinarias) : '0',
                        horas_dominicales: r.horas_dominicales != null ? String(r.horas_dominicales) : '0',
                        tiene_descanso_compensatorio: r.tiene_descanso_compensatorio ?? false,
                        fecha_descanso_compensatorio: r.fecha_descanso_compensatorio ?? '',
                        gasto_desayuno: r.gasto_desayuno != null ? String(r.gasto_desayuno) : '0',
                        gasto_almuerzo: r.gasto_almuerzo != null ? String(r.gasto_almuerzo) : '0',
                        gasto_cena: r.gasto_cena != null ? String(r.gasto_cena) : '0',
                        gasto_movilidad: r.gasto_movilidad != null ? String(r.gasto_movilidad) : '0',
                        trabajo_realizado: r.trabajo_realizado ?? '',
                        nombre_cliente_firmante: r.nombre_cliente_firmante ?? '',
                        cargo_cliente_firmante: r.cargo_cliente_firmante ?? '',
                    })
                }
            } else {
                setResolvedTareaId(tareaId ?? '')
                setInitialData(undefined)
            }
            setLoading(false)
        })()
    }, [open, tareaId, reporteId])

    const handleSuccess = async (id: string) => {
        onOpenChange(false)
        onSuccess()
        if (id) {
            fetch(`/api/reportes-personal/${id}/pdf`).catch(() => {/* fire-and-forget */})
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{reporteId ? 'Editar reporte de personal' : 'Nuevo reporte de personal'}</DialogTitle>
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
                    </div>
                ) : resolvedTareaId ? (
                    <ReportePersonalForm
                        tareaId={resolvedTareaId}
                        personalList={personalList}
                        terceroPersonalList={terceroPersonalList}
                        config={config}
                        reporteId={reporteId}
                        initialData={initialData}
                        onSuccess={handleSuccess}
                        onCancel={() => onOpenChange(false)}
                    />
                ) : (
                    <p className="py-8 text-center text-muted-foreground text-sm">No se pudo cargar la tarea.</p>
                )}
            </DialogContent>
        </Dialog>
    )
}
```

- [ ] **Step 3: Crear `components/reportes/reportes-personal-section.tsx`**

```typescript
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, FileDown, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SeleccionarTareaDialog } from '@/components/shared/seleccionar-tarea-dialog'
import { ReportePersonalDialog } from './reporte-personal-dialog'
import type { TareaConRecursos } from '@/lib/actions/tareas'

type Reporte = {
    id: string; fecha_reporte: string | null; id_documento_interno: string | null
    total_horas: number | null; gasto_total: number | null; pdf_url: string | null; tipo_personal: string | null
    tarea: { codigo: string; titulo: string } | null
    personal: { first_name: string; last_name: string } | null
    tercero_personal: { nombres: string; apellidos: string; cargo: string | null } | null
}

export function ReportesPersonalSection({ reportes }: { reportes: Reporte[] }) {
    const router = useRouter()
    const [selectOpen, setSelectOpen] = React.useState(false)
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [tareaId, setTareaId] = React.useState<string>()
    const [editId, setEditId] = React.useState<string>()

    const openNuevo = () => setSelectOpen(true)
    const onTareaSelect = (t: TareaConRecursos) => { setEditId(undefined); setTareaId(t.id); setDialogOpen(true) }
    const openEdit = (id: string) => { setTareaId(undefined); setEditId(id); setDialogOpen(true) }
    const onSuccess = () => router.refresh()

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Reportes de Personal</h1>
                    <p className="text-sm text-muted-foreground">{reportes.length} registros</p>
                </div>
                <Button onClick={openNuevo} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo reporte
                </Button>
            </div>

            <div className="rounded-lg border bg-background overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Documento</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Personal</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarea</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Horas</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gasto Total</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reportes.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No hay reportes.</td></tr>
                        )}
                        {reportes.map(r => {
                            const nombre = r.tipo_personal === 'EXTERNO' && r.tercero_personal
                                ? `${r.tercero_personal.nombres} ${r.tercero_personal.apellidos}`
                                : r.personal ? `${r.personal.first_name} ${r.personal.last_name}` : '—'
                            return (
                                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs">{r.fecha_reporte}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.id_documento_interno || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{nombre}</div>
                                        {r.tipo_personal === 'EXTERNO' && r.tercero_personal?.cargo && (
                                            <div className="text-xs text-muted-foreground">{r.tercero_personal.cargo}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {r.tarea ? <div><Badge variant="outline" className="font-mono text-xs">{r.tarea.codigo}</Badge><div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{r.tarea.titulo}</div></div> : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">{r.total_horas ? `${r.total_horas}h` : '—'}</td>
                                    <td className="px-4 py-3 text-right">{r.gasto_total ? `S/ ${Number(r.gasto_total).toFixed(2)}` : '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            {r.pdf_url && (
                                                <Link href={`/api/reportes-personal/${r.id}/pdf`} target="_blank"
                                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                                    <FileDown className="h-3.5 w-3.5" />PDF
                                                </Link>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(r.id)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <SeleccionarTareaDialog open={selectOpen} onOpenChange={setSelectOpen} onSelect={onTareaSelect} title="Seleccionar tarea — R. Personal" />
            <ReportePersonalDialog open={dialogOpen} onOpenChange={setDialogOpen} tareaId={tareaId} reporteId={editId} onSuccess={onSuccess} />
        </>
    )
}
```

- [ ] **Step 4: Reemplazar `app/(dashboard)/informes/personal/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { getAllReportesPersonal } from '@/lib/actions/reportes'
import { ReportesPersonalSection } from '@/components/reportes/reportes-personal-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Personal — Reporta.la' }

export default async function ReportesPersonalPage() {
    const reportes = await getAllReportesPersonal()
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesPersonalSection reportes={reportes as any} />
        </div>
    )
}
```

- [ ] **Step 5: Verificar TypeScript**
```
npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add components/reportes/reporte-personal-form.tsx components/reportes/reporte-personal-dialog.tsx components/reportes/reportes-personal-section.tsx app/(dashboard)/informes/personal/page.tsx
git commit -m "feat(personal): Nuevo + Editar desde listado, PDF auto-generado"
```

---

## Task 6: R. Gastos — form nuevo + dialog + section + page

**Files:**
- Create: `components/reportes/reporte-combustible-form.tsx`
- Create: `components/reportes/reporte-combustible-dialog.tsx`
- Create: `components/reportes/reportes-gastos-section.tsx`
- Modify: `app/(dashboard)/informes/gastos/page.tsx`

- [ ] **Step 1: Crear `components/reportes/reporte-combustible-form.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogFooter } from '@/components/ui/dialog'
import { createReporteCombustible, updateReporteCombustible } from '@/lib/actions/reportes'

const TIPOS = ['DIESEL', 'GASOLINA_90', 'GASOLINA_84', 'GAS']

const schema = z.object({
    fecha_reporte: z.string().min(1, 'Fecha requerida'),
    maquinaria_id: z.string().min(1, 'Equipo requerido'),
    tipo_combustible: z.string().min(1, 'Tipo requerido'),
    galones: z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Galones requeridos'),
    precio_unitario: z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Precio requerido'),
    proveedor_grifo: z.string().optional(),
    horometro_actual: z.string().optional(),
    kilometraje_actual: z.string().optional(),
    foto_tablero_url: z.string().optional(),
    foto_surtidor_url: z.string().optional(),
    foto_voucher_url: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
type MaquinariaOption = { id: string; nombre?: string | null; codigo_interno?: string | null }

interface Props {
    tareaId: string
    maquinariaList: MaquinariaOption[]
    reporteId?: string
    initialData?: Partial<FormValues>
    onSuccess: (id: string) => void
    onCancel: () => void
}

export function ReporteCombustibleForm({ tareaId, maquinariaList, reporteId, initialData, onSuccess, onCancel }: Props) {
    const [submitting, setSubmitting] = useState(false)

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: initialData ?? { fecha_reporte: new Date().toISOString().split('T')[0] },
    })

    const galones = parseFloat(watch('galones') ?? '0') || 0
    const precio = parseFloat(watch('precio_unitario') ?? '0') || 0
    const subtotal = galones * precio
    const igv = subtotal * 0.18
    const total = subtotal + igv

    const maqOptions = maquinariaList.map(m => ({
        value: m.id,
        label: [m.codigo_interno, m.nombre].filter(Boolean).join(' — '),
    }))

    const onSubmit = async (values: FormValues) => {
        setSubmitting(true)
        const payload = {
            tarea_id: tareaId,
            fecha_reporte: values.fecha_reporte,
            maquinaria_id: values.maquinaria_id,
            tipo_combustible: values.tipo_combustible,
            galones: parseFloat(values.galones),
            precio_unitario: parseFloat(values.precio_unitario),
            monto_subtotal: parseFloat(subtotal.toFixed(2)),
            monto_igv: parseFloat(igv.toFixed(2)),
            monto_total: parseFloat(total.toFixed(2)),
            proveedor_grifo: values.proveedor_grifo || null,
            horometro_actual: values.horometro_actual ? parseFloat(values.horometro_actual) : null,
            kilometraje_actual: values.kilometraje_actual ? parseFloat(values.kilometraje_actual) : null,
            foto_tablero_url: values.foto_tablero_url || null,
            foto_surtidor_url: values.foto_surtidor_url || null,
            foto_voucher_url: values.foto_voucher_url || null,
        }
        const result = reporteId
            ? await updateReporteCombustible(reporteId, payload)
            : await createReporteCombustible(payload)
        setSubmitting(false)
        if (result.success) {
            toast.success(result.message)
            onSuccess(result.id ?? reporteId ?? '')
        } else {
            toast.error(result.message)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="fecha_reporte">Fecha *</Label>
                    <Input id="fecha_reporte" type="date" {...register('fecha_reporte')} />
                    {errors.fecha_reporte && <p className="text-xs text-destructive">{errors.fecha_reporte.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label>Equipo *</Label>
                    <SearchableSelect options={maqOptions} value={watch('maquinaria_id') ?? ''}
                        onChange={v => setValue('maquinaria_id', v)} placeholder="Seleccionar equipo…"
                        searchPlaceholder="Buscar…" emptyText="Sin resultados" />
                    {errors.maquinaria_id && <p className="text-xs text-destructive">{errors.maquinaria_id.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label>Tipo combustible *</Label>
                    <Select value={watch('tipo_combustible') ?? ''} onValueChange={v => setValue('tipo_combustible', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                        <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                    {errors.tipo_combustible && <p className="text-xs text-destructive">{errors.tipo_combustible.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="galones">Galones *</Label>
                    <Input id="galones" type="number" step="0.01" min="0" {...register('galones')} />
                    {errors.galones && <p className="text-xs text-destructive">{errors.galones.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="precio_unitario">Precio unitario *</Label>
                    <Input id="precio_unitario" type="number" step="0.01" min="0" {...register('precio_unitario')} />
                    {errors.precio_unitario && <p className="text-xs text-destructive">{errors.precio_unitario.message}</p>}
                </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground text-xs">Subtotal</span><p className="font-medium">S/ {subtotal.toFixed(2)}</p></div>
                <div><span className="text-muted-foreground text-xs">IGV (18%)</span><p className="font-medium">S/ {igv.toFixed(2)}</p></div>
                <div><span className="text-muted-foreground text-xs">Total</span><p className="font-semibold text-base">S/ {total.toFixed(2)}</p></div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="proveedor_grifo">Proveedor / Grifo</Label>
                <Input id="proveedor_grifo" {...register('proveedor_grifo')} placeholder="Nombre del grifo" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="horometro_actual">Horómetro actual</Label>
                    <Input id="horometro_actual" type="number" step="0.1" min="0" {...register('horometro_actual')} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="kilometraje_actual">Kilometraje actual</Label>
                    <Input id="kilometraje_actual" type="number" step="1" min="0" {...register('kilometraje_actual')} />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="foto_tablero_url">URL foto tablero</Label>
                    <Input id="foto_tablero_url" {...register('foto_tablero_url')} placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="foto_surtidor_url">URL foto surtidor</Label>
                    <Input id="foto_surtidor_url" {...register('foto_surtidor_url')} placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="foto_voucher_url">URL foto voucher</Label>
                    <Input id="foto_voucher_url" {...register('foto_voucher_url')} placeholder="https://…" />
                </div>
            </div>

            <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitting ? 'Guardando…' : reporteId ? 'Guardar cambios' : 'Crear reporte'}
                </Button>
            </DialogFooter>
        </form>
    )
}
```

- [ ] **Step 2: Crear `components/reportes/reporte-combustible-dialog.tsx`**

```typescript
'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReporteCombustibleForm } from './reporte-combustible-form'
import { getMaquinarias } from '@/lib/actions/maquinarias'
import { getReporteCombustibleById } from '@/lib/actions/reportes'

type Props = {
    open: boolean; onOpenChange: (open: boolean) => void
    tareaId?: string; reporteId?: string; onSuccess: () => void
}

export function ReporteCombustibleDialog({ open, onOpenChange, tareaId, reporteId, onSuccess }: Props) {
    const [loading, setLoading] = React.useState(false)
    const [maquinariaList, setMaquinariaList] = React.useState<any[]>([])
    const [initialData, setInitialData] = React.useState<any>(undefined)
    const [resolvedTareaId, setResolvedTareaId] = React.useState('')

    React.useEffect(() => {
        if (!open) return
        setLoading(true)
        ;(async () => {
            const maq = await getMaquinarias()
            setMaquinariaList(maq.map((m: any) => ({ id: m.id, nombre: m.nombre, codigo_interno: m.codigo_interno })))
            if (reporteId) {
                const r = await getReporteCombustibleById(reporteId)
                if (r) {
                    setResolvedTareaId(r.tarea_id ?? '')
                    setInitialData({
                        fecha_reporte: r.fecha_reporte ?? '',
                        maquinaria_id: r.maquinaria_id ?? '',
                        tipo_combustible: r.tipo_combustible ?? '',
                        galones: r.galones != null ? String(r.galones) : '',
                        precio_unitario: r.precio_unitario != null ? String(r.precio_unitario) : '',
                        proveedor_grifo: r.proveedor_grifo ?? '',
                        horometro_actual: r.horometro_actual != null ? String(r.horometro_actual) : '',
                        kilometraje_actual: r.kilometraje_actual != null ? String(r.kilometraje_actual) : '',
                        foto_tablero_url: r.foto_tablero_url ?? '',
                        foto_surtidor_url: r.foto_surtidor_url ?? '',
                        foto_voucher_url: r.foto_voucher_url ?? '',
                    })
                }
            } else {
                setResolvedTareaId(tareaId ?? '')
                setInitialData(undefined)
            }
            setLoading(false)
        })()
    }, [open, tareaId, reporteId])

    const handleSuccess = () => { onOpenChange(false); onSuccess() }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{reporteId ? 'Editar reporte de combustible' : 'Nuevo reporte de combustible'}</DialogTitle>
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
                    </div>
                ) : resolvedTareaId ? (
                    <ReporteCombustibleForm tareaId={resolvedTareaId} maquinariaList={maquinariaList}
                        reporteId={reporteId} initialData={initialData}
                        onSuccess={handleSuccess} onCancel={() => onOpenChange(false)} />
                ) : (
                    <p className="py-8 text-center text-muted-foreground text-sm">No se pudo cargar la tarea.</p>
                )}
            </DialogContent>
        </Dialog>
    )
}
```

- [ ] **Step 3: Crear `components/reportes/reportes-gastos-section.tsx`**

```typescript
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SeleccionarTareaDialog } from '@/components/shared/seleccionar-tarea-dialog'
import { ReporteCombustibleDialog } from './reporte-combustible-dialog'
import type { TareaConRecursos } from '@/lib/actions/tareas'

type Reporte = {
    id: string; fecha_reporte: string | null; galones: number | null
    tipo_combustible: string | null; monto_total: number | null
    tarea: { codigo: string; titulo: string } | null
    maquinaria: { nombre: string; codigo_interno: string } | null
}

export function ReportesGastosSection({ reportes }: { reportes: Reporte[] }) {
    const router = useRouter()
    const [selectOpen, setSelectOpen] = React.useState(false)
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [tareaId, setTareaId] = React.useState<string>()
    const [editId, setEditId] = React.useState<string>()

    const openNuevo = () => setSelectOpen(true)
    const onTareaSelect = (t: TareaConRecursos) => { setEditId(undefined); setTareaId(t.id); setDialogOpen(true) }
    const openEdit = (id: string) => { setTareaId(undefined); setEditId(id); setDialogOpen(true) }
    const onSuccess = () => router.refresh()

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Reportes de Gastos</h1>
                    <p className="text-sm text-muted-foreground">{reportes.length} registros</p>
                </div>
                <Button onClick={openNuevo} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo reporte
                </Button>
            </div>

            <div className="rounded-lg border bg-background overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Equipo</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Combustible</th>
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarea</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Galones</th>
                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {reportes.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No hay reportes.</td></tr>
                        )}
                        {reportes.map(r => (
                            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs">{r.fecha_reporte}</td>
                                <td className="px-4 py-3">
                                    {r.maquinaria ? <div><div className="font-medium">{r.maquinaria.nombre}</div><div className="text-xs text-muted-foreground">{r.maquinaria.codigo_interno}</div></div> : '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {r.tipo_combustible ? <Badge variant="secondary" className="text-xs">{r.tipo_combustible}</Badge> : '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {r.tarea ? <div><Badge variant="outline" className="font-mono text-xs">{r.tarea.codigo}</Badge><div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{r.tarea.titulo}</div></div> : '—'}
                                </td>
                                <td className="px-4 py-3 text-right">{r.galones ? `${r.galones} gal` : '—'}</td>
                                <td className="px-4 py-3 text-right font-medium">{r.monto_total ? `S/ ${Number(r.monto_total).toFixed(2)}` : '—'}</td>
                                <td className="px-4 py-3 text-right">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(r.id)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SeleccionarTareaDialog open={selectOpen} onOpenChange={setSelectOpen} onSelect={onTareaSelect} title="Seleccionar tarea — R. Gastos" />
            <ReporteCombustibleDialog open={dialogOpen} onOpenChange={setDialogOpen} tareaId={tareaId} reporteId={editId} onSuccess={onSuccess} />
        </>
    )
}
```

- [ ] **Step 4: Reemplazar `app/(dashboard)/informes/gastos/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { getAllReportesGastos } from '@/lib/actions/reportes'
import { ReportesGastosSection } from '@/components/reportes/reportes-gastos-section'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'R. Gastos — Reporta.la' }

export default async function ReportesGastosPage() {
    const reportes = await getAllReportesGastos()
    return (
        <div className="flex flex-col gap-6 p-6">
            <ReportesGastosSection reportes={reportes as any} />
        </div>
    )
}
```

- [ ] **Step 5: Verificar TypeScript**
```
npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add components/reportes/reporte-combustible-form.tsx components/reportes/reporte-combustible-dialog.tsx components/reportes/reportes-gastos-section.tsx app/(dashboard)/informes/gastos/page.tsx
git commit -m "feat(gastos): Nuevo + Editar reporte de combustible desde listado"
```

---

## Task 7: R. Checklist — usar SeleccionarTareaDialog + botón Editar

**Files:**
- Modify: `components/informes/nuevo-informe-dialog.tsx`
- Modify: `components/informes/informes-list.tsx`

- [ ] **Step 1: Reemplazar `components/informes/nuevo-informe-dialog.tsx`**

```typescript
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, X, MapPin, Building2 } from 'lucide-react'
import { startInforme } from '@/lib/actions/formatos-informes'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SeleccionarTareaDialog } from '@/components/shared/seleccionar-tarea-dialog'
import type { TareaConRecursos } from '@/lib/actions/tareas'

type Plantilla = {
    formato_id: string; version_id: string; codigo: string; nombre: string; etiqueta_version: string | null
}

export function NuevoInformeDialog({ plantillas }: { plantillas: Plantilla[] }) {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const [formatoId, setFormatoId] = React.useState('')
    const [submitting, setSubmitting] = React.useState(false)
    const [tarea, setTarea] = React.useState<TareaConRecursos | null>(null)
    const [selectTareaOpen, setSelectTareaOpen] = React.useState(false)

    const reset = () => { setFormatoId(''); setTarea(null) }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formatoId) { toast.error('Seleccioná una plantilla'); return }
        setSubmitting(true)
        const res = await startInforme({ formato_id: formatoId, tarea_id: tarea?.id ?? null })
        setSubmitting(false)
        if (res.success) {
            setOpen(false); reset()
            router.push(`/informes/${res.id}`)
        } else {
            toast.error(res.error)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
                <DialogTrigger asChild>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="mr-2 h-4 w-4" /> Nuevo informe
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Nuevo informe</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="formato-dlg">Plantilla</Label>
                            {plantillas.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-3 border rounded-md">
                                    No hay plantillas publicadas. Andá a <a href="/formatos" className="underline">Formatos</a>.
                                </p>
                            ) : (
                                <Select value={formatoId} onValueChange={setFormatoId}>
                                    <SelectTrigger id="formato-dlg"><SelectValue placeholder="Seleccioná una plantilla…" /></SelectTrigger>
                                    <SelectContent>
                                        {plantillas.map(p => (
                                            <SelectItem key={p.formato_id} value={p.formato_id}>
                                                <span className="font-mono text-xs mr-2">{p.codigo}</span>{p.nombre}
                                                {p.etiqueta_version && <span className="text-muted-foreground ml-2 text-xs">· {p.etiqueta_version}</span>}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Tarea <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                            {tarea ? (
                                <div className="border border-orange-200 bg-orange-50 rounded-md px-3 py-2.5 text-sm space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-semibold text-orange-700 bg-white border border-orange-200 rounded px-1.5 py-0.5">{tarea.codigo}</span>
                                            <span className="font-medium">{tarea.titulo}</span>
                                        </div>
                                        <button type="button" onClick={() => setTarea(null)} className="text-muted-foreground hover:text-foreground">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {tarea.cliente?.razon_social && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{tarea.cliente.razon_social}</p>
                                    )}
                                    {tarea.sitio?.nombre && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{tarea.sitio.nombre}</p>
                                    )}
                                </div>
                            ) : (
                                <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground"
                                    onClick={() => setSelectTareaOpen(true)}>
                                    Buscar y seleccionar tarea…
                                </Button>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={submitting || !formatoId} className="bg-orange-600 hover:bg-orange-700">
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {submitting ? 'Creando…' : 'Crear y llenar'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <SeleccionarTareaDialog
                open={selectTareaOpen}
                onOpenChange={setSelectTareaOpen}
                onSelect={t => setTarea(t)}
                title="Seleccionar tarea — Checklist"
            />
        </>
    )
}
```

- [ ] **Step 2: Modificar `components/informes/informes-list.tsx` — cambiar icono Eye → Pencil**

**Cambio 1** — línea 5, reemplazar `Eye` con `Pencil` en el import:
```typescript
import { FileDown, Pencil, Search } from 'lucide-react'
```

**Cambio 2** — en la celda de acciones (línea 154-171), reemplazar:
```typescript
                                        <Button asChild variant="ghost" size="icon" title="Ver">
                                                <Link href={`/informes/${r.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            {r.estado !== 'BORRADOR' && (
                                                <Button asChild variant="ghost" size="icon" title="PDF">
```
con:
```typescript
                                        <Button asChild variant="ghost" size="icon" title="Ver / Editar">
                                                <Link href={`/informes/${r.id}`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            {r.pdf_url && (
                                                <Button asChild variant="ghost" size="icon" title="PDF">
```

(el bloque del link PDF que sigue queda igual, solo cambia la condición de `r.estado !== 'BORRADOR'` a `r.pdf_url`)

- [ ] **Step 3: Verificar TypeScript**
```
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add components/informes/nuevo-informe-dialog.tsx components/informes/informes-list.tsx
git commit -m "feat(checklist): SeleccionarTareaDialog + botón editar por fila"
```

---

## Task 8: PDF auto-generado desde la app móvil

**Contexto:** La app Flutter (reporta-app en `C:\Proyectos\reporta-app`) crea reportes directamente en Supabase. Para que los PDFs se generen y guarden automáticamente, la app debe llamar al endpoint Next.js después de cada inserción.

**Files:**
- Find: el archivo donde `reportes_maquinaria` y `reportes_personal` son insertados en reporta-app
  - Buscar en `C:\Proyectos\reporta-app\lib` por `reportes_maquinaria` y `reportes_personal`
- Modify: el servicio o repository correspondiente

- [ ] **Step 1: Localizar los servicios de creación de reportes en la app**

```bash
grep -r "reportes_maquinaria\|reportes_personal" C:/Proyectos/reporta-app/lib --include="*.dart" -l
```

- [ ] **Step 2: En cada servicio, después del insert exitoso, llamar al endpoint de PDF**

La URL base de producción de la web es `https://web.reportar.app`. Después de insertar, agregar:

```dart
// En el método que crea el reporte, después del insert exitoso:
// Disparar generación de PDF en segundo plano (fire-and-forget)
final reporteId = insertedRow['id'] as String;
unawaited(
  http.get(Uri.parse('https://web.reportar.app/api/reportes-maquinaria/$reporteId/pdf'))
      .catchError((_) {}),
);
```

Para reportes de personal:
```dart
unawaited(
  http.get(Uri.parse('https://web.reportar.app/api/reportes-personal/$reporteId/pdf'))
      .catchError((_) {}),
);
```

Importar `dart:async` para `unawaited` y `package:http/http.dart` para `http.get`.

- [ ] **Step 3: Verificar que el package `http` está en pubspec.yaml**

Si no está: agregar `http: ^1.2.0` en `dependencies` de `pubspec.yaml` y correr `flutter pub get`.

- [ ] **Step 4: Commit en reporta-app**
```bash
git add .
git commit -m "feat(reportes): trigger PDF generation after create"
```

---

## Self-review

**Spec coverage:**
- ✅ R. Checklist: Nuevo ya existía, actualizado para usar SeleccionarTareaDialog; Edit icon por fila
- ✅ R. Maquinaria: Nuevo (SeleccionarTareaDialog → dialog con form) + Edit por fila
- ✅ R. Personal: igual que Maquinaria
- ✅ R. Gastos: igual, form nuevo desde cero
- ✅ SeleccionarTareaDialog: filtro cliente + fecha; lista muestra código, sitio, recursos
- ✅ PDF auto-generado (fire-and-forget) al crear o editar maquinaria y personal desde web
- ✅ PDF auto-generado desde app móvil (Task 8)
- ✅ Edit disponible para cualquier estado (no hay restricción por estado)

**Notas:**
- `reportes_combustible` no tiene ruta PDF aún — el form guarda el reporte pero no genera PDF (se puede agregar en el futuro)
- Las fotos en el form de combustible usan campos URL (texto). La app mobile sube las fotos a Storage y guarda el URL; desde la web se puede pegar el URL manualmente o dejarlo vacío
