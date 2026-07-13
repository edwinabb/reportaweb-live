'use client'

import { useState, useEffect, useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { updateUser } from '@/lib/actions/update-user'
import { getPaises } from '@/lib/actions/catalogos'
import { Profile } from '@/types'
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const schema = z.object({
    firstName: z.string().min(1, 'Requerido'),
    lastName: z.string().min(1, 'Requerido'),
    middleName: z.string().optional(),
    secondLastName: z.string().optional(),
    docType: z.enum(['DNI', 'CE', 'PASSPORT', 'RUC', 'OTHER']),
    docNumber: z.string().min(1, 'Requerido'),
    gender: z.enum(['Masculino', 'Femenino']).optional(),
    birthDate: z.string().optional(),
    nationality: z.string().optional(),
    jobTitleId: z.string().optional(),
    phone: z.string().optional(),
    direccion: z.string().optional(),
    contactoEmergenciaNombre: z.string().optional(),
    contactoEmergenciaParentesco: z.string().optional(),
    contactoEmergenciaCelular: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
    profile: Profile
    jobTitles: { id: string; name: string }[]
}

export function DatosTab({ profile, jobTitles }: Props) {
    const [state, formAction, isPending] = useActionState(updateUser, null)
    const [countries, setCountries] = useState<{ id: string; name: string }[]>([])
    const [loadingCountries, setLoadingCountries] = useState(true)
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        profile.photo_url ? `${profile.photo_url}?t=${Date.now()}` : null
    )

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: profile.first_name ?? '',
            lastName: profile.last_name ?? '',
            middleName: profile.middle_name ?? '',
            secondLastName: profile.second_last_name ?? '',
            docType: profile.doc_type ?? 'DNI',
            docNumber: profile.doc_number ?? '',
            gender: profile.gender ?? 'Masculino',
            birthDate: profile.birth_date ?? '',
            nationality: profile.nationality ?? '',
            jobTitleId: profile.job_title_id ?? '',
            phone: profile.phone ?? '',
            direccion: profile.direccion ?? '',
            contactoEmergenciaNombre: profile.contacto_emergencia_nombre ?? '',
            contactoEmergenciaParentesco: profile.contacto_emergencia_parentesco ?? '',
            contactoEmergenciaCelular: profile.contacto_emergencia_celular ?? '',
        },
    })

    useEffect(() => {
        const saCountries = ['PERU', 'PERÚ', 'ARGENTINA', 'BOLIVIA', 'BRASIL', 'BRAZIL', 'CHILE', 'COLOMBIA', 'ECUADOR', 'GUYANA', 'PARAGUAY', 'SURINAME', 'URUGUAY', 'VENEZUELA']
        getPaises()
            .then((list) => {
                const sorted = (list as { id: string; nombre: string }[]).sort((a, b) => {
                    const nameA = (a.nombre || '').toUpperCase()
                    const nameB = (b.nombre || '').toUpperCase()
                    const aSA = saCountries.includes(nameA)
                    const bSA = saCountries.includes(nameB)
                    if (aSA && !bSA) return -1
                    if (!aSA && bSA) return 1
                    return nameA.localeCompare(nameB)
                })
                const mapped = sorted.map(c => ({ id: c.id, name: c.nombre }))
                setCountries(mapped)

                const currentNat = form.getValues('nationality')
                if (!currentNat) {
                    const peru = mapped.find(c => c.name.toUpperCase() === 'PERU' || c.name.toUpperCase() === 'PERÚ')
                    if (peru) form.setValue('nationality', peru.id)
                } else if (!mapped.find(c => c.id === currentNat)) {
                    const byName = mapped.find(c => c.name.toUpperCase() === currentNat.toUpperCase())
                    form.setValue('nationality', byName?.id ?? '')
                }
            })
            .catch(console.error)
            .finally(() => setLoadingCountries(false))
    }, [form])

    useEffect(() => {
        if (state?.message) {
            if (state.success) {
                toast.success(state.message)
            } else {
                toast.error(state.message)
            }
        }
    }, [state])

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-8">
                <input type="hidden" name="id" value={profile.id} />
                <input type="hidden" name="email" value={profile.email ?? ''} />
                <input type="hidden" name="redirectTo" value="/settings/perfil" />

                {/* Foto de perfil */}
                <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold overflow-hidden shrink-0 border">
                        {photoPreview ? (
                            <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                            <span>{profile.first_name?.[0]}{profile.last_name?.[0]}</span>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1">Foto de perfil</p>
                        <Input
                            type="file"
                            name="photo"
                            accept="image/*"
                            className="max-w-[220px] text-xs"
                            onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) setPhotoPreview(URL.createObjectURL(file))
                            }}
                        />
                    </div>
                </div>

                {/* Nombres */}
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identificación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Primer nombre <span className="text-red-500">*</span></FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="middleName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Segundo nombre</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Primer apellido <span className="text-red-500">*</span></FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="secondLastName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Segundo apellido</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="docType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de documento</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="DNI">DNI</SelectItem>
                                        <SelectItem value="CE">C.E.</SelectItem>
                                        <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                                        <SelectItem value="RUC">RUC</SelectItem>
                                        <SelectItem value="OTHER">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="docNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nro. de documento <span className="text-red-500">*</span></FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="birthDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha de nacimiento</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="nationality" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nacionalidad</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} name={field.name} disabled={loadingCountries}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingCountries ? 'Cargando...' : 'Seleccione país'} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {countries.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Género</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Femenino">Femenino</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="jobTitleId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cargo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione cargo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {jobTitles.map(j => (
                                            <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* Contacto */}
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Email readonly */}
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <Input value={profile.email ?? ''} readOnly disabled className="bg-muted/30" />
                            <p className="text-xs text-muted-foreground">Solo el administrador puede modificarlo</p>
                        </FormItem>
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Teléfono</FormLabel>
                                <FormControl><Input {...field} placeholder="+51 9..." /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="direccion" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Dirección de residencia</FormLabel>
                                <FormControl><Input {...field} placeholder="Av. ..." /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* Contacto de emergencia */}
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contacto de emergencia <span className="normal-case font-normal">(opcional)</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="contactoEmergenciaNombre" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre completo</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="contactoEmergenciaParentesco" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Parentesco</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Pareja">Pareja</SelectItem>
                                        <SelectItem value="Padre">Padre</SelectItem>
                                        <SelectItem value="Madre">Madre</SelectItem>
                                        <SelectItem value="Hermano/a">Hermano/a</SelectItem>
                                        <SelectItem value="Hijo/a">Hijo/a</SelectItem>
                                        <SelectItem value="Otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="contactoEmergenciaCelular" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Celular</FormLabel>
                                <FormControl><Input {...field} placeholder="+51 9..." /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
