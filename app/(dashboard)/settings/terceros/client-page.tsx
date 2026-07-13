
"use client"

import { useState } from "react"
import { GenericCatalogTable } from "@/components/settings/generic-catalog-table"
import { Separator } from "@/components/ui/separator"
import {
    createCatalogo,
    createContactoArea,
    createContactoCargo,
    deleteCatalogo,
    restoreCatalogo
} from "@/lib/actions/catalogos"

interface SettingsTercerosClientProps {
    rubros: any[]
    areas: any[]
    cargos: any[]
}

export function SettingsTercerosClient({ rubros, areas, cargos }: SettingsTercerosClientProps) {
    const [activeTab, setActiveTab] = useState("rubros")

    return (
        <div className="flex flex-col items-center h-full space-y-6">
            <div className="w-full space-y-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Configuración de Terceros</h2>
                    <p className="text-muted-foreground">
                        Gestione rubros y áreas de contacto.
                    </p>
                </div>

                <Separator />

                <div className="space-y-6">
                    <div className="flex border-b">
                        <button
                            type="button"
                            onClick={() => setActiveTab("rubros")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "rubros"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Rubros
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("cargos")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "cargos"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Cargos de Personal
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("areas")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "areas"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Áreas de Contacto
                        </button>
                    </div>

                    {activeTab === "rubros" && (
                        <GenericCatalogTable
                            itemName="Rubro"
                            data={rubros}
                            createAction={createCatalogo.bind(null, 'rubros')}
                            deleteAction={deleteCatalogo.bind(null, 'rubros')}
                            restoreAction={restoreCatalogo.bind(null, 'rubros')}
                        />
                    )}

                    {activeTab === "cargos" && (
                        <GenericCatalogTable
                            itemName="Cargo"
                            data={cargos}
                            createAction={createContactoCargo}
                            deleteAction={deleteCatalogo.bind(null, 'contactos_cargo')}
                            restoreAction={restoreCatalogo.bind(null, 'contactos_cargo')}
                        />
                    )}

                    {activeTab === "areas" && (
                        <GenericCatalogTable
                            itemName="Área"
                            data={areas}
                            createAction={createContactoArea}
                            deleteAction={deleteCatalogo.bind(null, 'contactos_area')}
                            restoreAction={restoreCatalogo.bind(null, 'contactos_area')}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
