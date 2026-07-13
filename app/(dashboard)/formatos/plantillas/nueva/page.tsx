import { PlantillaEditor } from "@/components/formatos/plantillas/plantilla-editor"

export default function NuevaPlantillaPage() {
    return (
        <div className="flex-1 p-8 pt-6">
            <h2 className="text-2xl font-bold tracking-tight mb-6">Crear Nueva Plantilla</h2>
            <PlantillaEditor />
        </div>
    )
}
