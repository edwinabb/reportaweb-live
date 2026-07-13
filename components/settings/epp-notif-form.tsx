"use client"

import { useState, useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { updateEppNotifConfig } from "@/lib/actions/notificaciones-config"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface TenantUser {
    id: string
    first_name: string | null
    last_name: string | null
    role: string | null
}

interface Props {
    users: TenantUser[]
    initialSelected: string[]
}

export function EppNotifForm({ users, initialSelected }: Props) {
    const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
    const [isPending, startTransition] = useTransition()

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSave = () => {
        startTransition(async () => {
            const res = await updateEppNotifConfig(Array.from(selected))
            if (res.success) toast.success(res.message)
            else toast.error(res.message)
        })
    }

    const roleLabel = (role: string | null) => {
        if (role === 'admin_tenant') return 'Administrador'
        if (role === 'supervisor') return 'Supervisor'
        if (role === 'reporta_admin') return 'Reporta Admin'
        return role ?? ''
    }

    return (
        <div className="space-y-6">
            <div className="border rounded-lg divide-y">
                {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                        <Checkbox
                            id={`notif-${u.id}`}
                            checked={selected.has(u.id)}
                            onCheckedChange={() => toggle(u.id)}
                        />
                        <Label htmlFor={`notif-${u.id}`} className="flex-1 cursor-pointer">
                            <span className="font-medium">{u.first_name} {u.last_name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({roleLabel(u.role)})</span>
                        </Label>
                    </div>
                ))}
                {users.length === 0 && (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                        No hay usuarios configurados en el tenant.
                    </div>
                )}
            </div>

            <Button onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
            </Button>
        </div>
    )
}
