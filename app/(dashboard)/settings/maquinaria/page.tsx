import { getMaquinariaTipos, getMaquinariaCategorias, getMaquinariaModelosList } from "@/lib/actions/maquinaria-types"
import { getMaquinariaModelos } from "@/lib/actions/maquinaria-models"
import { SettingsMaquinariaClient } from "./client-page"

export default async function SettingsMaquinariaPage() {
    const OnlyActive = true

    const [tipos, modelosData, categories, modelsList] = await Promise.all([
        getMaquinariaTipos(OnlyActive),
        getMaquinariaModelos(OnlyActive),
        getMaquinariaCategorias(),
        getMaquinariaModelosList()
    ])

    return (
        <div className="h-full p-8 hidden md:block">
            <SettingsMaquinariaClient
                tipos={tipos}
                modelosData={modelosData}
                categories={categories}
                modelsList={modelsList}
            />
        </div>
    )
}
