'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Lock, Shield } from 'lucide-react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ReAuthDialog } from '@/components/common/re-auth-dialog'
import { UserFormValues } from './user-form'

interface UserProfileFieldsProps {
    form: UseFormReturn<UserFormValues>
    isEdit: boolean
    isPending: boolean
    photoPreview: string | null
    signaturePreview: string | null
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, setPreview: (url: string | null) => void) => void
    setPhotoPreview: (url: string | null) => void
    setSignaturePreview: (url: string | null) => void
    countries: { id: string, name: string }[]
    loadingCountries: boolean
    jobTitles: { id: string, name: string }[]
    isLoadingJobTitles: boolean
    /** Modo self-service (usuario editando su propio perfil) — oculta rol y otros campos admin */
    selfService?: boolean
}

export function UserProfileFields({
    form,
    isEdit,
    isPending,
    photoPreview,
    signaturePreview,
    handleFileChange,
    setPhotoPreview,
    setSignaturePreview,
    countries,
    loadingCountries,
    jobTitles,
    isLoadingJobTitles,
    selfService = false,
}: UserProfileFieldsProps) {
    const [unlockSig, setUnlockSig] = useState(false)
    const [unlockPin, setUnlockPin] = useState(false)
    const [reauthTarget, setReauthTarget] = useState<'sig' | 'pin' | null>(null)

    return (
        <div className="space-y-6">
            {/* SECCIÓN SUPERIOR: FOTO Y GÉNERO */}
            <div className="flex flex-col md:flex-row items-center gap-8 bg-muted/20 p-6 rounded-xl border border-dashed mb-8">
                <div className="flex-1 flex flex-col items-center gap-4">
                    <FormLabel className="text-lg font-semibold">Foto de Perfil</FormLabel>
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-background overflow-hidden bg-muted flex items-center justify-center shadow-lg transition-all group-hover:border-primary">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">👤</span>
                            )}
                        </div>
                        <Input
                            type="file"
                            name="photo"
                            accept="image/*"
                            className="mt-4 max-w-[200px]"
                            onChange={(e) => handleFileChange(e, setPhotoPreview)}
                        />
                    </div>
                </div>

                <div className="w-full md:w-64">
                    <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-lg font-semibold">Género <span className="text-red-500 ml-1">*</span></FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                    <FormControl><SelectTrigger className="h-12 text-lg"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Femenino">Femenino</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombres y Apellidos */}
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Primer Nombre <span className="text-red-500 ml-1">*</span></FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Segundo Nombre</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Primer Apellido <span className="text-red-500 ml-1">*</span></FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="secondLastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Segundo Apellido</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Identificación */}
                <FormField
                    control={form.control}
                    name="docType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo Documento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="DNI">DNI</SelectItem>
                                    <SelectItem value="CE">C.E.</SelectItem>
                                    <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                                    <SelectItem value="RUC">RUC</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="docNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nro. Documento <span className="text-red-500 ml-1">*</span></FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Datos de Contacto */}
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email {!selfService && <span className="text-red-500 ml-1">*</span>}</FormLabel>
                            <FormControl><Input type="email" {...field} readOnly={selfService} disabled={selfService} /></FormControl>
                            {selfService && <p className="text-xs text-muted-foreground">El email solo puede ser modificado por un administrador.</p>}
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Otros Datos */}
                <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>País de Nacionalidad</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                name={field.name}
                                disabled={loadingCountries}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingCountries ? "Cargando..." : "Seleccione país"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {countries.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha Nacimiento</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="jobTitleId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cargo / Puesto <span className="text-red-500 ml-1">*</span></FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                name={field.name}
                                disabled={isLoadingJobTitles}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingJobTitles ? "Cargando..." : "Seleccione un cargo"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {jobTitles.map((job) => (
                                        <SelectItem key={job.id} value={job.id}>
                                            {job.name}
                                        </SelectItem>
                                    ))}
                                    {jobTitles.length === 0 && !isLoadingJobTitles && (
                                        <SelectItem value="none" disabled>No hay cargos disponibles</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {!selfService && (
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rol Sistema</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="admin_tenant">Administrador</SelectItem>
                                        <SelectItem value="supervisor">Operador</SelectItem>
                                        <SelectItem value="member">Visualizador</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {!isEdit && (
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contraseña <span className="text-xs font-normal text-muted-foreground ml-1">(opcional)</span></FormLabel>
                                <FormControl><Input type="password" placeholder="Si no ingresas, el usuario recibirá un email para crearla" {...field} /></FormControl>
                                <p className="text-xs text-muted-foreground">El usuario recibirá un correo de bienvenida con un link para configurar su contraseña.</p>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>


            {/* CONTACTO */}
            <div className="space-y-4 border rounded-xl p-6 bg-muted/10">
                <h3 className="text-base font-semibold">Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="direccion"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Dirección de residencia</FormLabel>
                                <FormControl><Input {...field} placeholder="Av. ..." /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Contacto de emergencia (opcional)</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="contactoEmergenciaNombre"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre completo</FormLabel>
                                    <FormControl><Input {...field} placeholder="Nombre familiar" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactoEmergenciaParentesco"
                            render={({ field }) => (
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
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactoEmergenciaCelular"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Celular</FormLabel>
                                    <FormControl><Input {...field} placeholder="+51 9..." /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* SEGURIDAD — PIN + Firma protegidos con re-auth */}
            {isEdit && (
                <div className="space-y-4 border rounded-xl p-6 bg-orange-50/50 border-orange-200">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        <h3 className="text-base font-semibold">Seguridad</h3>
                        <span className="text-xs text-muted-foreground">· requiere contraseña de login para editar</span>
                    </div>

                    {/* PIN */}
                    <div className="flex items-center justify-between gap-4 p-3 bg-background rounded border">
                        <div className="flex-1">
                            <FormLabel className="text-sm">PIN de seguridad</FormLabel>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {unlockPin ? 'Podés editarlo abajo.' : 'Oculto por seguridad. Click en "Cambiar PIN" para editar.'}
                            </p>
                        </div>
                        {unlockPin ? (
                            <FormField
                                control={form.control}
                                name="pin"
                                render={({ field }) => (
                                    <FormItem className="w-32">
                                        <FormControl>
                                            <Input type="password" {...field} maxLength={6} autoComplete="new-password" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <Button type="button" variant="outline" size="sm" onClick={() => setReauthTarget('pin')}>
                                <Lock className="h-3.5 w-3.5 mr-1" /> Cambiar PIN
                            </Button>
                        )}
                    </div>

                    {/* FIRMA */}
                    <div className="flex items-center justify-between gap-4 p-3 bg-background rounded border">
                        <div className="flex-1">
                            <FormLabel className="text-sm">Firma digital</FormLabel>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {unlockSig
                                    ? 'Podés reemplazarla abajo.'
                                    : signaturePreview
                                        ? 'Tenés una firma registrada. Click en "Cambiar firma" para reemplazar.'
                                        : 'Sin firma registrada. Click en "Cambiar firma" para cargar una.'}
                            </p>
                            {unlockSig && signaturePreview && (
                                <div className="w-32 h-16 border rounded bg-white flex items-center justify-center p-1 mt-2">
                                    <img src={signaturePreview} alt="Firma actual" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                            {unlockSig && (
                                <Input
                                    type="file"
                                    name="signature"
                                    accept="image/*"
                                    className="bg-background mt-2"
                                    onChange={(e) => handleFileChange(e, setSignaturePreview)}
                                />
                            )}
                        </div>
                        {!unlockSig && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setReauthTarget('sig')}>
                                <Lock className="h-3.5 w-3.5 mr-1" /> Cambiar firma
                            </Button>
                        )}
                    </div>

                    <ReAuthDialog
                        open={reauthTarget !== null}
                        onOpenChange={(o) => !o && setReauthTarget(null)}
                        title={reauthTarget === 'pin' ? 'Editar PIN de seguridad' : 'Editar firma digital'}
                        description="Por seguridad, confirmá tu contraseña de login para desbloquear la edición."
                        onAuthenticated={() => {
                            if (reauthTarget === 'pin') setUnlockPin(true)
                            if (reauthTarget === 'sig') setUnlockSig(true)
                            setReauthTarget(null)
                        }}
                    />
                </div>
            )}

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? (isEdit ? 'Actualizando...' : 'Creando...') : (isEdit ? 'Guardar Cambios' : 'Crear Usuario')}
                </Button>
            </div>
        </div>
    )
}
