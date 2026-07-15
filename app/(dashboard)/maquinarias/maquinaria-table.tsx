"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash, FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/data-table"
import { exportToExcel } from "@/lib/utils/export-excel"
import { getColumns } from "./columns"
import { Maquinaria } from "@/types/maquinaria"

interface MaquinariaTableProps {
    data: Maquinaria[]
    isTrash?: boolean
}

export function MaquinariaTable({ data, isTrash = false }: MaquinariaTableProps) {
    const router = useRouter()
    const [globalSearch, setGlobalSearch] = useState("")

    // Búsqueda multicampo: equipo (nombre), código interno o placa,
    // case-insensitive y con coincidencia en cualquier posición.
    const filteredData = useMemo(() => {
        const search = globalSearch.trim().toLowerCase()
        if (!search) return data

        return data.filter((m) => {
            const nombre = m.nombre?.toLowerCase() ?? ''
            const codigo = m.codigo_interno?.toLowerCase() ?? ''
            const placa = m.placa?.toLowerCase() ?? ''
            return nombre.includes(search) || codigo.includes(search) || placa.includes(search)
        })
    }, [data, globalSearch])

    // Opciones de filtro derivadas de los datos
    const toOptions = (values: (string | undefined)[]) =>
        Array.from(new Set(values.filter(Boolean) as string[]))
            .sort().map(v => ({ label: v, value: v }))

    const categoriaOptions = useMemo(() => toOptions(filteredData.map(m => m.categoria)), [filteredData])
    const marcaOptions = useMemo(() => toOptions(filteredData.map(m => m.marca)), [filteredData])
    const modeloOptions = useMemo(() => toOptions(filteredData.map(m => m.modelo || m.modelo_ref?.modelo)), [filteredData])
    const propiedadOptions = useMemo(() => toOptions(filteredData.map(m => m.propietario)), [filteredData])

    const columns = getColumns(isTrash, { categoriaOptions, marcaOptions, modeloOptions, propiedadOptions })

    return (
        <div className="flex flex-col gap-4">
            <DataTable
                columns={columns}
                data={filteredData}
                hideViewOptions
                toolbarContent={() => (
                    <Input
                        placeholder="Buscar por equipo, código o placa..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="h-8 w-full md:w-[280px]"
                    />
                )}
                customAction={(table) => (
                    <div className="flex items-center gap-2">
                        <Button
                            variant={!isTrash ? "default" : "outline"}
                            size="sm"
                            onClick={() => router.push('/maquinarias')}
                        >
                            Activos
                        </Button>
                        <Button
                            variant={isTrash ? "default" : "outline"}
                            size="sm"
                            onClick={() => router.push('/maquinarias?view=trash')}
                        >
                            <Trash className="w-4 h-4 mr-2" />
                            Papelera
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            title="Descargar Excel (lo filtrado)"
                            onClick={() => {
                                const rows = table.getFilteredRowModel().rows.map(r => {
                                    const m = r.original as Maquinaria
                                    return {
                                        'Equipo': m.nombre ?? '',
                                        'Código Interno': m.codigo_interno ?? '',
                                        'Categoría': m.categoria ?? '',
                                        'Marca': m.marca ?? '',
                                        'Modelo': m.modelo || m.modelo_ref?.modelo || '',
                                        'Placa': m.placa ?? '',
                                        'Capacidad': m.capacidad ?? '',
                                        'Año Fabricación': m.anio_fabricacion ?? '',
                                        'Propiedad': m.propietario ?? '',
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        'Proveedor': (m as any).proveedor?.razon_social ?? '',
                                        'Estado': m.is_active ? 'Activo' : 'Inactivo',
                                    }
                                })
                                if (!exportToExcel('MAQUINARIAS', rows)) toast.error('No hay registros para exportar')
                            }}
                        >
                            <FileText className="h-4 w-4 text-green-600" />
                        </Button>
                        {!isTrash && (
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => router.push('/maquinarias/create')}>
                                <span className="mr-2">+</span>
                                Nuevo Equipo
                            </Button>
                        )}
                    </div>
                )}
            />
        </div>
    )
}
