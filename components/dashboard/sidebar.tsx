'use client'

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import Image from "next/image"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { menuItems } from "@/lib/config/menu"
import { getStorageUrl } from "@/lib/utils/storage"
import packageJson from "@/package.json"

export function DashboardSidebar() {
    const pathname = usePathname()
    const { user, profile, company, puedeVer } = useUser()
    const [openItem, setOpenItem] = useState<string | undefined>(undefined)
    const [prevActiveChildHref, setPrevActiveChildHref] = useState<string | undefined>(undefined)
    const [isCollapsed, setIsCollapsed] = useState(false)

    const getActiveChild = (path: string) => {
        const allChildren = menuItems.flatMap(item => item.children || [])
        
        // Priority 1: Exact match
        const exactMatch = allChildren.find(c => c.href === path)
        if (exactMatch) return exactMatch

        // Priority 2: Prefix match (e.g. /maquinarias/123/edit matches /maquinarias)
        const matches = allChildren.filter(child => 
            child.href !== '/' && path.startsWith(child.href + '/')
        )
        return matches.sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0))[0]
    }

    const activeChild = getActiveChild(pathname)

    // Sync openItem when path changes, but allow manual override
    if (activeChild?.href !== prevActiveChildHref) {
        setPrevActiveChildHref(activeChild?.href)
        if (pathname?.startsWith('/sistema')) {
            if (openItem !== 'Sistema') setOpenItem('Sistema')
        } else {
            const currentParent = menuItems.find(item =>
                item.children?.some(child => child.href === activeChild?.href)
            )
            if (currentParent && openItem !== currentParent.name) {
                setOpenItem(currentParent.name)
            }
        }
    }

    const isSystemAdmin = profile?.role === 'reporta_admin'

    // Filtra ítems según permisos del cargo; sin recurso = siempre visible
    const visibleMenuItems = menuItems.filter(item =>
        !item.recurso || puedeVer(item.recurso)
    )

    const isTestServer = process.env.NEXT_PUBLIC_ENV !== 'production'

    return (
        <aside
            className={cn(
                "hidden border-r bg-background md:flex md:flex-col md:fixed md:inset-y-0 z-20 transition-all duration-300",
                isCollapsed ? "md:w-16" : "md:w-52"
            )}
            style={isTestServer ? { top: '1.5rem' } : undefined}
        >
            <div className={cn(
                "flex h-16 items-center border-b transition-all duration-300 relative",
                isCollapsed ? "justify-center px-0" : "px-3 justify-between"
            )}>
                <button
                    type="button"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "p-1.5 hover:bg-accent rounded-md transition-all text-muted-foreground hover:text-foreground shrink-0 z-30",
                        isCollapsed ? "absolute -right-3 top-6 bg-background border shadow-sm rounded-full p-0.5" : "order-first"
                    )}
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-4 w-4" />}
                </button>

                <div className={cn(
                    "flex items-center gap-2 overflow-hidden flex-1 group transition-transform cursor-pointer",
                    isCollapsed ? "justify-center" : "px-2"
                )} onClick={() => (window.location.href = '/')}>
                    {company?.logo_url ? (
                        <div className={cn(
                            "relative transition-all duration-300 shadow-sm rounded-lg overflow-hidden h-9 w-28 min-w-9",
                            isCollapsed ? "mx-auto w-9 h-9 border bg-white" : "w-full border-none"
                        )}>
                            <Image
                                src={getStorageUrl(company.logo_url, 'logos')}
                                alt={company?.name || "Logo"}
                                fill
                                className={cn(
                                    "object-contain",
                                    isCollapsed ? "p-1.5" : "object-left"
                                )}
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className={cn(
                            "flex items-center",
                            isCollapsed ? "h-9 w-9 justify-center rounded-lg border bg-orange-500 text-white font-bold text-[10px]" : "gap-2"
                        )}>
                            {isCollapsed ? (
                                <span>
                                    {company?.name
                                        ? company.name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
                                        : 'RA'}
                                </span>
                            ) : (
                                <span className="text-base text-orange-600 truncate" style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)', fontWeight: 500, letterSpacing: '0.12em' }}>
                                    {company?.name || 'REPORTAR.APP'}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className={cn("grid items-start text-sm font-medium", isCollapsed ? "gap-2 px-2" : "gap-1 px-4")}>
                    <Accordion
                        type="single"
                        collapsible
                        value={isCollapsed ? undefined : openItem}
                        onValueChange={setOpenItem}
                        className="w-full"
                    >
                        {visibleMenuItems.map((item) => {
                            const Icon = item.icon
                            const hasChildren = item.children && item.children.length > 0
                            const sectionHeader = item.sectionLabel && (
                                isCollapsed
                                    ? <div key={`sep-${item.name}`} className="border-t border-gray-100 my-2 mx-1" />
                                    : <div key={`sec-${item.name}`} className="mt-3 mb-1 px-3 flex items-center gap-2">
                                        <span className="text-[9.5px] font-semibold text-muted-foreground/50 uppercase tracking-widest whitespace-nowrap">{item.sectionLabel}</span>
                                        <div className="flex-1 h-px bg-gray-100" />
                                      </div>
                            )

                            if (!hasChildren || isCollapsed) {
                                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href!))
                                return (
                                    <React.Fragment key={item.name}>
                                        {sectionHeader}
                                        <Link
                                            href={hasChildren && isCollapsed ? item.children![0].href : item.href!}
                                            className={cn(
                                                "flex items-center rounded-lg transition-all hover:bg-orange-500/5 hover:text-foreground group relative",
                                                isCollapsed ? "justify-center p-2.5 h-10 w-10 mx-auto" : "gap-3 px-3 py-2",
                                                isActive ? "bg-orange-500/10 text-orange-600 font-semibold" : "text-muted-foreground"
                                            )}
                                            title={isCollapsed ? item.name : undefined}
                                        >
                                            <Icon className="h-[18px] w-[18px] shrink-0" />
                                            {!isCollapsed && <span className="truncate text-xs font-medium">{item.name}</span>}
                                            {isCollapsed && isActive && (
                                                <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full" />
                                            )}
                                        </Link>
                                    </React.Fragment>
                                )
                            }

                            const isAnyChildActive = item.children?.some(child => pathname === child.href || (child.href !== '/' && pathname?.startsWith(child.href)))

                            return (
                                <React.Fragment key={item.name}>
                                {sectionHeader}
                                <AccordionItem value={item.name} className="border-none py-0">
                                    <AccordionTrigger className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-1.5 text-muted-foreground transition-all hover:bg-orange-500/5 hover:text-foreground hover:no-underline",
                                        "group [&>svg]:hidden h-9",
                                        isAnyChildActive && "text-foreground font-semibold"
                                    )}>
                                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                            <Icon className={cn(
                                                "h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110",
                                                isAnyChildActive ? "text-orange-500" : "text-muted-foreground"
                                            )} />
                                            <span className="truncate text-xs font-medium">{item.name}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-1 pt-0 mt-0">
                                        <div className="ml-5 pl-3 border-l-2 border-orange-500/20 flex flex-col gap-0.5 mt-0.5">
                                            {item.children?.map((child) => {
                                                const isChildActive = child.href === activeChild?.href
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        href={child.href}
                                                        className={cn(
                                                            "flex items-center gap-3 rounded-md px-3 py-1 transition-all hover:bg-orange-500/5 hover:text-foreground h-7",
                                                            isChildActive ? "text-orange-600 font-medium bg-orange-500/10" : "text-muted-foreground"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-1 h-1 rounded-full transition-all shrink-0",
                                                            isChildActive ? "bg-orange-500 scale-125" : "bg-muted-foreground/30"
                                                        )} />
                                                        <span className="truncate text-[12.5px]">{child.name}</span>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                </React.Fragment>
                            )
                        })}
                    </Accordion>

                    {isSystemAdmin && (
                        <>
                            {isCollapsed
                                ? <div className="border-t border-gray-100 my-2 mx-1" />
                                : <div className="mt-3 mb-1 px-3 flex items-center gap-2">
                                    <span className="text-[9.5px] font-semibold text-muted-foreground/50 uppercase tracking-widest whitespace-nowrap">SISTEMA</span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                  </div>
                            }

                            {/* En modo colapsado: icono Shield que lleva a /sistema */}
                            {isCollapsed && (
                                <Link
                                    href="/sistema"
                                    className={cn(
                                        "flex items-center rounded-lg transition-all hover:bg-primary/10 hover:text-primary justify-center p-2.5 h-10 w-10 mx-auto",
                                        pathname?.startsWith('/sistema') ? "bg-primary/10 text-primary" : "text-muted-foreground"
                                    )}
                                    title="Sistema"
                                >
                                    <ShieldCheck className="h-[18px] w-[18px]" />
                                </Link>
                            )}

                            {/* En modo expandido: cabecera "Sistema" + ítems según rol */}
                            {!isCollapsed && (
                                <>
                                    <div className="flex items-center gap-2 px-3 py-1.5">
                                        <ShieldCheck className={cn("h-[18px] w-[18px] shrink-0", pathname?.startsWith('/sistema') ? "text-primary" : "text-muted-foreground")} />
                                        <span className={cn("text-xs font-medium", pathname?.startsWith('/sistema') ? "text-foreground font-semibold" : "text-muted-foreground")}>Sistema</span>
                                    </div>
                                    <div className="ml-5 pl-3 border-l-2 border-primary/20 flex flex-col gap-0.5">
                                        {(profile?.role === 'reporta_admin'
                                            ? [
                                                { name: 'Gestión',    href: '/sistema' },
                                                { name: 'Tenant',     href: '/sistema/tenant' },
                                                { name: 'Permisos',   href: '/sistema/permisos' },
                                                { name: 'Onboarding', href: '/sistema/onboarding' },
                                                { name: 'Formatos',   href: '/formatos' },
                                              ]
                                            : [
                                                { name: 'Permisos',   href: '/sistema/permisos' },
                                                { name: 'Formatos',   href: '/formatos' },
                                              ]
                                        ).map(child => {
                                            const isChildActive = pathname === child.href || (child.href !== '/sistema' && pathname?.startsWith(child.href))
                                            return (
                                                <Link
                                                    key={child.name}
                                                    href={child.href}
                                                    className={cn(
                                                        "flex items-center gap-3 rounded-md px-3 py-1 transition-all hover:bg-primary/5 hover:text-foreground h-7",
                                                        isChildActive ? "text-primary font-medium bg-primary/10" : "text-muted-foreground"
                                                    )}
                                                >
                                                    <div className={cn("w-1 h-1 rounded-full shrink-0", isChildActive ? "bg-primary scale-125" : "bg-muted-foreground/30")} />
                                                    <span className="truncate text-[12.5px]">{child.name}</span>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </nav>
            </div>
            {!isCollapsed && (
                <div className="border-t px-4 py-2 text-center">
                    <p className="text-[10px] text-muted-foreground tracking-widest" style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)', fontWeight: 500 }}>REPORTAR.APP</p>
                    <p className="text-[10px] text-muted-foreground/60">v{packageJson.version}</p>
                </div>
            )}
        </aside>
    )
}
