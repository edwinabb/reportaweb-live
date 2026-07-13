import { Separator } from '@/components/ui/separator'
import { getCatalogoEpp } from '@/lib/actions/epp'
import { CatalogoEppClient } from './page-client'

export default async function CatalogoEppPage() {
    const data = await getCatalogoEpp()

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">EPP · Catálogo</h2>
                    <p className="text-muted-foreground">
                        Listado maestro de EPP y equipos de emergencia. Define vida útil por días.
                    </p>
                </div>
            </div>

            <Separator />

            <CatalogoEppClient initialData={data as any[]} />
        </div>
    )
}
