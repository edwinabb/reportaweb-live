import { notFound } from 'next/navigation'
import { getCotizacionWithTenantByToken } from '@/lib/actions/cotizaciones'
import { PrintPreviewToolbar } from '@/components/print-preview-toolbar'

interface Props {
    params: Promise<{ token: string }>
}

// Server component renders the print-friendly preview
export default async function AprobacionPreviewPage({ params }: Props) {
    const { token } = await params
    const result = await getCotizacionWithTenantByToken(token)

    if (!result) notFound()

    const { cotizacion, tenantInfo } = result
    const monedaSimbolo = cotizacion.moneda === 'PEN' ? 'S/' : 'USD'
    const fechaEmision = new Date(cotizacion.fecha_emision).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric'
    })
    const totalValor = (cotizacion.detalles || []).reduce((sum: number, d: any) => {
        const s = d.servicio
        const maxPrice = Math.max(s?.precio_1_valor || 0, s?.precio_2_valor || 0, s?.precio_3_valor || 0)
        return sum + (maxPrice * (d.cantidad || 1))
    }, 0)

    return (
        <>
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                }
                body { background: #f1f5f9; margin: 0; }
            `}</style>

            {/* Toolbar — hidden on print */}
            <PrintPreviewToolbar
                backHref={`/aprobacion/${token}`}
                backLabel="← Volver a la Cotización"
            />

            {/* A4 Document */}
            <div className="pt-20 pb-12 px-4 print:p-0 print:pt-0">
                <div
                    className="bg-white mx-auto shadow-lg print:shadow-none"
                    style={{ maxWidth: '210mm', minHeight: '297mm', padding: '20mm' }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-100">
                        <div>
                            {tenantInfo?.logo_url
                                ? <img src={tenantInfo.logo_url} alt="Logo" className="h-14 object-contain mb-3" />
                                : <div className="text-2xl font-black text-orange-500 mb-3">
                                    {(tenantInfo?.nombre_comercial || tenantInfo?.razon_social || 'EMPRESA').substring(0, 4).toUpperCase()}
                                </div>
                            }
                            <p className="text-sm font-semibold text-gray-600">
                                {tenantInfo?.nombre_comercial || tenantInfo?.razon_social}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="inline-block bg-orange-500 text-white font-black text-lg px-4 py-2 rounded-lg mb-2">
                                COTIZACIÓN
                            </div>
                            <p className="font-mono font-bold text-gray-900 text-lg">{cotizacion.numero}</p>
                            <p className="text-sm text-gray-500">{fechaEmision}</p>
                        </div>
                    </div>

                    {/* Client + Conditions */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cliente</p>
                            <p className="font-bold text-gray-900 text-base">{cotizacion.cliente?.razon_social}</p>
                            {cotizacion.cliente?.ruc && <p className="text-sm text-gray-600 mt-0.5">RUC: {cotizacion.cliente.ruc}</p>}
                            {cotizacion.contacto?.nombre_completo && (
                                <div className="mt-2">
                                    <p className="text-sm font-semibold text-gray-700">{cotizacion.contacto.nombre_completo}</p>
                                    {cotizacion.contacto.cargo && <p className="text-xs text-gray-500">{cotizacion.contacto.cargo}</p>}
                                    {cotizacion.contacto.email && <p className="text-xs text-gray-500">{cotizacion.contacto.email}</p>}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Condiciones</p>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr>
                                        <td className="text-gray-500 py-0.5 pr-3">Moneda:</td>
                                        <td className="font-medium text-gray-900">{cotizacion.moneda === 'PEN' ? 'Soles (S/)' : 'Dólares (USD)'}</td>
                                    </tr>
                                    {cotizacion.forma_pago && (
                                        <tr>
                                            <td className="text-gray-500 py-0.5 pr-3">Forma de pago:</td>
                                            <td className="font-medium text-gray-900">{cotizacion.forma_pago}</td>
                                        </tr>
                                    )}
                                    {cotizacion.plazo_pago && (
                                        <tr>
                                            <td className="text-gray-500 py-0.5 pr-3">Plazo:</td>
                                            <td className="font-medium text-gray-900">{cotizacion.plazo_pago}</td>
                                        </tr>
                                    )}
                                    {cotizacion.fecha_inicio_estimada && (
                                        <tr>
                                            <td className="text-gray-500 py-0.5 pr-3">Inicio estimado:</td>
                                            <td className="font-medium text-gray-900">
                                                {new Date(cotizacion.fecha_inicio_estimada).toLocaleDateString('es-PE')}
                                            </td>
                                        </tr>
                                    )}
                                    {cotizacion.sitio?.nombre && (
                                        <tr>
                                            <td className="text-gray-500 py-0.5 pr-3">Sitio:</td>
                                            <td className="font-medium text-gray-900">{cotizacion.sitio.nombre}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Services Table */}
                    <div className="mb-8">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Servicios Cotizados</p>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#111827] text-white">
                                    <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3 rounded-tl-lg">#</th>
                                    <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3">Servicio</th>
                                    <th className="text-center text-xs font-semibold uppercase tracking-wide px-4 py-3">Cantidad</th>
                                    <th className="text-left text-xs font-semibold uppercase tracking-wide px-4 py-3 rounded-tr-lg">Precios del Catálogo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(cotizacion.detalles || []).map((d: any, i: number) => (
                                    <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100">{i + 1}</td>
                                        <td className="px-4 py-3 border-b border-gray-100">
                                            <p className="font-semibold text-gray-900 text-sm">{d.servicio?.nombre}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-700 border-b border-gray-100">{d.cantidad}</td>
                                        <td className="px-4 py-3 border-b border-gray-100">
                                            {([1, 2, 3] as const).map(idx => {
                                                const nombre = d.servicio?.[`precio_${idx}_tipo_nombre`] as string | null
                                                const valor = d.servicio?.[`precio_${idx}_valor`] as number | null
                                                if (!valor) return null
                                                return (
                                                    <div key={idx} className="mb-1">
                                                        {nombre && <span className="text-[10px] text-gray-400 uppercase mr-1">{nombre}:</span>}
                                                        <span className="text-sm font-semibold text-gray-900 font-mono">{monedaSimbolo} {valor.toFixed(2)}</span>
                                                    </div>
                                                )
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50">
                                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-700 text-sm">Total Referencial:</td>
                                    <td className="px-4 py-3 text-left font-black text-orange-500 text-base font-mono">
                                        {monedaSimbolo} {totalValor.toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Notes */}
                    {cotizacion.notas_precios && (
                        <div className="mb-8">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notas</p>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{cotizacion.notas_precios}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-12 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Generado por REPORTAR.APP · reportar.app</p>
                        <p className="text-xs text-gray-400">{cotizacion.numero} · {fechaEmision}</p>
                    </div>
                </div>
            </div>
        </>
    )
}
