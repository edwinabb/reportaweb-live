import { getAllUserDocuments } from '@/lib/actions/user-documents-query'
import { getDocumentTypes } from '@/lib/actions/document-types'
import { GlobalDocumentsTable } from '@/components/users/documents/global-documents-table'
import { PageDescription } from '@/components/ui/page-description'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Usuarios - Documentación' }

export default async function UserDocumentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const search = typeof params.search === 'string' ? params.search : undefined
    const documentTypeId = typeof params.documentTypeId === 'string' ? params.documentTypeId : undefined
    const isActiveParam = typeof params.is_active === 'string' ? params.is_active : 'true'
    const isActive = isActiveParam !== 'false'
    const expiryStatus = typeof params.expiryStatus === 'string' ? params.expiryStatus as any : 'all'
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1
    const limit = typeof params.perPage === 'string' ? Math.min(parseInt(params.perPage) || 20, 100) : 20

    const { data: documents, count } = await getAllUserDocuments({
        search,
        documentTypeId,
        isActive,
        expiryStatus,
        page,
        limit
    })

    const { data: documentTypes } = await getDocumentTypes()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h1 className="sr-only">Usuarios - Documentación</h1>
            <PageDescription>
                Listado de documentos del personal. Desde aquí puedes realizar gestiones y descargas masivas.
            </PageDescription>

            <GlobalDocumentsTable
                documents={documents || []}
                documentTypes={documentTypes || []}
                totalCount={count || 0}
                currentPage={page}
                pageSize={limit}
            />
        </div>
    )
}
