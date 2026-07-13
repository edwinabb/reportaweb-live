'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Pencil, Trash, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { deleteProfile, updateUserCredentials } from '@/lib/actions/users'
import { toast } from 'sonner'
import { Profile } from '@/types'
import { useUser } from '@/contexts/user-context'

interface UserActionsProps {
    user: Profile
}

export function UserActions({ user }: UserActionsProps) {
    const [openDelete, setOpenDelete] = useState(false)
    const [openCredentials, setOpenCredentials] = useState(false)
    const [credType, setCredType] = useState<'email' | 'password'>('email')
    const [credValue, setCredValue] = useState('')
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const { profile: currentProfile } = useUser()

    const canManageCredentials = currentProfile?.role === 'admin_tenant' || currentProfile?.role === 'reporta_admin'

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteProfile(user.id)
            if (result.success) {
                toast.success(result.message)
                router.refresh()
            } else {
                toast.error(result.message)
            }
            setOpenDelete(false)
        })
    }

    const handleCredentialUpdate = () => {
        if (!credValue.trim()) {
            toast.error('El valor no puede estar vacío')
            return
        }
        if (credType === 'password' && credValue.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres')
            return
        }
        startTransition(async () => {
            const result = await updateUserCredentials(user.id, credType, credValue.trim())
            if (result.success) {
                toast.success(result.message)
                setOpenCredentials(false)
                setCredValue('')
                router.refresh()
            } else {
                toast.error(result.message)
            }
        })
    }

    const openChangeEmail = () => { setCredType('email'); setCredValue(user.email ?? ''); setOpenCredentials(true) }
    const openChangePassword = () => { setCredType('password'); setCredValue(''); setOpenCredentials(true) }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(user.id)}
                    >
                        Copiar ID usuario
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href={`/users/${user.id}/edit`} className="flex w-full items-center">
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Link>
                    </DropdownMenuItem>
                    {canManageCredentials && (
                        <>
                            <DropdownMenuItem onClick={openChangeEmail}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Cambiar correo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={openChangePassword}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Cambiar contraseña
                            </DropdownMenuItem>
                        </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => setOpenDelete(true)}
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        Desactivar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete confirmation */}
            <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará al usuario <b>{user.first_name} {user.last_name}</b>, revocando su acceso al sistema inmediatamente. Sus datos históricos se conservarán.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isPending}
                        >
                            {isPending ? 'Desactivando...' : 'Desactivar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Credentials dialog */}
            <Dialog open={openCredentials} onOpenChange={setOpenCredentials}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>
                            {credType === 'email' ? 'Cambiar correo electrónico' : 'Cambiar contraseña'}
                        </DialogTitle>
                        <DialogDescription>
                            {credType === 'email'
                                ? `Actualiza el correo de ${user.first_name} ${user.last_name}.`
                                : `Establece una nueva contraseña para ${user.first_name} ${user.last_name}. Mínimo 8 caracteres.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="cred-value">
                                {credType === 'email' ? 'Nuevo correo' : 'Nueva contraseña'}
                            </Label>
                            <Input
                                id="cred-value"
                                type={credType === 'password' ? 'password' : 'email'}
                                value={credValue}
                                onChange={e => setCredValue(e.target.value)}
                                placeholder={credType === 'email' ? 'usuario@empresa.com' : 'Mínimo 8 caracteres'}
                                disabled={isPending}
                                autoComplete={credType === 'password' ? 'new-password' : 'email'}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenCredentials(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCredentialUpdate} disabled={isPending || !credValue.trim()}>
                            {isPending ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
