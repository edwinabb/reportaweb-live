'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ImagenUpload } from './imagen-upload'
import { crearTicket, guardarImagenesProblema } from '@/lib/actions/soporte'
import { slugifyTenantName, SECCIONES_SOPORTE, SECCION_LABELS } from '@/lib/soporte-shared'
import { createClient } from '@/utils/supabase/client'

export function NuevoTicketForm() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [seccion,     setSeccion]     = useState('')
    const [criticidad,  setCriticidad]  = useState('MEDIA')
    const [descripcion, setDescripcion] = useState('')
    const [images,      setImages]      = useState<File[]>([])

    async function uploadImages(files: File[], tenantId: string, ticketId: string, ticketNumero: number) {
        const supabase = createClient()
        const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', tenantId)
            .single()

        const tenantSlug = slugifyTenantName(company?.name ?? tenantId)
        const urls: string[] = []

        for (const file of files) {
            const ext  = file.name.split('.').pop() ?? 'jpg'
            const path = `${tenantSlug}/${ticketNumero}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
            const { data, error } = await supabase.storage
                .from('problemas')
                .upload(path, file, { upsert: false })
            if (!error && data) {
                const { data: { publicUrl } } = supabase.storage
                    .from('problemas')
                    .getPublicUrl(data.path)
                urls.push(publicUrl)
            }
        }
        return urls
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!seccion)           return toast.error('Seleccioná una sección')
        if (!descripcion.trim()) return toast.error('Escribí una descripción')

        const formData = new FormData()
        formData.set('seccion',     seccion)
        formData.set('criticidad',  criticidad)
        formData.set('descripcion', descripcion.trim())

        startTransition(async () => {
            const result = await crearTicket(formData)
            if (!result.success) {
                toast.error(result.error ?? 'Error al crear el ticket')
                return
            }

            // Upload images if any
            if (images.length > 0) {
                try {
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    const { data: profile }  = await supabase
                        .from('profiles')
                        .select('tenant_id')
                        .eq('id', user!.id)
                        .single()

                    const urls = await uploadImages(images, profile!.tenant_id, result.ticketId!, result.numero!)
                    if (urls.length > 0) {
                        await guardarImagenesProblema(result.ticketId!, urls)
                    }
                } catch {
                    toast.warning('Ticket creado, pero algunas imágenes no se pudieron subir')
                }
            }

            toast.success(`Ticket #${String(result.numero).padStart(4, '0')} creado`)
            router.push(`/soporte/${result.ticketId}`)
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sección */}
            <div className="space-y-2">
                <Label>Sección donde ocurrió el problema *</Label>
                <Select value={seccion} onValueChange={setSeccion} disabled={isPending}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná la sección afectada…" />
                    </SelectTrigger>
                    <SelectContent>
                        {SECCIONES_SOPORTE.map(s => (
                            <SelectItem key={s} value={s}>{SECCION_LABELS[s]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Criticidad */}
            <div className="space-y-2">
                <Label>Nivel de criticidad *</Label>
                <RadioGroup
                    value={criticidad}
                    onValueChange={setCriticidad}
                    className="flex gap-6"
                    disabled={isPending}
                >
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="BAJA"  id="baja"  />
                        <Label htmlFor="baja"  className="text-blue-600  font-normal cursor-pointer">Baja</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="MEDIA" id="media" />
                        <Label htmlFor="media" className="text-orange-600 font-normal cursor-pointer">Media</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="ALTA"  id="alta"  />
                        <Label htmlFor="alta"  className="text-red-600   font-normal cursor-pointer">Alta</Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción del problema *</Label>
                <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    placeholder="Describí qué pasó, qué estabas haciendo y qué resultado esperabas vs. lo que ocurrió…"
                    rows={5}
                    disabled={isPending}
                    className="resize-none"
                />
            </div>

            {/* Imágenes */}
            <div className="space-y-2">
                <Label>Imágenes adjuntas</Label>
                <ImagenUpload
                    images={images}
                    onChange={setImages}
                    maxImages={5}
                    disabled={isPending}
                />
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/soporte')}
                    disabled={isPending}
                >
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando…</>
                        : <><Send className="h-4 w-4 mr-2" /> Enviar Ticket</>
                    }
                </Button>
            </div>
        </form>
    )
}
