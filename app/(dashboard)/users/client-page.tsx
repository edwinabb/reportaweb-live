'use client'

import { Profile } from "@/types"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Trash, RotateCcw, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
// import {
//     AlertDialog,
//     AlertDialogAction,
//     AlertDialogCancel,
//     AlertDialogContent,
//     AlertDialogDescription,
//     AlertDialogFooter,
//     AlertDialogHeader,
//     AlertDialogTitle,
// } from "@/components/ui/alert-dialog"
// Users usually aren't deleted via simple API in this project?
// lib/actions/users.ts usually has create/update but maybe not delete/restore exposed yet?
// I checked users.ts, it only had getProfiles. 
// I need to check if deleteProfile exists or if I need to create it.
// Assuming for now I need to standardise UI, I'll allow "View" or "Edit" if available.
// If delete is not clear, I won't implement it yet or I will add it to users.ts.
// User requested: "funcionalidad editar, borrar, restaurar funcionando correctamente" for Usuarios too.
// So I MUST implement these actions in users.ts.

import { restoreProfile } from "@/lib/actions/users"
import { UserActions } from "@/components/users/user-actions"

interface UsersClientProps {
    users: Profile[]
    isTrash?: boolean
}

export function UsersClientPage({ users, isTrash = false }: UsersClientProps) {
    const router = useRouter()

    const filteredUsers = isTrash
        ? users.filter(u => !u.is_active)
        : users.filter(u => u.is_active)

    const columns: ColumnDef<Profile>[] = [
        {
            accessorKey: "full_name",
            header: "Nombre",
        },
        {
            accessorKey: "email",
            header: "Email",
        },
        {
            accessorKey: "cargo",
            header: "Cargo",
            cell: ({ row }) => row.original.cargo
                ? <span className="text-sm">{row.original.cargo}</span>
                : <span className="text-muted-foreground text-xs">—</span>
        },
        {
            accessorKey: "role",
            header: "Rol",
            cell: ({ row }) => <Badge variant="outline">{row.getValue("role")}</Badge>
        },
        {
            accessorKey: "status",
            header: "Estado",
            cell: ({ row }) => row.original.is_active ? <Badge className="bg-green-500">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original

                const handleRestore = async () => {
                    if (confirm("¿Restaurar este usuario?")) {
                        const res = await restoreProfile(user.id)
                        if (res.success) {
                            toast.success("Usuario restaurado")
                            router.refresh()
                        } else {
                            toast.error(res.message)
                        }
                    }
                }

                if (isTrash) {
                    return (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRestore}
                            className="bg-green-50 hover:bg-green-100 text-green-700"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restaurar
                        </Button>
                    )
                }

                return <UserActions user={user} />
            }
        }
    ]

    return (
        <div className="flex flex-col gap-4">

            <div className="rounded-lg border p-6 bg-background">
                <DataTable
                    columns={columns}
                    data={filteredUsers}
                    searchKey="email"
                    customAction={
                        <div className="flex items-center gap-2">
                            <Button
                                variant={!isTrash ? "default" : "outline"}
                                size="sm"
                                onClick={() => router.push('/users')}
                            >
                                Activos
                            </Button>
                            <Button
                                variant={isTrash ? "default" : "outline"}
                                size="sm"
                                onClick={() => router.push('/users?view=trash')}
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                Papelera
                            </Button>
                            {!isTrash && (
                                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => router.push('/users/create')}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nuevo Usuario
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>
        </div>
    )
}
