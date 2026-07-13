'use client'

import * as React from 'react'
import imageCompression from 'browser-image-compression'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
    label: string
    value: string | null | undefined
    onChange: (url: string | null) => void
    uploadFn: (base64: string, filename: string) => Promise<{ success: boolean; url?: string; error?: string }>
    disabled?: boolean
}

export function PhotoUploadField({ label, value, onChange, uploadFn, disabled }: Props) {
    const [uploading, setUploading] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const compressed = await imageCompression(file, {
                maxWidthOrHeight: 920,
                initialQuality: 0.6,
                useWebWorker: true,
                fileType: 'image/jpeg',
            })

            const reader = new FileReader()
            reader.onload = async (ev) => {
                const base64 = ev.target?.result as string
                const res = await uploadFn(base64, file.name.replace(/\.[^.]+$/, '.jpg'))
                if (res.success && res.url) {
                    onChange(res.url)
                    toast.success('Foto subida')
                } else {
                    toast.error(res.error ?? 'Error al subir foto')
                }
                setUploading(false)
            }
            reader.readAsDataURL(compressed)
        } catch {
            toast.error('Error al procesar la imagen')
            setUploading(false)
        }

        // Reset input so the same file can be re-selected
        if (inputRef.current) inputRef.current.value = ''
    }

    return (
        <div className="space-y-1.5">
            <Label className="text-xs">{label}</Label>

            {value ? (
                <div className="relative group w-full h-28 rounded-md overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt={label}
                        className="w-full h-full object-cover"
                    />
                    <button
                        type="button"
                        disabled={disabled || uploading}
                        onClick={() => onChange(null)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Quitar foto"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        disabled={disabled || uploading}
                        onClick={() => inputRef.current?.click()}
                        className="absolute bottom-1 right-1 bg-black/60 text-white rounded text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                        <Upload className="h-2.5 w-2.5" /> Cambiar
                    </button>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || uploading}
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-20 flex flex-col gap-1 border-dashed text-muted-foreground hover:text-foreground hover:border-orange-400"
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <ImageIcon className="h-5 w-5" />
                    )}
                    <span className="text-xs">{uploading ? 'Subiendo…' : 'Seleccionar foto'}</span>
                </Button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
                disabled={disabled || uploading}
            />
        </div>
    )
}
