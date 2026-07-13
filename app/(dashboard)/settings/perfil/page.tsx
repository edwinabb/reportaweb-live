import { redirect } from 'next/navigation'
import { getSupabaseContext } from '@/lib/action-context'
import { getProfileById } from '@/lib/actions/users'
import { getUserDocuments } from '@/lib/actions/user-documents'
import { getDocumentTypes } from '@/lib/actions/document-types'
import { getJobTitles } from '@/lib/actions/catalogos'
import { PerfilPageClient } from '@/components/perfil/perfil-page-client'

export default async function PerfilPage() {
    const { adminClient, user } = await getSupabaseContext()
    if (!adminClient || !user) redirect('/login')

    const [profile, documentsResult, typesResult, jobTitles] = await Promise.all([
        getProfileById(user.id),
        getUserDocuments(user.id),
        getDocumentTypes(),
        getJobTitles(),
    ])

    if (!profile) {
        return (
            <div className="flex flex-col h-full space-y-6 p-8">
                <h2 className="text-lg font-semibold">Mi Perfil</h2>
                <p className="text-muted-foreground text-sm">No se encontró tu perfil. Contactá al administrador.</p>
            </div>
        )
    }

    const jobTitleName = (jobTitles as { id: string; name: string }[]).find(j => j.id === profile.job_title_id)?.name

    return (
        <div className="flex flex-col h-full p-6 md:p-8 max-w-3xl mx-auto w-full">
            <PerfilPageClient
                profile={profile}
                jobTitles={jobTitles as { id: string; name: string }[]}
                jobTitleName={jobTitleName}
                initialDocuments={documentsResult.data || []}
                documentTypes={typesResult.data || []}
            />
        </div>
    )
}
