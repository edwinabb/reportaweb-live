import { UserForm } from '@/components/users/user-form'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default async function CreateUserPage({
    searchParams,
}: {
    searchParams: Promise<{ tercero_id?: string; personal_externo?: string; redirect_to?: string }>
}) {
    const params = await searchParams
    return (
        <div className="flex-1 space-y-4 w-full px-6 py-6">
            <div className="flex items-center space-x-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/users">Usuarios</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Crear Usuario</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Crear Usuario</h2>
                <div className="flex items-center space-x-2">
                    {/* Add secondary actions here if needed */}
                </div>
            </div>
            <div className="space-y-4">
                <UserForm
                    defaultTerceroId={params.tercero_id}
                    defaultPersonalExterno={params.personal_externo === '1'}
                    redirectTo={params.redirect_to}
                />
            </div>
        </div>
    )
}
