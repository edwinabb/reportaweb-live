import { getAllUserDocuments } from '@/lib/actions/user-documents-query'
import { getDocumentTypes } from '@/lib/actions/document-types'
import { GlobalDocumentsTable } from '@/components/users/documents/global-documents-table'
import { BulkUploadDocumentDialog } from '@/components/users/documents/bulk-upload-document-dialog'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export const dynamic = 'force-dynamic'

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
    const limit = 20

    const { data: documents, count } = await getAllUserDocuments({
        search,
        documentTypeId,
        isActive,
        expiryStatus,
        page,
        limit
    })

    const { data: documentTypes } = await getDocumentTypes()

    const totalPages = count ? Math.ceil(count / limit) : 1

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/users">Usuarios</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Gestión de Documentos</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex flex-col space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Documentos</h2>
                <p className="text-muted-foreground text-sm">
                    Listado de documentos del personal. Desde aquí puedes realizar gestiones y descargas masivas.
                </p>
            </div>

            <GlobalDocumentsTable
                documents={documents || []}
                documentTypes={documentTypes || []}
                totalCount={count || 0}
                currentPage={page}
                totalPages={totalPages}
            />
        </div>
    )
}
