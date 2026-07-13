'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

type Props = {
    onChange: (base64: string | null) => void
    width?: number
    height?: number
}

export function SignatureCanvas({ onChange, width = 480, height = 180 }: Props) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const drawingRef = React.useRef(false)
    const [empty, setEmpty] = React.useState(true)

    React.useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = width
        canvas.height = height
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.strokeStyle = '#111827'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
    }, [width, height])

    const getPoint = (e: React.PointerEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return null
        const rect = canvas.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        }
    }

    const handlePointerDown = (e: React.PointerEvent) => {
        drawingRef.current = true
        const p = getPoint(e)
        if (!p) return
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        e.currentTarget.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!drawingRef.current) return
        const p = getPoint(e)
        if (!p) return
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!drawingRef.current) return
        drawingRef.current = false
        e.currentTarget.releasePointerCapture(e.pointerId)
        const canvas = canvasRef.current
        if (!canvas) return
        const dataUrl = canvas.toDataURL('image/png')
        setEmpty(false)
        onChange(dataUrl)
    }

    const clear = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        setEmpty(true)
        onChange(null)
    }

    return (
        <div className="space-y-2">
            <canvas
                ref={canvasRef}
                className="border rounded-md bg-white touch-none w-full"
                style={{ aspectRatio: `${width} / ${height}` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    {empty ? 'Firmá con el mouse o dedo arriba.' : 'Firma registrada. Podés limpiar y volver a firmar.'}
                </p>
                <Button type="button" size="sm" variant="outline" onClick={clear}>
                    <Eraser className="mr-1 h-3.5 w-3.5" /> Limpiar
                </Button>
            </div>
        </div>
    )
}
