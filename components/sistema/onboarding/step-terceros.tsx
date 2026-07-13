'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { importTerceros, type TerceroRow, type ContactoRow, type SitioRow } from '@/lib/actions/onboarding'

type Props = {
    tenantId: string
}

const TERCEROS_COLS = ['razon_social', 'ruc', 'tipo', 'rubro', 'email', 'telefono', 'direccion', 'logo_url']
const CONTACTOS_COLS = ['ruc_tercero', 'nombre_completo', 'cargo', 'area', 'telefono', 'email']
const SITIOS_COLS = ['ruc_tercero', 'nombre_sitio', 'codigo', 'direccion', 'ciudad']

function downloadTemplate() {
    const wb = XLSX.utils.book_new()

    // Hoja 1: Terceros
    const wsTerceros = XLSX.utils.aoa_to_sheet([
        TERCEROS_COLS,
        ['Empresa Ejemplo S.A.C.', '20123456789', 'cliente', 'Construcción', 'contacto@ejemplo.com', '999000001', 'Av. Ejemplo 123', 'https://ejemplo.com/logo.png'],
    ])
    XLSX.utils.book_append_sheet(wb, wsTerceros, 'Terceros')

    // Hoja 2: Contactos (N por tercero, vinculados por ruc_tercero)
    const wsContactos = XLSX.utils.aoa_to_sheet([
        CONTACTOS_COLS,
        ['20123456789', 'Juan Pérez', 'Gerente de Operaciones', 'Operaciones', '999000002', 'jperez@ejemplo.com'],
        ['20123456789', 'María López', 'Asistente Compras', 'Compras', '999000003', 'mlopez@ejemplo.com'],
    ])
    XLSX.utils.book_append_sheet(wb, wsContactos, 'Contactos')

    // Hoja 3: Sitios (N por tercero, vinculados por ruc_tercero)
    const wsSitios = XLSX.utils.aoa_to_sheet([
        SITIOS_COLS,
        ['20123456789', 'Sede Principal', 'SP-001', 'Av. Ejemplo 123', 'Lima'],
        ['20123456789', 'Almacén Norte', 'ALM-N', 'Jr. Norte 456', 'Callao'],
    ])
    XLSX.utils.book_append_sheet(wb, wsSitios, 'Sitios')

    // Hoja 4: Instrucciones
    const wsInstr = XLSX.utils.aoa_to_sheet([
        ['INSTRUCCIONES DE USO'],
        [''],
        ['Hoja "Terceros" — una empresa por fila'],
        ['Campo', 'Descripción', 'Valores permitidos'],
        ['razon_social', 'Nombre o razón social (requerido)', ''],
        ['ruc', 'RUC de la empresa (requerido — es la clave de unión con contactos y sitios)', ''],
        ['tipo', 'Tipo de tercero', 'cliente / proveedor / ambos'],
        ['rubro', 'Rubro o sector (se crea si no existe)', ''],
        ['email', 'Correo electrónico principal', ''],
        ['telefono', 'Teléfono principal', ''],
        ['direccion', 'Dirección fiscal', ''],
        ['logo_url', 'URL pública del logo (se descargará y subirá al sistema)', ''],
        [''],
        ['Hoja "Contactos" — N contactos por empresa (vinculados por ruc_tercero)'],
        ['ruc_tercero', 'RUC del tercero al que pertenece (debe existir en hoja Terceros)', ''],
        ['nombre_completo', 'Nombre completo del contacto (requerido)', ''],
        ['cargo', 'Cargo del contacto', ''],
        ['area', 'Área del contacto', ''],
        ['telefono', 'Teléfono del contacto', ''],
        ['email', 'Correo del contacto', ''],
        [''],
        ['Hoja "Sitios" — N sitios por empresa (vinculados por ruc_tercero)'],
        ['ruc_tercero', 'RUC del tercero al que pertenece', ''],
        ['nombre_sitio', 'Nombre del sitio o sede (requerido)', ''],
        ['codigo', 'Código interno del sitio', ''],
        ['direccion', 'Dirección del sitio', ''],
        ['ciudad', 'Ciudad del sitio', ''],
    ])
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

    XLSX.writeFile(wb, 'plantilla_terceros.xlsx')
}

type ParsedResult = {
    rows: TerceroRow[]
    totalContactos: number
    totalSitios: number
}

function parseExcel(file: File): Promise<ParsedResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = evt => {
            try {
                const data = evt.target?.result
                const wb = XLSX.read(data, { type: 'binary' })

                // Leer hoja Terceros
                const wsTerceros = wb.Sheets['Terceros'] ?? wb.Sheets[wb.SheetNames[0]]
                const tercerosRaw = XLSX.utils.sheet_to_json<Record<string, string>>(wsTerceros, { defval: '' })

                // Leer hoja Contactos
                const wsContactos = wb.Sheets['Contactos'] ?? wb.Sheets[wb.SheetNames[1]]
                const contactosRaw = wsContactos
                    ? XLSX.utils.sheet_to_json<Record<string, string>>(wsContactos, { defval: '' })
                    : []

                // Leer hoja Sitios
                const wsSitios = wb.Sheets['Sitios'] ?? wb.Sheets[wb.SheetNames[2]]
                const sitiosRaw = wsSitios
                    ? XLSX.utils.sheet_to_json<Record<string, string>>(wsSitios, { defval: '' })
                    : []

                // Agrupar contactos por ruc_tercero
                const contactosByRuc: Record<string, ContactoRow[]> = {}
                for (const c of contactosRaw) {
                    const ruc = String(c.ruc_tercero || '').trim()
                    if (!ruc) continue
                    if (!contactosByRuc[ruc]) contactosByRuc[ruc] = []
                    contactosByRuc[ruc].push({
                        nombre_completo: String(c.nombre_completo || '').trim(),
                        cargo: String(c.cargo || '').trim() || undefined,
                        area: String(c.area || '').trim() || undefined,
                        telefono: String(c.telefono || '').trim() || undefined,
                        email: String(c.email || '').trim() || undefined,
                    })
                }

                // Agrupar sitios por ruc_tercero
                const sitiosByRuc: Record<string, SitioRow[]> = {}
                for (const s of sitiosRaw) {
                    const ruc = String(s.ruc_tercero || '').trim()
                    if (!ruc) continue
                    if (!sitiosByRuc[ruc]) sitiosByRuc[ruc] = []
                    sitiosByRuc[ruc].push({
                        nombre: String(s.nombre_sitio || '').trim(),
                        codigo: String(s.codigo || '').trim() || undefined,
                        direccion: String(s.direccion || '').trim() || undefined,
                        ciudad: String(s.ciudad || '').trim() || undefined,
                    })
                }

                // Combinar terceros con sus contactos y sitios
                const rows: TerceroRow[] = tercerosRaw.map(r => {
                    const ruc = String(r.ruc || '').trim()
                    return {
                        razon_social: String(r.razon_social || '').trim(),
                        ruc: ruc || undefined,
                        tipo: String(r.tipo || 'cliente').trim(),
                        rubro: String(r.rubro || '').trim() || undefined,
                        email: String(r.email || '').trim() || undefined,
                        telefono: String(r.telefono || '').trim() || undefined,
                        direccion: String(r.direccion || '').trim() || undefined,
                        logo_url: String(r.logo_url || '').trim() || undefined,
                        contactos: ruc ? (contactosByRuc[ruc] ?? []) : [],
                        sitios: ruc ? (sitiosByRuc[ruc] ?? []) : [],
                    }
                })

                const totalContactos = rows.reduce((sum, r) => sum + (r.contactos?.length ?? 0), 0)
                const totalSitios = rows.reduce((sum, r) => sum + (r.sitios?.length ?? 0), 0)

                resolve({ rows, totalContactos, totalSitios })
            } catch (err) {
                reject(err)
            }
        }
        reader.readAsBinaryString(file)
    })
}

export function StepTerceros({ tenantId }: Props) {
    const [isPending, startTransition] = useTransition()
    const [parsed, setParsed] = useState<ParsedResult | null>(null)
    const [result, setResult] = useState<{ imported: number; contactosImported: number; sitiosImported: number; errors: string[] } | null>(null)

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
            const res = await importTerceros(tenantId, parsed.rows)
            setResult({ imported: res.imported, contactosImported: res.contactosImported, sitiosImported: res.sitiosImported, errors: res.errors })
            if (res.success && res.imported > 0) {
                toast.success(`${res.imported} tercero(s) importado(s)`)
            } else if (res.errors.length > 0) {
                toast.error(`${res.errors.length} error(es) durante la importación`)
            }
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold mb-1">Importar terceros</h2>
                <p className="text-sm text-muted-foreground">
                    Un solo Excel con 3 hojas: <strong>Terceros</strong>, <strong>Contactos</strong> y <strong>Sitios</strong>. La clave de unión es el RUC.
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
                        <span>{parsed.rows.length} tercero(s)</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{parsed.totalContactos} contacto(s)</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{parsed.totalSitios} sitio(s)</span>
                    </div>

                    <p className="text-xs text-muted-foreground">Vista previa (primeras 5 empresas):</p>
                    <div className="overflow-x-auto rounded-md border text-xs">
                        <table className="w-full min-w-max">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">razon_social</th>
                                    <th className="px-3 py-2 text-left font-medium">ruc</th>
                                    <th className="px-3 py-2 text-left font-medium">tipo</th>
                                    <th className="px-3 py-2 text-left font-medium">contactos</th>
                                    <th className="px-3 py-2 text-left font-medium">sitios</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsed.rows.slice(0, 5).map((r, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="px-3 py-2">{r.razon_social}</td>
                                        <td className="px-3 py-2">{r.ruc}</td>
                                        <td className="px-3 py-2">{r.tipo}</td>
                                        <td className="px-3 py-2">{r.contactos?.length ?? 0}</td>
                                        <td className="px-3 py-2">{r.sitios?.length ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Button onClick={handleImport} disabled={isPending}>
                        {isPending ? 'Importando...' : `Importar ${parsed.rows.length} tercero(s)`}
                    </Button>
                </div>
            )}

            {result && (
                <div className="rounded-md border p-4 space-y-2 text-sm">
                    <p className="font-medium">Resultado de la importación</p>
                    <div className="flex gap-6">
                        <span className="text-green-600">Terceros: {result.imported}</span>
                        <span className="text-green-600">Contactos: {result.contactosImported}</span>
                        <span className="text-green-600">Sitios: {result.sitiosImported}</span>
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
        </div>
    )
}
