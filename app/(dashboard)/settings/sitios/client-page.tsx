
"use client"

import { useState } from "react"
import { GenericCatalogTable } from "@/components/settings/generic-catalog-table"
import { Separator } from "@/components/ui/separator"
import { UbigeoTable } from "@/components/settings/ubigeo-table"
import {
    createSitioTipo,
    deleteCatalogo,
    restoreCatalogo
} from "@/lib/actions/catalogos"

interface SettingsSitiosClientProps {
    tipos: any[]
    departamentos: string[]
}

export function SettingsSitiosClient({ tipos, departamentos }: SettingsSitiosClientProps) {
    const [activeTab, setActiveTab] = useState("tipos")

    return (
        <div className="flex flex-col items-center h-full space-y-6">
            <div className="w-full space-y-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Configuración de Sitios y Ubigeo</h2>
                    <p className="text-muted-foreground">
                        Gestione tipos de sitio y consulte la ubicación geográfica.
                    </p>
                </div>

                <Separator />

                <div className="space-y-6">
                    <div className="flex border-b">
                        <button
                            type="button"
                            onClick={() => setActiveTab("tipos")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "tipos"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Tipos de Sitios
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("departamentos")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "departamentos"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Departamentos
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("ubigeo")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "ubigeo"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Ubigeo
                        </button>
                    </div>

                    {activeTab === "tipos" && (
                        <GenericCatalogTable
                            itemName="Tipo"
                            data={tipos}
                            createAction={createSitioTipo}
                            deleteAction={deleteCatalogo.bind(null, 'sitios_tipo')}
                            restoreAction={restoreCatalogo.bind(null, 'sitios_tipo')}
                        />
                    )}

                    {activeTab === "departamentos" && (
                        <div>
                            <h3 className="text-lg font-medium mb-4">Departamentos (Lectura)</h3>
                            <div className="border rounded-md max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 sticky top-0">
                                        <tr>
                                            <th className="p-3">Nombre</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {departamentos.map((dep, i) => (
                                            <tr key={i} className="border-t hover:bg-muted/50">
                                                <td className="p-3">{dep}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Listado obtenido del padrón de Ubigeo.
                            </p>
                        </div>
                    )}

                    {activeTab === "ubigeo" && (
                        <div className="bg-white">
                            <UbigeoTable />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
