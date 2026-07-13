'use client'

import { useState } from 'react'
import { DocumentType, UserDocument } from '@/types/user-documents'
import { UserDocumentsList } from './user-documents-list'
import { UploadDocumentDialog } from './upload-document-dialog'

interface UserDocumentsManagerProps {
    userId: string
    initialDocuments: UserDocument[]
    documentTypes: DocumentType[]
}

export function UserDocumentsManager({ userId, initialDocuments, documentTypes }: UserDocumentsManagerProps) {
    // We rely on Server Actions revalidating paths to update data passed as props by parent server component.
    // However, since this is a client component inside a client form, we might need to handle updates differently 
    // IF the parent doesn't refresh automatically.
    // Fortunately, standard Next.js Server Actions with revalidatePath() inside them will refresh the Server Component payload.
    // BUT since UserForm is a client component, we might not see the refresh if it's not a server component prop update.

    // Actually, `edit/page.tsx` fetches data and passes it to `UserForm`. When `revalidatePath` happens, Next.js refreshes the route.
    // So new props will flow down to `UserEditView` -> `UserForm` -> `UserDocumentsManager`.

    // We can just use props directly.

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Documentación del Usuario</h3>
                    <p className="text-sm text-muted-foreground">Gestione los documentos requeridos, fechas de vigencia y archivos adjuntos.</p>
                </div>
                <UploadDocumentDialog
                    userId={userId}
                    documentTypes={documentTypes}
                />
            </div>

            <UserDocumentsList documents={initialDocuments} userId={userId} />
        </div>
    )
}
