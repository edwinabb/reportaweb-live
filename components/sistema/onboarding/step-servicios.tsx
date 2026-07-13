'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { importServicios, type ServicioRow } from '@/lib/actions/onboarding'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type Props = {
    tenantId: string
    isTrial?: boolean
}

const COLUMNS = ['codigo', 'nombre', 'tipo_servicio', 'moneda', 'toneladas', 'precio_1_tipo', 'precio_1_valor', 'precio_2_tipo', 'precio_2_valor', 'imagen_url']

function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
        COLUMNS,
        ['SVC-001', 'Izaje 50T', 'Izaje', 'PEN', '50', 'Por hora', 500, 'Por día', 3500, 'https://ejemplo.com/imagen.jpg'],
    ])
    const wsInstr = XLSX.utils.aoa_to_sheet([
        ['Campo', 'Descripción', 'Valores permitidos'],
        ['codigo', 'Código único del servicio (se genera si vacío)', ''],
        ['nombre', 'Nombre del servicio (requerido)', ''],
        ['tipo_servicio', 'Tipo o categoría del servicio', ''],
        ['moneda', 'Moneda de facturación', 'PEN / USD'],
        ['toneladas', 'Capacidad en toneladas (opcional)', ''],
        ['precio_1_tipo', 'Descripción del primer tipo de precio', ''],
        ['precio_1_valor', 'Valor numérico del primer precio', ''],
        ['precio_2_tipo', 'Descripción del segundo tipo de precio (opcional)', ''],
        ['precio_2_valor', 'Valor numérico del segundo precio (opcional)', ''],
        ['imagen_url', 'URL pública de imagen de referencia (se descargará y subirá al sistema)', ''],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios')
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')
    XLSX.writeFile(wb, 'plantilla_servicios.xlsx')
}

type DemoServicio = { nombre: string; codigo: string | null }

export function StepServicios({ tenantId, isTrial }: Props) {
    const [isPending, startTransition] = useTransition()
    const [rows, setRows] = useState<ServicioRow[]>([])
    const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
    const [usarDemo, setUsarDemo] = useState(isTrial ?? false)
    const [demoItems, setDemoItems] = useState<DemoServicio[]>([])
    const [loadingDemo, setLoadingDemo] = useState(false)

    useEffect(() => {
        if (!isTrial) return
        setLoadingDemo(true)
        const supabase = createClient()
        supabase.from('servicios').select('nombre, codigo').eq('tenant_id', tenantId)
            .then(({ data }) => { setDemoItems(data ?? []); setLoadingDemo(false) })
    }, [isTrial, tenantId])

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = evt => {
            const data = evt.target?.result
            const wb = XLSX.read(data, { type: 'binary' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: '' })
            const parsed: ServicioRow[] = raw.map(r => ({
                codigo: String(r.codigo || '').trim() || undefined,
                nombre: String(r.nombre || ''),
                tipo_servicio: String(r.tipo_servicio || '') || undefined,
                moneda: String(r.moneda || 'PEN'),
                toneladas: String(r.toneladas || '') || undefined,
                precio_1_tipo: String(r.precio_1_tipo || '') || undefined,
                precio_1_valor: r.precio_1_valor ? Number(r.precio_1_valor) : undefined,
                precio_2_tipo: String(r.precio_2_tipo || '') || undefined,
                precio_2_valor: r.precio_2_valor ? Number(r.precio_2_valor) : undefined,
                imagen_url: String(r.imagen_url || '').trim() || undefined,
            }))
            setRows(parsed)
            setResult(null)
        }
        reader.readAsBinaryString(file)
    }

    function handleImport() {
        startTransition(async () => {
            const res = await importServicios(tenantId, rows)
            setResult({ imported: res.imported, errors: res.errors })
            if (res.success && res.imported > 0) {
                toast.success(`${res.imported} servicio(s) importado(s)`)
            } else if (res.errors.length > 0) {
                toast.error(`${res.errors.length} error(es) durante la importación`)
            }
        })
    }

    return (
        <div className="space-y-6">
            {isTrial && (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                    <p className="text-sm font-medium">¿Cómo quieres cargar tus Servicios?</p>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="svc-modo"
                                checked={usarDemo}
                                onChange={() => setUsarDemo(true)}
                                className="accent-primary"
                            />
                            <span className="text-sm">Usar datos demo (ya tenemos {demoItems.length} servicios listos)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="svc-modo"
                                checked={!usarDemo}
                                onChange={() => setUsarDemo(false)}
                                className="accent-primary"
                            />
                            <span className="text-sm">Cargar mis propios datos</span>
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        💡 Puedes editar y agregar más en cualquier momento desde Configuración → Servicios.
                    </p>
                </div>
            )}

            {isTrial && usarDemo && (
                <div className="space-y-3">
                    {loadingDemo ? (
                        <p className="text-sm text-muted-foreground">Cargando servicios demo...</p>
                    ) : demoItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay servicios demo cargados aún.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-md border text-xs">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Código</th>
                                        <th className="px-3 py-2 text-left font-medium">Nombre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {demoItems.map((item, i) => (
                                        <tr key={i} className="border-t">
                                            <td className="px-3 py-2 text-muted-foreground">{item.codigo ?? '—'}</td>
                                            <td className="px-3 py-2">{item.nombre}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <Link href={`/sistema/onboarding/${tenantId}?step=6`}>
                        <Button size="sm">Continuar →</Button>
                    </Link>
                </div>
            )}

            {(!isTrial || !usarDemo) && (<>
            <div>
                <h2 className="text-lg font-semibold mb-1">Importar servicios</h2>
                <p className="text-sm text-muted-foreground">Registra el catálogo de servicios del tenant con sus tipos de precio.</p>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" onClick={downloadTemplate} type="button">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar plantilla Excel
                </Button>
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <div className="flex items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        <Upload className="h-4 w-4" />
                        Subir archivo Excel (.xlsx)
                    </div>
                    <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={handleFile} />
                </label>
            </div>

            {rows.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-medium">{rows.length} fila(s) detectada(s). Vista previa (primeras 5):</p>
                    <div className="overflow-x-auto rounded-md border text-xs">
                        <table className="w-full min-w-max">
                            <thead className="bg-muted">
                                    <tr>{[...COLUMNS.slice(0, 9), 'imagen'].map(c => <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>)}</tr>
                            </thead>
                            <tbody>
                                {rows.slice(0, 5).map((r, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="px-3 py-2">{r.codigo}</td>
                                        <td className="px-3 py-2">{r.nombre}</td>
                                        <td className="px-3 py-2">{r.tipo_servicio}</td>
                                        <td className="px-3 py-2">{r.moneda}</td>
                                        <td className="px-3 py-2">{r.toneladas}</td>
                                        <td className="px-3 py-2">{r.precio_1_tipo}</td>
                                        <td className="px-3 py-2">{r.precio_1_valor}</td>
                                        <td className="px-3 py-2">{r.precio_2_tipo}</td>
                                        <td className="px-3 py-2">{r.precio_2_valor}</td>
                                        <td className="px-3 py-2">{r.imagen_url ? '✓' : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button onClick={handleImport} disabled={isPending}>
                        {isPending ? 'Importando...' : `Importar ${rows.length} servicio(s)`}
                    </Button>
                </div>
            )}

            {result && (
                <div className="rounded-md border p-4 space-y-2 text-sm">
                    <p className="font-medium">Resultado de la importación</p>
                    <p className="text-green-600">Importados: {result.imported}</p>
                    {result.errors.length > 0 && (
                        <details>
                            <summary className="cursor-pointer text-red-600">{result.errors.length} error(es)</summary>
                            <ul className="mt-2 space-y-1 text-xs text-red-600">
                                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                            </ul>
                        </details>
                    )}
                </div>
            )}
            </>)}
        </div>
    )
}
