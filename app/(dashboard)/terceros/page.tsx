import { Suspense } from "react"
import { getTerceros } from "@/lib/actions/terceros"
import { TercerosClient } from "./terceros-client"

export default async function TercerosPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams
    const view = params.view || 'active';
    const onlyActive = view === 'active';

    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <TercerosList onlyActive={onlyActive} />
        </Suspense>
    )
}



async function TercerosList({ onlyActive }: { onlyActive: boolean }) {
    // If onlyActive is false (Trash view), we now fetch ALL (relaxed query).
    // So we need to tell Client to filter if we are in Trash view.
    // Wait, onlyActive param name here is confusing if we pass it to getTerceros.
    // Let's rely on the passed prop.
    const isTrash = !onlyActive
    const data = await getTerceros(undefined, onlyActive)

    // Logic: 
    // If active view (onlyActive=true) -> getTerceros(true) -> returns active.
    // If trash view (onlyActive=false) -> getTerceros(false) -> returns ALL.

    return <TercerosClient data={data} isTrash={isTrash} />
}
