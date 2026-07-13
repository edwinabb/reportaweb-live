'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createUser } from '@/lib/actions/create-user'
import { updateUser } from '@/lib/actions/update-user'
import {
    Form,
} from '@/components/ui/form'
import { useEffect, useActionState, useState } from 'react'
import { toast } from 'sonner'
import { Profile } from '@/types'
import { getJobTitles, getPaises } from '@/lib/actions/catalogos'

import { UserDocumentsManager } from './documents/user-documents-manager'
import { DocumentType, UserDocument } from '@/types/user-documents'
import { UserProfileFields } from './user-profile-fields'

const userFormSchema = z.object({
    id: z.string().optional(),
    email: z.string().email('Debe ser un correo electrónico válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
    firstName: z.string().min(1, 'El nombre es obligatorio'),
    lastName: z.string().min(1, 'El apellido es obligatorio'),
    role: z.enum(['admin_tenant', 'supervisor', 'member']),
    docNumber: z.string().min(1, 'El documento de identidad es obligatorio'),
    gender: z.enum(['Masculino', 'Femenino']).optional(),
    middleName: z.string().optional(),
    secondLastName: z.string().optional(),
    docType: z.enum(['DNI', 'CE', 'PASSPORT', 'RUC', 'OTHER']),
    nationality: z.string().optional(),
    birthDate: z.string().optional(),
    phone: z.string().optional(),
    pin: z.string().optional(),
    jobTitleId: z.string().min(1, 'El cargo es obligatorio'),
    direccion: z.string().optional(),
    contactoEmergenciaNombre: z.string().optional(),
    contactoEmergenciaParentesco: z.string().optional(),
    contactoEmergenciaCelular: z.string().optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormProps {
    user?: Profile
    initialDocuments?: UserDocument[]
    documentTypes?: DocumentType[]
    /** Modo self-service (usuario editando su propio perfil). Oculta rol, email read-only, redirect propio. */
    selfService?: boolean
    redirectTo?: string
}

export function UserForm({ user, initialDocuments = [], documentTypes = [], selfService = false, redirectTo }: UserFormProps) {
    const isEdit = !!user
    const currentAction = isEdit ? updateUser : createUser
    const [state, formAction, isPending] = useActionState(currentAction, null)
    const [jobTitles, setJobTitles] = useState<{ id: string, name: string }[]>([])
    const [isLoadingJobTitles, setIsLoadingJobTitles] = useState(false)

    const [activeTab, setActiveTab] = useState("general")

    // Countries state
    const [countries, setCountries] = useState<{ id: string, name: string }[]>([])
    const [loadingCountries, setLoadingCountries] = useState(false)

    // Image Previews
    // Add cache buster to ensure updated images load immediately
    const initialPhoto = user?.photo_url ? `${user.photo_url}?t=${Date.now()}` : null
    const initialSignature = user?.signature_url ? `${user.signature_url}?t=${Date.now()}` : null

    const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhoto)
    const [signaturePreview, setSignaturePreview] = useState<string | null>(initialSignature)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setPreview: (url: string | null) => void) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setPreview(url)
        }
    }

    // Default date: Today - 30 years
    const defaultBirthDate = new Date()
    defaultBirthDate.setFullYear(defaultBirthDate.getFullYear() - 30)
    const formattedDefaultDate = defaultBirthDate.toISOString().split('T')[0]

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            id: user?.id || '',
            email: user?.email || '',
            password: '',
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            role: (user?.role as UserFormValues['role']) || 'member',
            docNumber: user?.doc_number || '',
            nationality: user?.nationality || '',
            birthDate: user?.birth_date || formattedDefaultDate,
            phone: user?.phone || '',
            pin: user?.pin || '',
            jobTitleId: user?.job_title_id || '',
            middleName: user?.middle_name || '',
            secondLastName: user?.second_last_name || '',
            docType: user?.doc_type || 'DNI',
            gender: user?.gender || 'Masculino',
            direccion: user?.direccion || '',
            contactoEmergenciaNombre: user?.contacto_emergencia_nombre || '',
            contactoEmergenciaParentesco: user?.contacto_emergencia_parentesco || '',
            contactoEmergenciaCelular: user?.contacto_emergencia_celular || '',
        },
    })

    useEffect(() => {
        const loadCatalogs = async () => {
            setIsLoadingJobTitles(true)
            setLoadingCountries(true)

            try {
                // Fetch independently
                getJobTitles().then(d => {
                    const titles = d as { id: string, name: string }[]
                    setJobTitles(titles)
                    const currentJob = form.getValues('jobTitleId')
                    if (!currentJob && titles.length > 0) {
                        form.setValue('jobTitleId', titles[0].id)
                    }
                }).catch(console.error)
                const paisesList = await getPaises().catch(() => [])

                // Sort countries: SA first, then alphabetical
                const saCountries = ['PERU', 'PERÚ', 'ARGENTINA', 'BOLIVIA', 'BRASIL', 'BRAZIL', 'CHILE', 'COLOMBIA', 'ECUADOR', 'GUYANA', 'PARAGUAY', 'SURINAME', 'URUGUAY', 'VENEZUELA']

                const sorted = (paisesList as { id: string, nombre: string }[]).sort((a, b) => {
                    const nameA = a.nombre ? String(a.nombre).toUpperCase() : ''
                    const nameB = b.nombre ? String(b.nombre).toUpperCase() : ''

                    const aSA = saCountries.includes(nameA)
                    const bSA = saCountries.includes(nameB)

                    if (aSA && !bSA) return -1
                    if (!aSA && bSA) return 1
                    return nameA.localeCompare(nameB)
                })

                // Map nombre to name for consistency with component state
                const mappedCountries = sorted.map(c => ({ id: c.id, name: c.nombre }))
                setCountries(mappedCountries)

                // Default to Peru if no nationality set
                const currentNat = form.getValues('nationality')
                if (!currentNat) {
                    const peru = mappedCountries.find(c => c.name.toUpperCase() === 'PERU' || c.name.toUpperCase() === 'PERÚ')
                    if (peru) {
                        form.setValue('nationality', peru.id)
                    }
                } else {
                    // Check if current value exists in the list (is an ID)
                    const matchById = mappedCountries.find(c => c.id === currentNat)
                    if (matchById) {
                        // All good, value is valid ID
                    } else {
                        // Maybe it's a name?
                        const matchByName = mappedCountries.find(c => c.name.toUpperCase() === currentNat.toUpperCase())
                        if (matchByName) {
                            form.setValue('nationality', matchByName.id)
                        } else {
                            // Invalid value, reset to empty so user must select
                            form.setValue('nationality', '')
                        }
                    }
                }

            } catch (error) {
                console.error("Error loading catalogs", error)
            } finally {
                setIsLoadingJobTitles(false)
                setLoadingCountries(false)
            }
        }
        loadCatalogs()
    }, [form])

    useEffect(() => {
        if (state?.message) {
            if (state.success) {
                toast.success(state.message)
            } else {
                // If there are specific validation errors, list them
                const errorFields = state.errors ? Object.keys(state.errors).join(', ') : ''
                const errorMsg = errorFields
                    ? `${state.message} (Campos: ${errorFields})`
                    : state.message
                toast.error(errorMsg)
            }
        }
    }, [state])

    return (
        <Form {...form}>
            {isEdit ? (
                <div className="space-y-6">
                    <div className="flex border-b">
                        <button
                            type="button"
                            onClick={() => setActiveTab("general")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "general"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Información General
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("documents")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "documents"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Documentos
                        </button>
                    </div>

                    {activeTab === "general" && (
                        <form action={formAction}>
                            <input type="hidden" name="id" value={user.id} />
                            {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
                            <UserProfileFields
                                form={form}
                                isEdit={isEdit}
                                isPending={isPending}
                                photoPreview={photoPreview}
                                signaturePreview={signaturePreview}
                                handleFileChange={handleFileChange}
                                setPhotoPreview={setPhotoPreview}
                                setSignaturePreview={setSignaturePreview}
                                countries={countries}
                                loadingCountries={loadingCountries}
                                jobTitles={jobTitles}
                                isLoadingJobTitles={isLoadingJobTitles}
                                selfService={selfService}
                            />
                        </form>
                    )}

                    {activeTab === "documents" && user && (
                        <UserDocumentsManager
                            userId={user.id}
                            initialDocuments={initialDocuments}
                            documentTypes={documentTypes}
                        />
                    )}
                </div>
            ) : (
                <form action={formAction}>
                    {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Información General</h3>
                        <UserProfileFields
                            form={form}
                            isEdit={isEdit}
                            isPending={isPending}
                            photoPreview={photoPreview}
                            signaturePreview={signaturePreview}
                            handleFileChange={handleFileChange}
                            setPhotoPreview={setPhotoPreview}
                            setSignaturePreview={setSignaturePreview}
                            countries={countries}
                            loadingCountries={loadingCountries}
                            jobTitles={jobTitles}
                            isLoadingJobTitles={isLoadingJobTitles}
                            selfService={selfService}
                        />
                    </div>
                </form>
            )}
        </Form>
    )
}
