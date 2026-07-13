'use client'

import { Menu } from "lucide-react"
import { logout } from "@/lib/actions/auth"
import { useUser } from "@/contexts/user-context"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import type { AppRole } from "@/types"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { menuItems } from "@/lib/config/menu"

const ROLE_LABELS: Record<AppRole, string> = {
    'reporta_admin': 'Super Admin',
    'admin_tenant':  'Administrador',
    'supervisor':    'Supervisor',
    'member':        'Miembro',
}

export function DashboardHeader() {
    const { profile, company } = useUser()
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const getPageTitle = (path: string) => {
        // Special case for dashboard
        if (path === '/' || path === '/dashboard') return 'Dashboard'

        // Special case for soporte (before generic menuItems lookup — menu.name is "Soporte" which is shorter)
        if (path === '/soporte/nuevo') return 'Nuevo Ticket'
        if (path === '/soporte') return 'Tickets de Soporte'
        if (path.startsWith('/soporte/')) return 'Detalle de Ticket'

        // Check if path matches a parent directly (no children)
        const directParent = menuItems.find(item => item.href === path)
        if (directParent && !directParent.children) return directParent.name

        // Check if path is a child of a parent
        for (const parent of menuItems) {
            if (parent.children) {
                const child = parent.children.find(c => c.href === path || (c.href !== '/' && path.startsWith(c.href)))
                if (child) {
                    return `${parent.name} - ${child.name}`
                }
            }
        }

        // Special case for system
        if (path === '/sistema/permisos') return 'Permisos por Cargo'
        if (path.startsWith('/sistema')) return 'Sistema'

        // Fallback or specific manual overrides
        const manualMap: Record<string, string> = {
            '/settings': 'Configuración',
            '/users': 'Usuarios - Directorio',
            '/maquinarias': 'Maquinaria - Equipos',
        }

        if (manualMap[path]) return manualMap[path]

        // Default: pretty print last part of path
        return path.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Reporta'
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6" style={process.env.NEXT_PUBLIC_ENV !== 'production' ? { top: '1.5rem' } : undefined}>
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                        >
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0">
                        <DashboardSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            
            <div className="flex-1">
                <h1 className="text-xl font-bold tracking-tight">
                    {getPageTitle(pathname || '/')}
                </h1>
            </div>

            <div className="flex items-center gap-4 md:gap-2 lg:gap-4">
                {mounted && profile && (
                    <div className="hidden md:block text-sm text-right leading-tight">
                        <div className="font-medium">{profile.first_name} {profile.last_name}</div>
                        <div className="text-xs text-muted-foreground">{company?.name || 'Invitado'}</div>
                    </div>
                )}

                {mounted && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full overflow-hidden">
                                <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-[14px] font-bold">
                                    {profile?.first_name?.[0]?.toUpperCase()}{profile?.last_name?.[0]?.toUpperCase()}
                                </div>
                                <span className="sr-only">Usuario</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px]">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-sm">{profile?.first_name} {profile?.last_name}</span>
                                    <span className="text-xs text-muted-foreground">{profile?.role ? ROLE_LABELS[profile.role] : ''}</span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/settings/perfil">Perfil</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <form action={logout}>
                                    <button type="submit" className="w-full text-left cursor-pointer text-red-600 hover:text-red-700">Cerrar Sesión</button>
                                </form>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    )
}
