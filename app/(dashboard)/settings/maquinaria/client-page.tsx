
"use client"

import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { TypesClientPage } from "@/app/(dashboard)/maquinarias/types/client-page"
import { ModelosClientPage } from "@/app/(dashboard)/maquinarias/modelos/client-page"

interface SettingsMaquinariaClientProps {
    tipos: any[]
    modelosData: any[]
    categories: any[]
    modelsList: any[]
}

export function SettingsMaquinariaClient({ tipos, modelosData, categories, modelsList }: SettingsMaquinariaClientProps) {
    const [activeTab, setActiveTab] = useState("tipos")
    const isTrash = false // Default view

    return (
        <div className="flex flex-col items-center h-full space-y-6">
            <div className="w-full space-y-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Configuración de Maquinaria</h2>
                    <p className="text-muted-foreground">
                        Gestione tipos de documentos y modelos de maquinaria.
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
                            Tipos de Documentos
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("modelos")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "modelos"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Modelos
                        </button>
                    </div>

                    {activeTab === "tipos" && (
                        <div className="border rounded-md p-4">
                            <TypesClientPage
                                tipos={tipos}
                                isTrash={isTrash}
                                categories={categories}
                                models={modelsList}
                                embedded={true}
                            />
                        </div>
                    )}

                    {activeTab === "modelos" && (
                        <div className="border rounded-md p-4">
                            <ModelosClientPage
                                modelos={modelosData}
                                isTrash={isTrash}
                                embedded={true}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
