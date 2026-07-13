
"use client"

import { useState } from "react"
import { GenericCatalogTable } from '@/components/settings/generic-catalog-table'
import { UserDocsTable } from '@/components/settings/users/user-docs-table'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { deleteDocumentTypeSimple, restoreDocumentTypeSimple } from '@/lib/actions/document-types'
import { createJobTitleSimple, deleteJobTitleSimple, restoreJobTitleSimple } from '@/lib/actions/job-titles'

interface UsersSettingsClientProps {
    documentTypes: any[]
    jobTitles: any[]
}

export function UsersSettingsClient({ documentTypes, jobTitles }: UsersSettingsClientProps) {
    const [activeTab, setActiveTab] = useState("documentos")

    return (
        <div className="flex flex-col items-center h-full space-y-6">
            <div className="w-full space-y-6">
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold tracking-tight">Configuración de Usuarios</h2>
                    </div>
                    <p className="text-muted-foreground">
                        Gestione los catálogos y parámetros maestros para los usuarios del sistema.
                    </p>
                </div>

                <Separator />

                {/* Custom Tabs */}
                <div className="space-y-6">
                    <div className="flex border-b">
                        <button
                            type="button"
                            onClick={() => setActiveTab("documentos")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "documentos"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Tipos de Documento
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
                    </div>

                    {activeTab === "documentos" && (
                        <div className="space-y-4 flex flex-col">
                            <div className="flex-1">
                                <UserDocsTable
                                    data={documentTypes.map(d => ({ ...d, nombre: d.name }))}
                                    deleteAction={deleteDocumentTypeSimple}
                                    restoreAction={restoreDocumentTypeSimple}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "cargos" && (
                        <div className="space-y-4 flex flex-col">
                            <div className="flex-1">
                                <GenericCatalogTable
                                    itemName="Cargo"
                                    data={jobTitles.map(j => ({ ...j, nombre: j.name }))}
                                    createAction={createJobTitleSimple}
                                    deleteAction={deleteJobTitleSimple}
                                    restoreAction={restoreJobTitleSimple}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
