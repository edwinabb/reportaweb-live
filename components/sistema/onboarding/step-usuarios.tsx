'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { importUsuarios, type UsuarioRow, type DocPersonalRow } from '@/lib/actions/onboarding'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type Props = {
    tenantId: string
    isTrial?: boolean
}

const USUARIOS_COLS = ['nombre', 'apellido', 'email', 'cargo', 'tipo_doc', 'num_doc', 'rol', 'telefono', 'foto_url']
const DOCUMENTOS_COLS = ['email', 'tipo_doc', 'fecha_desde', 'fecha_hasta', 'archivo_url']

type ParsedResult = {
    rows: UsuarioRow[]
    totalDocs: number
}

function downloadTemplate() {
    const wb = XLSX.utils.book_new()

    // Hoja 1: Usuarios
    const wsUsuarios = XLSX.utils.aoa_to_sheet([
        USUARIOS_COLS,
        ['Juan', 'Pérez', 'juan@empresa.com', 'Operador', 'DNI', '12345678', 'member', '999000001', 'https://ejemplo.com/foto.jpg'],
    ])
    XLSX.utils.book_append_sheet(wb, wsUsuarios, 'Usuarios')

    // Hoja 2: Documentos
    const wsDocs = XLSX.utils.aoa_to_sheet([
        DOCUMENTOS_COLS,
        ['juan@empresa.com', 'Contrato de trabajo', '2024-01-01', '2025-01-01', 'https://ejemplo.com/contrato.pdf'],
        ['juan@empresa.com', 'Certificado médico', '2024-03-15', '2025-03-15', ''],
    ])
    XLSX.utils.book_append_sheet(wb, wsDocs, 'Documentos')

    // Hoja 3: Instrucciones
    const wsInstr = XLSX.utils.aoa_to_sheet([
        ['INSTRUCCIONES DE USO'],
        [''],
        ['Hoja "Usuarios" — un usuario por fila'],
        ['Campo', 'Descripción', 'Valores permitidos'],
        ['nombre', 'Nombre del usuario', ''],
        ['apellido', 'Apellido del usuario', ''],
        ['email', 'Correo electrónico (único, clave de unión con documentos)', ''],
        ['cargo', 'Nombre del cargo/puesto', ''],
        ['tipo_doc', 'Tipo de documento', 'DNI / CE / PASSPORT'],
        ['num_doc', 'Número de documento', ''],
        ['rol', 'Rol en el sistema', 'admin_tenant / supervisor / planner / member / viewer'],
        ['telefono', 'Teléfono (opcional)', ''],
        ['foto_url', 'URL pública de la foto (se descargará y subirá al sistema)', ''],
        [''],
        ['Hoja "Documentos" — N documentos por usuario (vinculados por email)'],
        ['email', 'Email del usuario al que pertenece (debe existir en hoja Usuarios)', ''],
        ['tipo_doc', 'Nombre del tipo de documento (debe existir en la configuración)', ''],
        ['fecha_desde', 'Fecha de inicio de vigencia (YYYY-MM-DD)', ''],
        ['fecha_hasta', 'Fecha de vencimiento (YYYY-MM-DD)', ''],
        ['archivo_url', 'URL pública del archivo (se descargará y subirá al sistema)', ''],
    ])
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

    XLSX.writeFile(wb, 'plantilla_usuarios.xlsx')
}

function downloadPasswords(passwords: { email: string; password: string }[]) {
    const ws = XLSX.utils.aoa_to_sheet([
        ['email', 'password'],
        ...passwords.map(p => [p.email, p.password]),
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contraseñas')
    XLSX.writeFile(wb, 'usuarios_contraseñas.xlsx')
}

function parseExcel(file: File): Promise<ParsedResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = evt => {
            try {
                const data = evt.target?.result
                const wb = XLSX.read(data, { type: 'binary' })

                const wsUsuarios = wb.Sheets['Usuarios'] ?? wb.Sheets[wb.SheetNames[0]]
                const usuariosRaw = XLSX.utils.sheet_to_json<Record<string, string>>(wsUsuarios, { defval: '' })

                const wsDocs = wb.Sheets['Documentos'] ?? wb.Sheets[wb.SheetNames[1]]
                const docsRaw = wsDocs
                    ? XLSX.utils.sheet_to_json<Record<string, string>>(wsDocs, { defval: '' })
                    : []

                // Agrupar documentos por email
                const docsByEmail: Record<string, DocPersonalRow[]> = {}
                for (const d of docsRaw) {
                    const email = String(d.email || '').trim().toLowerCase()
                    if (!email) continue
                    if (!docsByEmail[email]) docsByEmail[email] = []
                    docsByEmail[email].push({
                        email,
                        tipo_doc: String(d.tipo_doc || '').trim(),
                        fecha_desde: String(d.fecha_desde || '').trim() || undefined,
                        fecha_hasta: String(d.fecha_hasta || '').trim() || undefined,
                        archivo_url: String(d.archivo_url || '').trim() || undefined,
                    })
                }

                const rows: UsuarioRow[] = usuariosRaw.map(r => {
                    const email = String(r.email || '').trim().toLowerCase()
                    return {
                        nombre: String(r.nombre || '').trim(),
                        apellido: String(r.apellido || '').trim(),
                        email,
                        cargo: String(r.cargo || '').trim(),
                        tipo_doc: String(r.tipo_doc || 'DNI').trim(),
                        num_doc: String(r.num_doc || '').trim(),
                        rol: String(r.rol || 'member').trim(),
                        telefono: String(r.telefono || '').trim() || undefined,
                        foto_url: String(r.foto_url || '').trim() || undefined,
                        documentos: email ? (docsByEmail[email] ?? []) : [],
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

type DemoProfile = { first_name: string | null; last_name: string | null; role: string | null }

export function StepUsuarios({ tenantId, isTrial }: Props) {
    const [isPending, startTransition] = useTransition()
    const [parsed, setParsed] = useState<ParsedResult | null>(null)
    const [passwords, setPasswords] = useState<{ email: string; password: string }[]>([])
    const [result, setResult] = useState<{ imported: number; skipped: number; docsImported: number; errors: string[] } | null>(null)
    const [usarDemo, setUsarDemo] = useState(isTrial ?? false)
    const [demoItems, setDemoItems] = useState<DemoProfile[]>([])
    const [loadingDemo, setLoadingDemo] = useState(false)

    useEffect(() => {
        if (!isTrial) return
        setLoadingDemo(true)
        const supabase = createClient()
        supabase.from('profiles').select('first_name, last_name, role').eq('tenant_id', tenantId).neq('role', 'admin_tenant').neq('role', 'reporta_admin')
            .then(({ data }) => { setDemoItems(data ?? []); setLoadingDemo(false) })
    }, [isTrial, tenantId])

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const data = await parseExcel(file)
            setParsed(data)
            setResult(null)
            setPasswords([])
        } catch {
            toast.error('Error leyendo el archivo Excel')
        }
    }

    function handleImport() {
        if (!parsed) return
        startTransition(async () => {
            const res = await importUsuarios(tenantId, parsed.rows)
            setResult({ imported: res.imported, skipped: res.skipped, docsImported: res.docsImported ?? 0, errors: res.errors })
            if (res.passwords.length > 0) setPasswords(res.passwords)
            if (res.success && res.imported > 0) {
                toast.success(`${res.imported} usuario(s) importado(s)`)
            } else if (res.errors.length > 0) {
                toast.error(`${res.errors.length} error(es) durante la importación`)
            }
        })
    }

    return (
        <div className="space-y-6">
            {isTrial && (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                    <p className="text-sm font-medium">¿Cómo quieres cargar tu Personal?</p>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="usr-modo"
                                checked={usarDemo}
                                onChange={() => setUsarDemo(true)}
                                className="accent-primary"
                            />
                            <span className="text-sm">Usar datos demo (ya tenemos {demoItems.length} personas listas)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="usr-modo"
                                checked={!usarDemo}
                                onChange={() => setUsarDemo(false)}
                                className="accent-primary"
                            />
                            <span className="text-sm">Cargar mis propios datos</span>
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        💡 Puedes editar y agregar más en cualquier momento desde Configuración → Personal.
                    </p>
                </div>
            )}

            {isTrial && usarDemo && (
                <div className="space-y-3">
                    {loadingDemo ? (
                        <p className="text-sm text-muted-foreground">Cargando personal demo...</p>
                    ) : demoItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay personal demo cargado aún.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-md border text-xs">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Nombre</th>
                                        <th className="px-3 py-2 text-left font-medium">Apellido</th>
                                        <th className="px-3 py-2 text-left font-medium">Rol</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {demoItems.map((item, i) => (
                                        <tr key={i} className="border-t">
                                            <td className="px-3 py-2">{item.first_name ?? '—'}</td>
                                            <td className="px-3 py-2">{item.last_name ?? '—'}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{item.role ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <Link href={`/sistema/onboarding/${tenantId}?step=3`}>
                        <Button size="sm">Continuar →</Button>
                    </Link>
                </div>
            )}

            {(!isTrial || !usarDemo) && (<>
            <div>
                <h2 className="text-lg font-semibold mb-1">Importar usuarios</h2>
                <p className="text-sm text-muted-foreground">
                    Excel con 2 hojas: <strong>Usuarios</strong> y <strong>Documentos</strong>. La clave de unión es el email.
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
                        <span>{parsed.rows.length} usuario(s)</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{parsed.totalDocs} documento(s)</span>
                    </div>

                    <p className="text-xs text-muted-foreground">Vista previa (primeros 5 usuarios):</p>
                    <div className="overflow-x-auto rounded-md border text-xs">
                        <table className="w-full min-w-max">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">nombre</th>
                                    <th className="px-3 py-2 text-left font-medium">apellido</th>
                                    <th className="px-3 py-2 text-left font-medium">email</th>
                                    <th className="px-3 py-2 text-left font-medium">cargo</th>
                                    <th className="px-3 py-2 text-left font-medium">rol</th>
                                    <th className="px-3 py-2 text-left font-medium">foto</th>
                                    <th className="px-3 py-2 text-left font-medium">docs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsed.rows.slice(0, 5).map((r, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="px-3 py-2">{r.nombre}</td>
                                        <td className="px-3 py-2">{r.apellido}</td>
                                        <td className="px-3 py-2">{r.email}</td>
                                        <td className="px-3 py-2">{r.cargo}</td>
                                        <td className="px-3 py-2">{r.rol}</td>
                                        <td className="px-3 py-2">{r.foto_url ? '✓' : '—'}</td>
                                        <td className="px-3 py-2">{r.documentos?.length ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Button onClick={handleImport} disabled={isPending}>
                        {isPending ? 'Importando...' : `Importar ${parsed.rows.length} usuario(s)`}
                    </Button>
                </div>
            )}

            {result && (
                <div className="rounded-md border p-4 space-y-2 text-sm">
                    <p className="font-medium">Resultado de la importación</p>
                    <div className="flex gap-6">
                        <span className="text-green-600">Importados: {result.imported}</span>
                        <span className="text-yellow-600">Omitidos: {result.skipped}</span>
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

            {passwords.length > 0 && (
                <Button variant="outline" onClick={() => downloadPasswords(passwords)} type="button">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Excel con contraseñas ({passwords.length})
                </Button>
            )}
            </>)}
        </div>
    )
}
