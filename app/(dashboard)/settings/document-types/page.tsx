import { Suspense } from 'react'
import { Plus } from 'lucide-react'
import { getDocumentTypes } from '@/lib/actions/document-types'
import { DocumentTypesTable } from '@/components/settings/document-types/document-types-table'
import { DocumentTypeDialog } from '@/components/settings/document-types/document-type-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

// Simple client wrapper for the "Add New" button to handle dialog state separately if needed,
// but for simplicity, we can pass a trigger or just make a small client component.
// Best approach: Use a Client Component for the page content that manages the "Add" state, OR simple composition.
import { DocumentTypesPageClient } from './page-client'

export default async function DocumentTypesPage() {
    // Server Component fetches data
    const { data: documentTypes, error } = await getDocumentTypes()

    if (error) {
        return <div className="p-8 text-destructive">Error al cargar tipos de documentos: {error}</div>
    }

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Tipos de Documentos</h2>
                    <p className="text-muted-foreground">
                        Gestiona el catálogo de documentos requeridos para el personal.
                    </p>
                </div>
            </div>

            <Separator />

            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                <DocumentTypesPageClient initialData={documentTypes || []} />
            </Suspense>
        </div>
    )
}
