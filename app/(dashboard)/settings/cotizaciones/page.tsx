
import { SettingsCotizacionesClient } from "./client-page"
import { getProfiles } from "@/lib/actions/users"
import { getConfigData, getGlobalPDFConfig } from "@/lib/actions/cotizaciones-config"
import { getActividadesMatrizCatalog } from "@/lib/actions/cotizaciones"

export default async function SettingsCotizacionesPage() {
    // Fetch catalogs and users in parallel
    const [formasPago, plazosPago, actividadesMatriz, configDocs, globalConfig, users] = await Promise.all([
        getConfigData('formas_pago'),
        getConfigData('plazos_pago'),
        getActividadesMatrizCatalog(),
        getConfigData('cotizaciones_configuracion_doc'),
        getGlobalPDFConfig(),
        getProfiles(true) // Fetch only active users
    ])

    return (
        <div className="flex flex-col gap-4">
            <SettingsCotizacionesClient
                formasPago={formasPago || []}
                plazosPago={plazosPago || []}
                actividadesMatriz={actividadesMatriz}
                configDocs={configDocs || []}
                globalConfig={globalConfig}
                users={users || []}
            />
        </div>
    )
}
