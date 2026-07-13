'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
    images:    File[]
    onChange:  (images: File[]) => void
    maxImages?: number
    disabled?: boolean
}

export function ImagenUpload({ images, onChange, maxImages = 5, disabled }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)

    const addFiles = useCallback((files: File[]) => {
        if (disabled) return
        const valid = files.filter(f => f.type.startsWith('image/'))
        onChange([...images, ...valid].slice(0, maxImages))
    }, [images, onChange, maxImages, disabled])

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (disabled) return
            const items = Array.from(e.clipboardData?.items ?? [])
            const imageFiles = items
                .filter(item => item.type.startsWith('image/'))
                .map(item => item.getAsFile())
                .filter((f): f is File => f !== null)
            if (imageFiles.length > 0) addFiles(imageFiles)
        }
        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [addFiles, disabled])

    const remove = (idx: number) => {
        onChange(images.filter((_, i) => i !== idx))
    }

    const canAdd = images.length < maxImages && !disabled

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {images.map((file, idx) => (
                    <div key={idx} className="relative group">
                        <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-20 w-20 object-cover rounded-md border"
                        />
                        <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-3 w-3" />
                        </button>
                        <span className="block text-[10px] text-muted-foreground truncate max-w-[80px] mt-0.5">
                            {file.name}
                        </span>
                    </div>
                ))}

                {canAdd && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 rounded-md flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/20 transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-[10px]">Agregar</span>
                    </button>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                Máx. {maxImages} imágenes · PNG, JPG, WEBP · También podés pegar con{' '}
                <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+V</kbd>
            </p>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => addFiles(Array.from(e.target.files ?? []))}
                disabled={disabled}
            />
        </div>
    )
}
