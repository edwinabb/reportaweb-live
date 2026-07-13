'use client'

import { useRef, useState } from 'react'
import { InspeccionWithRelations } from '@/types/formatos'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Printer, Download } from 'lucide-react'
import Image from 'next/image'

interface Props {
    inspeccion: InspeccionWithRelations
}

export function InspeccionPDF({ inspeccion }: Props) {
    const componentRef = useRef<HTMLDivElement>(null)
    const [generating, setGenerating] = useState(false)

    const handleDownload = async () => {
        if (!componentRef.current) return
        setGenerating(true)
        try {
            const html2canvas = (await import('html2canvas')).default
            const jsPDF = (await import('jspdf')).default

            const canvas = await html2canvas(componentRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = 210
            const pdfHeight = 297
            const imgHeight = (canvas.height * pdfWidth) / canvas.width

            let heightLeft = imgHeight
            let position = 0

            // Multi-page logic if needed, for now simple single page fit or cut
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
            pdf.save(`Inspeccion-${inspeccion.codigo_interno}.pdf`)
            toast.success('PDF Descargado')
        } catch (e) {
            console.error(e)
            toast.error('Error al generar PDF')
        } finally {
            setGenerating(false)
        }
    }

    // Group details by category
    const groupedDetails = inspeccion.detalles?.reduce((acc, curr) => {
        if (!acc[curr.categoria]) acc[curr.categoria] = []
        acc[curr.categoria].push(curr)
        return acc
    }, {} as Record<string, typeof inspeccion.detalles>)

    const fallas = inspeccion.detalles?.filter(d => d.estado === 'FALLA') || []

    return (
        <div className="flex flex-col items-center gap-8 py-8 bg-gray-100">
            <div className="flex gap-4 print:hidden">
                <Button onClick={handleDownload} disabled={generating}>
                    <Download className="mr-2 h-4 w-4" />
                    {generating ? 'Generando...' : 'Descargar PDF'}
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
            </div>

            {/* A4 Container */}
            <div
                id="inspeccion-pdf"
                ref={componentRef}
                className="w-[210mm] min-h-[297mm] bg-white text-black p-[15mm] shadow-lg print:shadow-none print:w-full print:absolute print:top-0 print:left-0"
            >
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-orange-500 pb-4 mb-6">
                    <div className="w-[150px]">
                        {/* Tenant Logo placeholder or hardcoded for now */}
                        <div className="text-xl font-bold bg-orange-100 text-orange-600 p-2 rounded inline-block">
                            REPORTA
                        </div>
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold uppercase">Reporte de Inspección</h1>
                        <p className="text-sm text-gray-500">Checklist Pre-Operativo</p>
                    </div>
                    <div className="text-right text-sm">
                        <p><strong>Código:</strong> {inspeccion.codigo_interno}</p>
                        <p><strong>Fecha:</strong> {new Date(inspeccion.fecha_inspeccion).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Section 1: Equipo */}
                <div className="mb-6">
                    <h2 className="text-sm font-bold bg-gray-100 p-2 mb-2 uppercase border-l-4 border-orange-500">1. Información del Equipo</h2>
                    <div className="grid grid-cols-3 gap-4 text-sm border p-4 rounded-sm">
                        <div>
                            <span className="block text-gray-500 text-xs">Equipo/Unidad</span>
                            <span className="font-bold">{inspeccion.maquinaria?.nombre}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Modelo/Marca</span>
                            <span className="font-bold">{inspeccion.maquinaria?.marca} {inspeccion.maquinaria?.modelo}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Placa / Serie</span>
                            <span className="font-bold">{inspeccion.maquinaria?.placa || inspeccion.maquinaria?.codigo_interno}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Horómetro</span>
                            <span className="font-mono bg-gray-50 px-2 py-1 border">{inspeccion.horometro_actual} h</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Kilometraje</span>
                            <span className="font-mono bg-gray-50 px-2 py-1 border">{inspeccion.kilometraje_actual} km</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs">Gasolina</span>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: `${inspeccion.nivel_tanque_gasolina}%` }}></div>
                            </div>
                            <span className="text-xs">{inspeccion.nivel_tanque_gasolina}%</span>
                        </div>
                    </div>
                </div>

                {/* Section 2: Checklist */}
                <div className="mb-6">
                    <h2 className="text-sm font-bold bg-gray-100 p-2 mb-2 uppercase border-l-4 border-orange-500">2. Puntos de Inspección</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
                        {groupedDetails && Object.entries(groupedDetails).map(([cat, items]) => (
                            <div key={cat} className="break-inside-avoid">
                                <h3 className="font-bold border-b mb-2 text-orange-600 mt-2">{cat}</h3>
                                <table className="w-full">
                                    <tbody>
                                        {items?.map(item => (
                                            <tr key={item.id} className="border-b border-gray-100">
                                                <td className="py-1">{item.item}</td>
                                                <td className="py-1 text-right w-[60px]">
                                                    <span className={`px-1.5 py-0.5 rounded font-bold ${item.estado === 'OK' ? 'text-green-700 bg-green-50' :
                                                            item.estado === 'FALLA' ? 'text-white bg-red-600' :
                                                                'text-gray-500 bg-gray-100'
                                                        }`}>
                                                        {item.estado === 'NO_APLICA' ? 'N/A' : item.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3: Hallazgos */}
                {fallas.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-sm font-bold bg-red-50 text-red-700 p-2 mb-2 uppercase border-l-4 border-red-500">3. Hallazgos / Fallas Reportadas</h2>
                        <table className="w-full text-xs border">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="border p-2 text-left">Categoría</th>
                                    <th className="border p-2 text-left">Item</th>
                                    <th className="border p-2 text-center">Prioridad</th>
                                    <th className="border p-2 text-left">Comentario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fallas.map(f => (
                                    <tr key={f.id}>
                                        <td className="border p-2">{f.categoria}</td>
                                        <td className="border p-2 font-bold">{f.item}</td>
                                        <td className="border p-2 text-center text-red-600 font-bold">{f.prioridad}</td>
                                        <td className="border p-2">{f.comentario || 'Sin detalles'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Section 4: Firmas */}
                <div className="mt-12 break-inside-avoid">
                    <h2 className="text-sm font-bold bg-gray-100 p-2 mb-6 uppercase border-l-4 border-orange-500">4. Conformidad</h2>
                    <div className="flex justify-around gap-8">
                        <div className="flex-1 text-center">
                            <div className="h-[80px] border-b border-black mb-2 flex items-center justify-center">
                                {/* Firma Conductor/Inspector */}
                                {inspeccion.firma_supervisor_url ? (
                                    <img src={inspeccion.firma_supervisor_url} alt="Firma" className="max-h-full" />
                                ) : (
                                    <span className="text-gray-300 italic">Sin Firma Digital</span>
                                )}
                            </div>
                            <p className="font-bold text-sm">INSPECTOR / CONDUCTOR</p>
                            <p className="text-xs text-gray-500">Firma de conformidad</p>
                        </div>

                        <div className="flex-1 text-center">
                            <div className="h-[80px] border-b border-black mb-2 flex items-center justify-center bg-gray-50">
                                {/* Firma Supervisor Visto Bueno (Manual) */}
                            </div>
                            <p className="font-bold text-sm">SUPERVISOR</p>
                            <p className="text-xs text-gray-500">Visto bueno</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
