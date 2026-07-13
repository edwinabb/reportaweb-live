import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { Globe } from 'lucide-react'
import { getSupabaseContext } from '@/lib/action-context'
import { getEmpresaConfig } from '@/lib/actions/empresa-config'
import { EmpresaTimezoneForm } from '@/components/settings/empresa-timezone-form'

export default async function SettingsEmpresaPage() {
    const { adminClient, user } = await getSupabaseContext()
    if (!adminClient || !user) redirect('/login')

    const config = await getEmpresaConfig()

    return (
        <div className="flex flex-col h-full space-y-6 p-8 max-w-2xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Globe className="h-6 w-6 text-blue-500" />
                    Configuración de Empresa
                </h2>
                <p className="text-muted-foreground mt-1">
                    Ajustes globales del tenant que afectan a todos los usuarios.
                </p>
            </div>

            <Separator />

            <div className="space-y-2">
                <h3 className="font-semibold text-base">Zona horaria</h3>
                <p className="text-sm text-muted-foreground">
                    Define el horario local de la empresa. Todas las fechas y horas registradas
                    (informes, asistencias, reportes) se guardarán en esta zona horaria.
                </p>
            </div>

            <EmpresaTimezoneForm initialTimezone={config.timezone} />
        </div>
    )
}
