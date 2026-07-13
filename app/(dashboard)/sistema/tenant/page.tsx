import { getTenants, selectTenant } from "@/lib/actions/tenants"
import Image from "next/image"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, CheckCircle2 } from "lucide-react"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

export default async function TenantPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'reporta_admin') redirect('/')

    const companies = await getTenants()
    const cookieStore = await cookies()
    const currentManagedId = cookieStore.get('managed_tenant_id')?.value

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-semibold">Seleccionar Tenant</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Elige la empresa activa. Los módulos y datos mostrados corresponderán al tenant seleccionado.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {companies.map((company) => {
                    const isSelected = currentManagedId === company.id

                    return (
                        <Card key={company.id} className={isSelected ? "border-primary ring-1 ring-primary" : ""}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{company.name}</CardTitle>
                                {company.logo_url ? (
                                    <div className="relative h-8 w-16">
                                        <Image
                                            src={company.logo_url}
                                            alt={company.name}
                                            fill
                                            className="object-contain"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                )}
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="mb-4">
                                    RUC: {company.ruc || 'No registrado'}
                                </CardDescription>
                                <form action={selectTenant}>
                                    <input type="hidden" name="tenantId" value={company.id} />
                                    <Button
                                        type="submit"
                                        variant={isSelected ? "secondary" : "default"}
                                        className="w-full"
                                        disabled={isSelected}
                                    >
                                        {isSelected ? (
                                            <span className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" /> Activo
                                            </span>
                                        ) : (
                                            "Seleccionar"
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
