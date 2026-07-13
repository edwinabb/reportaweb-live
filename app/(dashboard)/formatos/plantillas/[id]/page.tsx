import { PlantillaEditor } from "@/components/formatos/plantillas/plantilla-editor"
import { getPlantillaById } from "@/lib/actions/plantillas"
import { notFound } from "next/navigation"

interface Props {
    params: { id: string }
}

export default async function EditarPlantillaPage(props: Props) {
    const params = await props.params;
    const plantilla = await getPlantillaById(params.id)

    if (!plantilla) return notFound()

    return (
        <div className="flex-1 p-8 pt-6">
            <h2 className="text-2xl font-bold tracking-tight mb-6">Editar Plantilla</h2>
            <PlantillaEditor initialData={plantilla} />
        </div>
    )
}
