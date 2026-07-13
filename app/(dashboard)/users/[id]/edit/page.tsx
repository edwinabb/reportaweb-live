import { UserForm } from '@/components/users/user-form'
import { getProfileById } from '@/lib/actions/users'
import { getUserDocuments } from '@/lib/actions/user-documents'
import { getDocumentTypes } from '@/lib/actions/document-types'
import { notFound } from 'next/navigation'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Parallel fetching for performance
    const [user, documentsResult, typesResult] = await Promise.all([
        getProfileById(id),
        getUserDocuments(id),
        getDocumentTypes()
    ])

    if (!user) {
        notFound()
    }

    return (
        <div className="flex flex-col gap-4">

            <div className="flex flex-col items-center">
                <div className="w-full">
                    <div className="rounded-lg border p-4 bg-background">
                        <UserForm
                            user={user}
                            initialDocuments={documentsResult.data || []}
                            documentTypes={typesResult.data || []}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
