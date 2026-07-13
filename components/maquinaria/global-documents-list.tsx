import { getMaquinariaDocumentos } from "@/lib/actions/maquinaria-docs"
// Note: getMaquinariaDocumentos currently filters by maquinariaID. We need a new action for ALL documents.

// Placeholder for now as the user primarily asked for the 'Add' functionality and menu option.
// I will create a basic table placeholder.

export async function GlobalDocumentsList() {
    return (
        <div className="text-center py-10 text-muted-foreground">
            <p>Selecciona un equipo para ver sus documentos o utiliza el botón "Nuevo Documento" para agregar uno.</p>
            {/* Future: Implement full global table with filtering/search */}
        </div>
    )
}
