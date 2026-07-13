'use client'

import React, { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/lib/actions/storage'

// ... imports

interface ImageUploadProps {
    value?: string
    onChange: (value: string) => void
    label?: string
    className?: string
    circle?: boolean
    bucket?: string
    // New props for custom storage paths
    pathStart?: string
    subfolder?: string
    customFilename?: string
}

export function ImageUpload({
    value,
    onChange,
    label,
    className,
    circle = false,
    bucket = 'public-assets',
    pathStart,
    subfolder,
    customFilename
}: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState(value)
    const [uploading, setUploading] = useState(false)

    // Update preview if value changes externally (e.g. form reset)
    React.useEffect(() => {
        setPreview(value)
    }, [value])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Show preview immediately with local blob
            const objectUrl = URL.createObjectURL(file)
            setPreview(objectUrl)
            setUploading(true)

            try {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('bucket', bucket)

                if (pathStart) formData.append('pathStart', pathStart)
                if (subfolder) formData.append('subfolder', subfolder)
                if (customFilename) formData.append('customFilename', customFilename)

                const result = await uploadFile(formData)

                if (result.success && result.url) {
                    onChange(result.url)
                } else {
                    console.error('Upload failed:', result.message)
                    // Optionally revert preview? keeping local preview for now but not updating form value
                }
            } catch (error) {
                console.error('Upload exception:', error)
            } finally {
                setUploading(false)
            }
        }
    }

    const handleRemove = () => {
        setPreview("")
        onChange("")
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {label && <span className="text-sm font-medium">{label}</span>}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
            />

            {!preview ? (
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={cn(
                        "cursor-pointer border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors",
                        circle ? "h-24 w-24 rounded-full" : "h-32 w-full rounded-md",
                        uploading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {circle ? (
                        <div className="text-center">
                            <span className="text-xs text-muted-foreground">{uploading ? '...' : 'Foto'}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-muted-foreground text-sm">
                            <Upload className="h-6 w-6 mb-1" />
                            <span>{uploading ? 'Subiendo...' : 'Subir imagen'}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className={cn("relative group", circle ? "h-24 w-24" : "w-full min-h-[120px]")}>
                    <img
                        src={preview}
                        alt="Preview"
                        className={cn("object-contain w-full h-full border border-gray-200 bg-gray-50", circle ? "rounded-full" : "rounded-md")}
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleRemove}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
        </div>
    )
}
