'use client'

import { useState } from 'react'
import { Key, Lock, Shield, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReAuthDialog } from '@/components/common/re-auth-dialog'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { updateUser } from '@/lib/actions/update-user'
import { Profile } from '@/types'

interface Props {
    profile: Pick<Profile, 'id' | 'email' | 'first_name' | 'last_name' | 'doc_number' | 'doc_type' | 'signature_url'>
}

export function SeguridadTab({ profile }: Props) {
    const supabase = createClient()
    const [sendingReset, setSendingReset] = useState(false)

    const [reauthTarget, setReauthTarget] = useState<'pin' | 'sig' | null>(null)
    const [unlockPin, setUnlockPin] = useState(false)
    const [unlockSig, setUnlockSig] = useState(false)

    const [pin, setPin] = useState('')
    const [savingPin, setSavingPin] = useState(false)

    const [sigFile, setSigFile] = useState<File | null>(null)
    const [sigPreview, setSigPreview] = useState<string | null>(profile.signature_url ?? null)
    const [savingSig, setSavingSig] = useState(false)

    async function handlePasswordReset() {
        if (!profile.email) return
        setSendingReset(true)
        const { error } = await supabase.auth.resetPasswordForEmail(profile.email)
        setSendingReset(false)
        if (error) {
            toast.error('No se pudo enviar el email: ' + error.message)
        } else {
            toast.success('Email de cambio de contraseña enviado a ' + profile.email)
        }
    }

    function buildBaseFormData() {
        const fd = new FormData()
        fd.append('id', profile.id)
        fd.append('email', profile.email ?? '')
        fd.append('firstName', profile.first_name ?? '')
        fd.append('lastName', profile.last_name ?? '')
        fd.append('docNumber', profile.doc_number ?? '')
        fd.append('docType', profile.doc_type ?? 'DNI')
        fd.append('redirectTo', '')
        return fd
    }

    async function handleSavePin() {
        if (!pin || pin.length < 4) {
            toast.error('El PIN debe tener al menos 4 dígitos')
            return
        }
        setSavingPin(true)
        const fd = buildBaseFormData()
        fd.append('pin', pin)
        const result = await updateUser(null, fd)
        setSavingPin(false)
        if (result?.success === false) {
            toast.error(result.message || 'Error al guardar el PIN')
        } else {
            toast.success('PIN actualizado')
            setUnlockPin(false)
            setPin('')
        }
    }

    async function handleSaveSig() {
        if (!sigFile) return
        setSavingSig(true)
        const fd = buildBaseFormData()
        fd.append('signature', sigFile)
        const result = await updateUser(null, fd)
        setSavingSig(false)
        if (result?.success === false) {
            toast.error(result.message || 'Error al guardar la firma')
        } else {
            toast.success('Firma actualizada')
            setUnlockSig(false)
        }
    }

    return (
        <div className="space-y-4 max-w-xl">
            {/* Contraseña */}
            <div className="border rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Key className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Contraseña</p>
                        <p className="text-xs text-muted-foreground">Recibirás un email para restablecerla</p>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasswordReset}
                    disabled={sendingReset}
                >
                    {sendingReset ? 'Enviando...' : 'Enviar email de cambio'}
                </Button>
            </div>

            {/* PIN */}
            <div className="border rounded-xl p-5 bg-orange-50/30 border-orange-100">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                            <Shield className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">PIN de seguridad</p>
                            <p className="text-xs text-muted-foreground">
                                {unlockPin ? 'Ingresa el nuevo PIN (4–6 dígitos)' : 'Protege acciones sensibles como firmar informes'}
                            </p>
                        </div>
                    </div>
                    {!unlockPin && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setReauthTarget('pin')}>
                            <Lock className="h-3.5 w-3.5 mr-1.5" /> Cambiar PIN
                        </Button>
                    )}
                </div>
                {unlockPin && (
                    <div className="mt-4 flex items-center gap-3">
                        <Input
                            type="password"
                            maxLength={6}
                            placeholder="••••••"
                            className="w-32"
                            value={pin}
                            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                            autoComplete="new-password"
                        />
                        <Button type="button" size="sm" onClick={handleSavePin} disabled={savingPin}>
                            {savingPin ? 'Guardando...' : 'Guardar PIN'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setUnlockPin(false); setPin('') }}>
                            Cancelar
                        </Button>
                    </div>
                )}
            </div>

            {/* Firma digital */}
            <div className="border rounded-xl p-5 bg-orange-50/30 border-orange-100">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                            <PenLine className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Firma digital</p>
                            <p className="text-xs text-muted-foreground">
                                {unlockSig
                                    ? 'Sube una imagen de tu firma'
                                    : sigPreview
                                        ? 'Firma registrada — click para reemplazar'
                                        : 'Sin firma registrada'}
                            </p>
                        </div>
                    </div>
                    {!unlockSig && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setReauthTarget('sig')}>
                            <Lock className="h-3.5 w-3.5 mr-1.5" />
                            {sigPreview ? 'Cambiar firma' : 'Agregar firma'}
                        </Button>
                    )}
                </div>
                {unlockSig && (
                    <div className="mt-4 space-y-3">
                        {sigPreview && (
                            <div className="w-40 h-16 border rounded bg-white flex items-center justify-center p-1">
                                <img src={sigPreview} alt="Firma actual" className="max-w-full max-h-full object-contain" />
                            </div>
                        )}
                        <Input
                            type="file"
                            accept="image/*"
                            className="max-w-xs"
                            onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) {
                                    setSigFile(file)
                                    setSigPreview(URL.createObjectURL(file))
                                }
                            }}
                        />
                        <div className="flex gap-2">
                            <Button type="button" size="sm" onClick={handleSaveSig} disabled={savingSig || !sigFile}>
                                {savingSig ? 'Guardando...' : 'Guardar firma'}
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setUnlockSig(false); setSigFile(null) }}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <ReAuthDialog
                open={reauthTarget !== null}
                onOpenChange={open => !open && setReauthTarget(null)}
                title={reauthTarget === 'pin' ? 'Editar PIN de seguridad' : 'Editar firma digital'}
                description="Por seguridad, confirmá tu contraseña de login para desbloquear la edición."
                onAuthenticated={() => {
                    if (reauthTarget === 'pin') setUnlockPin(true)
                    if (reauthTarget === 'sig') setUnlockSig(true)
                    setReauthTarget(null)
                }}
            />
        </div>
    )
}
