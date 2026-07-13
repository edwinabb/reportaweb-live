"use client"

import { useState } from "react"
import { MaquinariaForm } from "@/components/maquinaria/maquinaria-form"
import { DocumentsTab } from "@/components/maquinaria/documents-tab"
import { Maquinaria, MaquinariaDocumento, MaquinariaModelo, MaquinariaTipoDoc } from "@/types/maquinaria"
import { Tercero } from "@/types/terceros"

interface MaquinariaEditClientProps {
    initialData: Maquinaria
    proveedores: Tercero[]
    modelos: MaquinariaModelo[]
    documentos: MaquinariaDocumento[]
    tiposDocs: MaquinariaTipoDoc[]
}

export function MaquinariaEditClient({
    initialData,
    proveedores,
    modelos,
    documentos,
    tiposDocs
}: MaquinariaEditClientProps) {
    const [activeTab, setActiveTab] = useState("general")

    return (
        <div className="flex flex-col items-center">
            <div className="w-full">

                <div className="rounded-lg border bg-background">
                    <div className="flex border-b px-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab("general")}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "general"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Datos Generales
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("documentos")}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "documentos"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Documentos
                        </button>
                        {/* Future tabs can go here */}
                    </div>

                    <div className="p-6">
                        {activeTab === "general" && (
                            <MaquinariaForm
                                proveedores={proveedores}
                                modelos={modelos}
                                initialData={initialData}
                                isEdit
                            />
                        )}
                        {activeTab === "documentos" && (
                            <DocumentsTab
                                maquinariaId={initialData.id}
                                documentos={documentos}
                                tiposDocs={tiposDocs}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
