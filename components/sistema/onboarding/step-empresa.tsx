'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCompany, createTenantAdminUser } from '@/lib/actions/onboarding'

const TIMEZONES = [
    { value: 'America/Lima', label: 'Lima (UTC-5)' },
    { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
    { value: 'America/Guayaquil', label: 'Guayaquil (UTC-5)' },
    { value: 'America/Caracas', label: 'Caracas (UTC-4)' },
    { value: 'America/Santiago', label: 'Santiago (UTC-3/-4)' },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
    { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
]

function generatePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let pw = ''
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    return pw
}

type Props = {
    tenantId?: string
}

export function StepEmpresa({ tenantId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [showPassword, setShowPassword] = useState(false)
    const [password, setPassword] = useState(() => generatePassword())
    const [timezone, setTimezone] = useState('America/Lima')
    const [docType, setDocType] = useState('DNI')

    function handleGenerate() {
        setPassword(generatePassword())
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        formData.set('adminPassword', password)
        formData.set('timezone', timezone)
        formData.set('adminTipoDoc', docType)

        startTransition(async () => {
            // Step 1: Create company
            const companyResult = await createCompany(formData)
            if (!companyResult.success) {
                toast.error(companyResult.message || 'Error al crear la empresa')
                return
            }
            const newTenantId = companyResult.tenantId!

            // Step 2: Create admin user
            const userResult = await createTenantAdminUser(newTenantId, formData)
            if (!userResult.success) {
                toast.error(userResult.message || 'Error al crear el usuario administrador')
                return
            }

            toast.success('Empresa y administrador creados correctamente')
            router.push(`/sistema/onboarding/${newTenantId}?step=2`)
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Datos de la empresa */}
            <section>
                <h2 className="text-lg font-semibold mb-4">Datos de la empresa</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="companyName">Nombre *</Label>
                        <Input id="companyName" name="companyName" required placeholder="Nombre comercial" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="razonSocial">Razón social</Label>
                        <Input id="razonSocial" name="razonSocial" placeholder="Razón social legal" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ruc">RUC</Label>
                        <Input id="ruc" name="ruc" placeholder="20xxxxxxxxx" maxLength={11} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="companyEmail">Email empresa</Label>
                        <Input id="companyEmail" name="companyEmail" type="email" placeholder="empresa@ejemplo.com" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="companyPhone">Teléfono</Label>
                        <Input id="companyPhone" name="companyPhone" placeholder="+51 xxx xxx xxx" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="timezone">Zona horaria</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                            <SelectTrigger id="timezone">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TIMEZONES.map(tz => (
                                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="pais">País</Label>
                        <Input id="pais" name="pais" placeholder="Perú" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ciudad">Ciudad</Label>
                        <Input id="ciudad" name="ciudad" placeholder="Lima" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input id="direccion" name="direccion" placeholder="Av. Ejemplo 123, Piso 4" />
                    </div>
                </div>
            </section>

            {/* Datos del administrador */}
            <section>
                <h2 className="text-lg font-semibold mb-4">Usuario Administrador</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="adminNombre">Nombre *</Label>
                        <Input id="adminNombre" name="adminNombre" required placeholder="Juan" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="adminApellido">Apellido *</Label>
                        <Input id="adminApellido" name="adminApellido" required placeholder="Pérez" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="adminEmail">Email *</Label>
                        <Input id="adminEmail" name="adminEmail" type="email" required placeholder="admin@empresa.com" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="adminTipoDoc">Tipo documento</Label>
                        <Select value={docType} onValueChange={setDocType}>
                            <SelectTrigger id="adminTipoDoc">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DNI">DNI</SelectItem>
                                <SelectItem value="CE">CE</SelectItem>
                                <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                                <SelectItem value="RUC">RUC</SelectItem>
                                <SelectItem value="OTHER">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="adminNumDoc">Número documento *</Label>
                        <Input id="adminNumDoc" name="adminNumDoc" required placeholder="12345678" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="adminPassword">Contraseña *</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="adminPassword"
                                    name="adminPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button type="button" variant="outline" size="icon" onClick={handleGenerate} title="Generar contraseña">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Guarda esta contraseña antes de continuar.</p>
                    </div>
                </div>
            </section>

            <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Creando...' : 'Crear y continuar →'}
                </Button>
            </div>
        </form>
    )
}
