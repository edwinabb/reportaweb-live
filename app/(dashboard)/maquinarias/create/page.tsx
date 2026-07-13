import { MaquinariaForm } from "@/components/maquinaria/maquinaria-form"
import { getTerceros } from "@/lib/actions/terceros"
import { getMaquinariaModelos } from "@/lib/actions/maquinaria-models"

export default async function CreateMaquinariaPage() {
    const [proveedores, modelos] = await Promise.all([
        getTerceros(),
        getMaquinariaModelos()
    ])

    return (
        <div className="flex flex-col gap-4">

            <div className="flex flex-col gap-6 w-full">

                <div className="rounded-lg border p-6 bg-background">
                    <MaquinariaForm proveedores={proveedores} modelos={modelos} />
                </div>
            </div>
        </div>
    )
}

