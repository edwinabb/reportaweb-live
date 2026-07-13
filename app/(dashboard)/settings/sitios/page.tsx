import {
    getSitiosTipos,
    getDepartamentos
} from "@/lib/actions/catalogos"
import { SettingsSitiosClient } from "./client-page"

export default async function SettingsSitiosPage() {
    const [tipos, departamentos] = await Promise.all([
        getSitiosTipos(false).catch(() => []),
        getDepartamentos().catch(() => []),
    ])

    return (
        <div className="h-full p-8 hidden md:block">
            <SettingsSitiosClient tipos={tipos} departamentos={departamentos} />
        </div>
    )
}
