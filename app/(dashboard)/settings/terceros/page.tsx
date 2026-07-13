import {
    getRubros,
    getContactosAreas,
    getContactosCargos
} from "@/lib/actions/catalogos"
import { SettingsTercerosClient } from "./client-page"

export default async function SettingsTercerosPage() {
    const [rubros, areas, cargos] = await Promise.all([
        getRubros(false),
        getContactosAreas(false),
        getContactosCargos(false)
    ])

    return (
        <div className="h-full p-8 hidden md:block">
            <SettingsTercerosClient rubros={rubros} areas={areas} cargos={cargos} />
        </div>
    )
}
