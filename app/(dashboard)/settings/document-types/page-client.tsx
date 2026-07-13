'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentTypesTable } from '@/components/settings/document-types/document-types-table'
import { DocumentTypeDialog } from '@/components/settings/document-types/document-type-dialog'
import { DocumentType } from '@/types/user-documents'

interface DocumentTypesPageClientProps {
    initialData: DocumentType[]
}

export function DocumentTypesPageClient({ initialData }: DocumentTypesPageClientProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Tipo
                </Button>
            </div>

            <DocumentTypesTable data={initialData} />

            <DocumentTypeDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </div>
    )
}
