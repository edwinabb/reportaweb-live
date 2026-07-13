import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

import { getFormatoById, getVersionById } from '@/lib/actions/formatos'
import { Button } from '@/components/ui/button'
import { VersionEditor } from '@/components/formatos/version-editor'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Editor de versión | Formatos — Reporta.la',
}

export default async function VersionEditorPage({
    params,
}: {
    params: Promise<{ id: string; versionId: string }>
}) {
    const { id, versionId } = await params
    const [formato, version] = await Promise.all([
        getFormatoById(id),
        getVersionById(versionId),
    ])

    if (!formato || !version || version.formato_id !== formato.id) {
        return notFound()
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/formatos/${formato.id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a {formato.codigo}
                    </Link>
                </Button>
            </div>
            <VersionEditor formato={formato} version={version} />
        </div>
    )
}
