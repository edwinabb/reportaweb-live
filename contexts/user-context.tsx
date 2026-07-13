'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { getActiveTenantId } from '@/lib/actions/tenants'
import { AppRole } from '@/types'

type Profile = {
    id: string
    tenant_id: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
    role: AppRole | null
}

type Company = {
    id: string
    name: string
    logo_url: string | null
    timezone: string
}

type UserContextType = {
    user: User | null
    profile: Profile | null
    company: Company | null
    isLoading: boolean
    /** IANA timezone of the current tenant, e.g. 'America/Lima'. */
    timezone: string
    /** True si el pathname debería estar visible para el cargo actual. */
    puedeVer: (ruta: string) => boolean
    refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const COOKIE_BLOCKED = 'rw3_bloqueadas'

function leerRutasBloqueadasDeCookie(): string[] {
    if (typeof document === 'undefined') return []
    const cookieEntry = document.cookie
        .split('; ')
        .find(row => row.startsWith(COOKIE_BLOCKED + '='))
    if (!cookieEntry) return []
    try {
        const raw = cookieEntry.split('=').slice(1).join('=')
        return JSON.parse(decodeURIComponent(raw)) as string[]
    } catch {
        return []
    }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [company, setCompany] = useState<Company | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [rutasBloqueadas, setRutasBloqueadas] = useState<string[]>([])

    const supabase = useMemo(() => createClient(), [])

    const fetchUserData = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data: { user: currentUser }, error } = await supabase.auth.getUser()

            if (error || !currentUser) {
                setUser(null)
                setProfile(null)
                setCompany(null)
                setRutasBloqueadas([])
                return
            }

            setUser(currentUser)

            // Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single()

            if (profileData) {
                setProfile(profileData)

                // Leer el tenant activo vía server action (soporta cookie httpOnly)
                const activeTenantId = await getActiveTenantId()

                if (activeTenantId) {
                    const { data: companyData } = await supabase
                        .from('companies')
                        .select('id, name, logo_url, timezone')
                        .eq('id', activeTenantId)
                        .single()

                    if (companyData) {
                        setCompany({
                            ...companyData,
                            timezone: companyData.timezone ?? 'America/Lima',
                        })
                    }
                }
            }

            // Leer rutas bloqueadas desde la cookie que fijó el middleware.
            // La cookie se establece antes de que React hidrate, así que ya
            // está disponible aquí (httpOnly:false → document.cookie la expone).
            setRutasBloqueadas(leerRutasBloqueadasDeCookie())

        } catch (error) {
            console.error('Error loading user data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchUserData()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user?.id !== user?.id) {
                    fetchUserData()
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null)
                setProfile(null)
                setCompany(null)
                setRutasBloqueadas([])
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [fetchUserData, supabase, user?.id])

    /** Retorna true si el item del menú con esa ruta debería mostrarse. */
    const puedeVer = useCallback((ruta: string): boolean => {
        if (!ruta || ruta === '/') return true                   // dashboard siempre
        if (rutasBloqueadas.length === 0) return true            // sin restricciones
        return !rutasBloqueadas.some(bloqueada =>
            ruta === bloqueada ||
            ruta.startsWith(bloqueada + '/') ||
            ruta.startsWith(bloqueada)
        )
    }, [rutasBloqueadas])

    return (
        <UserContext.Provider value={{
            user, profile, company, isLoading, puedeVer, refreshProfile: fetchUserData,
            timezone: company?.timezone ?? 'America/Lima',
        }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}
