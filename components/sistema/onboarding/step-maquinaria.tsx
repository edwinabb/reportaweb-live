'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { importMaquinaria, type MaquinariaRow, type DocMaquinariaRow } from '@/lib/actions/onboarding'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type Props = {
    tenantId: string
    isTrial?: boolean
}

const MAQUINARIA_COLS = ['nombre', 'placa', 'marca', 'modelo', 'tipo_equipo', 'capacidad', 'estado', 'foto_url']
const DOCUMENTOS_COLS = ['placa', 'tipo_doc', 'numero_doc', 'fecha_emision', 'fecha_vencimiento', 'archivo_url']

type ParsedResult = {
    rows: MaquinariaRow[]
    totalDocs: number
}

function downloadTemplate() {
    const wb = XLSX.utils.book_new()

    // Hoja 1: Maquinaria
    const wsMaq = XLSX.utils.aoa_to_sheet([
        MAQUINARIA_COLS,
        ['Grúa Torre 100T', 'ABC-123', 'Liebherr', 'LTM 1100', 'Grúa telescópica', '100 toneladas', 'operativo', 'https://ejemplo.com/foto.jpg'],
    ])
    XLSX.utils.book_append_sheet(wb, wsMaq, 'Maquinaria')

    // Hoja 2: Documentos
    const wsDocs = XLSX.utils.aoa_to_sheet([
        DOCUMENTOS_COLS,
        ['ABC-123', 'SOAT', 'SOAT-2024-001', '2024-01-01', '2025-01-01', 'https://ejemplo.com/soat.pdf'],
        ['ABC-123', 'Revisión técnica', 'RT-001', '2024-03-15', '2025-03-15', ''],
    ])
    XLSX.utils.book_append_sheet(wb, wsDocs, 'Documentos')

    // Hoja 3: Instrucciones
    const wsInstr = XLSX.utils.aoa_to_sheet([
        ['INSTRUCCIONES DE USO'],
        [''],
        ['Hoja "Maquinaria" — un equipo por fila'],
        ['Campo', 'Descripción', 'Valores permitidos'],
        ['nombre', 'Nombre o identificador del equipo (requerido)', ''],
        ['placa', 'Placa o código interno (clave de unión con documentos)', ''],
        ['marca', 'Marca del equipo', ''],
        ['modelo', 'Modelo del equipo', ''],
        ['tipo_equipo', 'Tipo o categoría del equipo', ''],
        ['capacidad', 'Capacidad (ej: 50 toneladas)', ''],
        ['estado', 'Estado actual', 'operativo / mantenimiento / inactivo'],
        ['foto_url', 'URL pública de la foto (se descargará y subirá al sistema)', ''],
        [''],
        ['Hoja "Documentos" — N documentos por equipo (vinculados por placa)'],
        ['placa', 'Placa del equipo al que pertenece (debe existir en hoja Maquinaria)', ''],
        ['tipo_doc', 'Nombre del tipo de documento (debe existir en la configuración)', ''],
        ['numero_doc', 'Número o código del documento', ''],
        ['fecha_emision', 'Fecha de emisión (YYYY-MM-DD)', ''],
        ['fecha_vencimiento', 'Fecha de vencimiento (YYYY-MM-DD)', ''],
        ['archivo_url', 'URL pública del archivo (se descargará y subirá al sistema)', ''],
    ])
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

    XLSX.writeFile(wb, 'plantilla_maquinaria.xlsx')
}

function parseExcel(file: File): Promise<ParsedResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = evt => {
            try {
                const data = evt.target?.result
                const wb = XLSX.read(data, { type: 'binary' })

                const wsMaq = wb.Sheets['Maquinaria'] ?? wb.Sheets[wb.SheetNames[0]]
                const maqRaw = XLSX.utils.sheet_to_json<Record<string, string>>(wsMaq, { defval: '' })

                const wsDocs = wb.Sheets['Documentos'] ?? wb.Sheets[wb.SheetNames[1]]
                const docsRaw = wsDocs
                    ? XLSX.utils.sheet_to_json<Record<string, string>>(wsDocs, { defval: '' })
                    : []

                // Agrupar documentos por placa
                const docsByPlaca: Record<string, DocMaquinariaRow[]> = {}
                for (const d of docsRaw) {
                    const placa = String(d.placa || '').trim()
                    if (!placa) continue
                    if (!docsByPlaca[placa]) docsByPlaca[placa] = []
                    docsByPlaca[placa].push({
                        placa,
                        tipo_doc: String(d.tipo_doc || '').trim(),
                        numero_doc: String(d.numero_doc || '').trim() || undefined,
                        fecha_emision: String(d.fecha_emision || '').trim() || undefined,
                        fecha_vencimiento: String(d.fecha_vencimiento || '').trim() || undefined,
                        archivo_url: String(d.archivo_url || '').trim() || undefined,
                    })
                }

                const rows: MaquinariaRow[] = maqRaw.map(r => {
                    const placa = String(r.placa || '').trim()
                    return {
                        nombre: String(r.nombre || '').trim(),
                        placa: placa || undefined,
                        marca: String(r.marca || '').trim() || undefined,
                        modelo: String(r.modelo || '').trim() || undefined,
                        tipo_equipo: String(r.tipo_equipo || '').trim() || undefined,
                        capacidad: String(r.capacidad || '').trim() || undefined,
                        estado: String(r.estado || 'operativo').trim(),
                        foto_url: String(r.foto_url || '').trim() || undefined,
                        documentos: placa ? (docsByPlaca[placa] ?? []) : [],
                    }
                })

                const totalDocs = rows.reduce((sum, r) => sum + (r.documentos?.length ?? 0), 0)
                resolve({ rows, totalDocs })
            } catch (err) {
                reject(err)
            }
        }
        reader.readAsBinaryString(file)
    })
}

type DemoMaquinaria = { nombre: string; codigo_interno: string | null }

export function StepMaquinaria({ tenantId, isTrial }: Props) {
    const [isPending, startTransition] = useTransition()
    const [parsed, setParsed] = useState<ParsedResult | null>(null)
    const [result, setResult] = useState<{ imported: number; docsImported: number; errors: string[] } | null>(null)
    const [usarDemo, setUsarDemo] = useState(isTrial ?? false)
    const [demoItems, setDemoItems] = useState<DemoMaquinaria[]>([])
    const [loadingDemo, setLoadingDemo] = useState(false)

    useEffect(() => {
        if (!isTrial) return
        setLoadingDemo(true)
        const supabase = createClient()
        supabase.from('maquinarias').select('nombre, codigo_interno').eq('tenant_id', tenantId).order('codigo_interno')
            .then(({ data }) => { setDemoItems(data ?? []); setLoadingDemo(false) })
    }, [isTrial, tenantId])

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const data = await parseExcel(file)
            setParsed(data)
            setResult(null)
        } catch {
            toast.error('Error leyendo el archivo Excel')
        }
    }

    function handleImport() {
        if (!parsed) return
        startTransition(async () => {
            const res = await importMaquinaria(tenantId, parsed.rows)
            setResult({ imported: res.imported, docsImported: res.docsImported ?? 0, errors: res.errors })
            if (res.success && res.imported > 0) {
                toast.success(`${res.imported} equipo(s) importado(s)`)
            } else if (res.errors.length > 0) {
                toast.error(`${res.errors.length} error(es) durante la importación`)
            }
        })
    }

    return (
        <div className="space-y-6">
            {isTrial && (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                    <p className="text-sm font-medium">¿Cómo quieres cargar tu Maquinaria?</p>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="maq-modo"
                                checked={usarDemo}
                                onChange={() => setUsarDemo(true)}
                                className="accent-primary"
                            />
                            <span className="text-sm">Usar datos demo (ya tenemos {demoItems.length} equipos listos)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="maq-modo"
                                checked={!usarDemo}
                                onChange={() => setUsarDemo(false)}
                                className="accent-primary"
                            />
                            <span className="text-sm">Cargar mis propios datos</span>
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        💡 Puedes editar y agregar más en cualquier momento desde Configuración → Maquinaria.
                    </p>
                </div>
            )}

            {isTrial && usarDemo && (
                <div className="space-y-3">
                    {loadingDemo ? (
                        <p className="text-sm text-muted-foreground">Cargando equipos demo...</p>
                    ) : demoItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay equipos demo cargados aún.</p>
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
                                            <td className="px-3 py-2 text-muted-foreground">{item.codigo_interno ?? '—'}</td>
                                            <td className="px-3 py-2">{item.nombre}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <Link href={`/sistema/onboarding/${tenantId}?step=5`}>
                        <Button size="sm">Continuar →</Button>
                    </Link>
                </div>
            )}

            {(!isTrial || !usarDemo) && (<>
            <div>
                <h2 className="text-lg font-semibold mb-1">Importar maquinaria</h2>
                <p className="text-sm text-muted-foreground">
                    Excel con 2 hojas: <strong>Maquinaria</strong> y <strong>Documentos</strong>. La clave de unión es la placa.
                </p>
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

            {parsed && (
                <div className="space-y-3">
                    <div className="flex gap-6 text-sm font-medium">
                        <span>{parsed.rows.length} equipo(s)</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{parsed.totalDocs} documento(s)</span>
                    </div>

                    <p className="text-xs text-muted-foreground">Vista previa (primeros 5 equipos):</p>
                    <div className="overflow-x-auto rounded-md border text-xs">
                        <table className="w-full min-w-max">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">nombre</th>
                                    <th className="px-3 py-2 text-left font-medium">placa</th>
                                    <th className="px-3 py-2 text-left font-medium">marca</th>
                                    <th className="px-3 py-2 text-left font-medium">modelo</th>
                                    <th className="px-3 py-2 text-left font-medium">estado</th>
                                    <th className="px-3 py-2 text-left font-medium">foto</th>
                                    <th className="px-3 py-2 text-left font-medium">docs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsed.rows.slice(0, 5).map((r, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="px-3 py-2">{r.nombre}</td>
                                        <td className="px-3 py-2">{r.placa}</td>
                                        <td className="px-3 py-2">{r.marca}</td>
                                        <td className="px-3 py-2">{r.modelo}</td>
                                        <td className="px-3 py-2">{r.estado}</td>
                                        <td className="px-3 py-2">{r.foto_url ? '✓' : '—'}</td>
                                        <td className="px-3 py-2">{r.documentos?.length ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Button onClick={handleImport} disabled={isPending}>
                        {isPending ? 'Importando...' : `Importar ${parsed.rows.length} equipo(s)`}
                    </Button>
                </div>
            )}

            {result && (
                <div className="rounded-md border p-4 space-y-2 text-sm">
                    <p className="font-medium">Resultado de la importación</p>
                    <div className="flex gap-6">
                        <span className="text-green-600">Equipos: {result.imported}</span>
                        <span className="text-green-600">Documentos: {result.docsImported}</span>
                    </div>
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
