'use client'

import Image from 'next/image'
import { Profile } from '@/types'
import { DocumentType, UserDocument } from '@/types/user-documents'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserDocumentsManager } from '@/components/users/documents/user-documents-manager'
import { DatosTab } from './datos-tab'
import { SeguridadTab } from './seguridad-tab'
import { getStorageUrl } from '@/lib/utils/storage'
import { useUser } from '@/contexts/user-context'

const ROL_LABELS: Record<string, string> = {
    reporta_admin: 'Super Admin',
    admin_tenant: 'Administrador',
    supervisor: 'Operador',
    member: 'Miembro',
}

interface Props {
    profile: Profile
    jobTitles: { id: string; name: string }[]
    jobTitleName?: string
    initialDocuments: UserDocument[]
    documentTypes: DocumentType[]
}

export function PerfilPageClient({ profile, jobTitles, jobTitleName, initialDocuments, documentTypes }: Props) {
    const { company } = useUser()
    const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    const photoUrl = profile.photo_url ? getStorageUrl(profile.photo_url, 'usuarios') : null

    return (
        <div className="space-y-6">
            {/* Header minimalista */}
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold overflow-hidden shrink-0 border shadow-sm">
                    {photoUrl ? (
                        <Image src={`${photoUrl}?t=${Date.now()}`} alt="Foto" width={48} height={48} className="w-full h-full object-cover" unoptimized />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-base font-semibold leading-none">
                            {profile.first_name} {profile.last_name}
                        </h1>
                        {profile.role && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                {ROL_LABELS[profile.role] ?? profile.role}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {jobTitleName && <span>{jobTitleName}</span>}
                        {jobTitleName && company?.name && <span className="mx-1">·</span>}
                        {company?.name && <span>{company.name}</span>}
                    </p>
                    {profile.email && (
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="datos">
                <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto gap-0">
                    <TabsTrigger
                        value="datos"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-foreground data-[state=active]:bg-transparent px-4 pb-2 text-sm font-medium text-muted-foreground"
                    >
                        Datos personales
                    </TabsTrigger>
                    <TabsTrigger
                        value="seguridad"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-foreground data-[state=active]:bg-transparent px-4 pb-2 text-sm font-medium text-muted-foreground"
                    >
                        Seguridad
                    </TabsTrigger>
                    <TabsTrigger
                        value="documentos"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-foreground data-[state=active]:bg-transparent px-4 pb-2 text-sm font-medium text-muted-foreground"
                    >
                        Documentos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="datos" className="pt-6">
                    <DatosTab profile={profile} jobTitles={jobTitles} />
                </TabsContent>

                <TabsContent value="seguridad" className="pt-6">
                    <SeguridadTab profile={profile} />
                </TabsContent>

                <TabsContent value="documentos" className="pt-6">
                    <UserDocumentsManager
                        userId={profile.id}
                        initialDocuments={initialDocuments}
                        documentTypes={documentTypes}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
