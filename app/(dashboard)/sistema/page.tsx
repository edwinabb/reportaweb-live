import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Building2, UserCheck } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export default async function SistemaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role ?? ''
    if (!['reporta_admin', 'admin_tenant'].includes(role)) redirect('/')

    const isReportaAdmin = role === 'reporta_admin'

    // Tenant activo
    const cookieStore = await cookies()
    const managedId = cookieStore.get('managed_tenant_id')?.value
    let activeTenant: { name: string; ruc: string | null } | null = null
    if (managedId) {
        const { data } = await supabase.from('companies').select('name, ruc').eq('id', managedId).single()
        activeTenant = data
    }

    return (
        <div className="flex flex-col gap-6">
            {isReportaAdmin && activeTenant && (
                <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>Tenant activo: <strong>{activeTenant.name}</strong>{activeTenant.ruc ? ` — RUC ${activeTenant.ruc}` : ''}</span>
                    <Link href="/sistema/tenant" className="ml-auto text-primary text-xs hover:underline">Cambiar</Link>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isReportaAdmin && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tenant</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="mb-4">
                                Cambia la empresa activa para operar en su contexto.
                            </CardDescription>
                            <Link href="/sistema/tenant">
                                <Button variant="outline" size="sm" className="w-full">
                                    Seleccionar empresa
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Permisos por Cargo</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <CardDescription className="mb-4">
                            Configure qué módulos puede acceder cada cargo del sistema.
                        </CardDescription>
                        <Link href="/sistema/permisos">
                            <Button variant="outline" size="sm" className="w-full">
                                Configurar permisos
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {isReportaAdmin && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Onboarding</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="mb-4">
                                Carga inicial de datos para nuevos tenants.
                            </CardDescription>
                            <Link href="/sistema/onboarding">
                                <Button variant="outline" size="sm" className="w-full">
                                    Ver onboarding
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
