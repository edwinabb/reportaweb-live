'use client'

import { useState } from "react"
import { GenericCatalogTable } from "@/components/settings/generic-catalog-table"
import { ActividadesMatrizTable } from "@/components/settings/cotizaciones/actividades-matriz-table"
import { ConfigDocTable } from "@/components/settings/cotizaciones/config-doc-table"


// We might need specific actions for these tables if they are not generic enough
// Formas de Pago and Plazos de Pago are generic (id, nombre, is_active)
// But they are in different tables.
// GenericCatalogTable takes "createAction" etc as props.
// We need to verify if we have actions for them. 
// "createFormaPago", "createPlazoPago" etc.
// If not, we should probably add them to lib/actions/catalogos.ts or cotizaciones-config.ts

// Imports from wrappers below

// Wait, I need to check where these actions are or create them. 
// Step 824 shows I created cotizaciones-config.ts, but it has generic `createConfigItem(table, ...)`
// I can wrap them here or use them directly if GenericCatalogTable supports it.
// GenericCatalogTable expects: (formData: FormData) => Promise<{success, message}>
// So I need simple wrappers.

import {
    createFormaPagoAction, deleteFormaPagoAction, restoreFormaPagoAction, updateFormaPagoAction,
    createPlazoPagoAction, deletePlazoPagoAction, restorePlazoPagoAction, updatePlazoPagoAction
} from "@/lib/actions/cotizaciones-config-wrappers"
// I will create this wrapper file to keep it clean.


import { CotizacionGlobalConfigForm } from "@/components/settings/cotizaciones/cotizacion-global-config-form"

interface SettingsCotizacionesClientProps {
    formasPago: any[]
    plazosPago: any[]
    actividadesMatriz: any[]
    configDocs: any[]
    globalConfig?: any
    users?: any[]
}

export function SettingsCotizacionesClient({
    formasPago,
    plazosPago,
    actividadesMatriz,
    configDocs,
    globalConfig,
    users = []
}: SettingsCotizacionesClientProps) {
    const [activeTab, setActiveTab] = useState("formas-pago")

    return (
        <div className="w-full space-y-6">
            <div className="flex border-b">
                <button
                    type="button"
                    onClick={() => setActiveTab("formas-pago")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "formas-pago"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Formas de Pago
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("plazos-pago")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "plazos-pago"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Plazos de Pago
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("matriz")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "matriz"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Matriz Resp.
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("documento")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "documento"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Documento
                </button>
            </div>

            <div className="mt-4">
                {activeTab === "formas-pago" && (
                    <GenericCatalogTable
                        itemName="Forma de Pago"
                        data={formasPago}
                        createAction={createFormaPagoAction}
                        updateAction={updateFormaPagoAction}
                        deleteAction={deleteFormaPagoAction}
                        restoreAction={restoreFormaPagoAction}
                    />
                )}

                {activeTab === "plazos-pago" && (
                    <GenericCatalogTable
                        itemName="Plazo de Pago"
                        data={plazosPago}
                        createAction={createPlazoPagoAction}
                        updateAction={updatePlazoPagoAction}
                        deleteAction={deletePlazoPagoAction}
                        restoreAction={restorePlazoPagoAction}
                    />
                )}

                {activeTab === "matriz" && (
                    <ActividadesMatrizTable data={actividadesMatriz} />
                )}

                {activeTab === "documento" && (
                    <div className="space-y-6">
                        <CotizacionGlobalConfigForm globalConfig={globalConfig} users={users} />
                    </div>
                )}
            </div>
        </div>
    )
}
