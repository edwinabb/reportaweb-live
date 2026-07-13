import { notFound } from 'next/navigation'
import { getCotizacionById } from '@/lib/actions/cotizaciones'
import { getGlobalPDFConfig, getTenantInfo } from '@/lib/actions/cotizaciones-config'
import { PrintPreviewToolbar } from '@/components/print-preview-toolbar'

interface Props {
    params: Promise<{ id: string }>
}

export default async function CotizacionPreviewPage({ params }: Props) {
    const { id } = await params
    const [cotizacion, globalConfig, tenantInfo] = await Promise.all([
        getCotizacionById(id),
        getGlobalPDFConfig(),
        getTenantInfo(),
    ])

    if (!cotizacion) notFound()

    const monedaSimbolo = cotizacion.moneda === 'PEN' ? 'S/' : 'USD'
    const fechaEmision = new Date(cotizacion.fecha_emision).toLocaleDateString('es-PE', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })

    const logoUrl = (tenantInfo as any)?.logo_url
    const tenantNombre = (tenantInfo as any)?.nombre_comercial || (tenantInfo as any)?.razon_social || ''

    const config = {
        introduccion: (globalConfig as any)?.introduccion || '',
        terminos_condiciones: (globalConfig as any)?.terminos_condiciones || '',
        forma_pago1: (globalConfig as any)?.forma_pago1 || '',
        forma_pago2: (globalConfig as any)?.forma_pago2 || '',
        saludo: (globalConfig as any)?.saludo || 'Estimados,',
        despedida: (globalConfig as any)?.despedida || 'Atentamente,',
        banco: (globalConfig as any)?.banco || '',
        mostrar_firma: (globalConfig as any)?.mostrar_firma ?? true,
        imagen_banco: (globalConfig as any)?.imagen_banco || '',
        imagen_firma: (globalConfig as any)?.imagen_firma || '',
    }

    const pdfCfg = (cotizacion as any).pdf_config || {}
    const cfg = {
        introduccion: pdfCfg.texto_introduccion || config.introduccion,
        terminos: pdfCfg.texto_notas_precios || config.terminos_condiciones,
        forma_pago1: pdfCfg.forma_pago1 || config.forma_pago1,
        forma_pago2: pdfCfg.forma_pago2 || config.forma_pago2,
        saludo: pdfCfg.saludo || config.saludo,
        despedida: pdfCfg.despedida || config.despedida,
        banco: pdfCfg.banco || config.banco,
        mostrar_firma: pdfCfg.mostrar_firma ?? config.mostrar_firma,
        imagen_banco: pdfCfg.imagen_banco_url || config.imagen_banco,
        imagen_firma: pdfCfg.firma_imagen_url || config.imagen_firma,
    }

    const detalles: any[] = (cotizacion as any).detalles || []
    const matriz: any[] = (cotizacion as any).matriz_responsabilidad || []

    return (
        <>
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    @page { size: A4; margin: 0; }
                    body { background: white !important; margin: 0 !important; }
                }
                body { background: #f1f5f9; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }
                tr, .avoid-break { page-break-inside: avoid; break-inside: avoid; }
            `}</style>

            <PrintPreviewToolbar
                backHref={`/cotizaciones/${id}?tab=paso4`}
                backLabel="← Volver"
                label={(cotizacion as any).numero}
            />

            <div className="pt-20 pb-12 px-4 print:p-0 print:pt-0">
                <div
                    className="bg-white mx-auto shadow-lg print:shadow-none text-black"
                    style={{ maxWidth: '210mm', minHeight: '297mm', padding: '10mm', fontFamily: 'sans-serif' }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                            {logoUrl
                                ? <img src={logoUrl} alt="Logo" style={{ height: '64px', objectFit: 'contain', maxWidth: '200px' }} />
                                : <span style={{ fontSize: '28px', fontWeight: '900', color: '#f97316' }}>{tenantNombre.substring(0, 4).toUpperCase() || 'CISE'}</span>
                            }
                            <div style={{ fontWeight: '700', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                COTIZACIÓN {(cotizacion as any).numero}
                            </div>
                        </div>
                        <div style={{ fontSize: '13px', paddingTop: '64px', textTransform: 'capitalize' }}>
                            {fechaEmision}
                        </div>
                    </div>

                    {/* Client info */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                            {(cotizacion as any).contacto?.nombre_completo || (cotizacion as any).cliente?.razon_social || 'CLIENTE'}
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#374151', marginBottom: '2px' }}>
                            {(cotizacion as any).contacto?.cargo || ''}
                        </div>
                        {(cotizacion as any).cliente?.logo_url && (
                            <img src={(cotizacion as any).cliente.logo_url} alt="Cliente" style={{ height: '48px', objectFit: 'contain', maxWidth: '150px', marginTop: '8px' }} />
                        )}
                    </div>

                    {/* Intro */}
                    <div style={{ marginBottom: '20px', fontSize: '13px' }}>
                        <p style={{ margin: 0 }}>{cfg.saludo || 'De acuerdo a su solicitud tenemos a bien alcanzar nuestra cotización por concepto de:'}</p>
                        {cfg.introduccion && <p style={{ margin: '4px 0 0' }}>{cfg.introduccion}</p>}
                        {(cotizacion as any).descripcion_requerimiento && (
                            <p style={{ fontWeight: '700', margin: '4px 0 0' }}>{(cotizacion as any).descripcion_requerimiento}</p>
                        )}
                    </div>

                    {/* Services Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#e5e7eb', color: '#111827', fontWeight: '700', textTransform: 'uppercase' }}>
                                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>SERVICIO</th>
                                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '80px' }}>CANTIDAD</th>
                                <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '180px' }}>PRECIOS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalles.map((d: any) => (
                                <tr key={d.id} className="avoid-break">
                                    <td style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                                            {d.servicio?.nombre}
                                        </div>
                                        {d.servicio?.descripcion && (
                                            <div style={{ color: '#4b5563', marginBottom: '6px', fontSize: '11px' }}>
                                                {d.servicio.descripcion}
                                            </div>
                                        )}
                                        {d.servicio?.imagen_url && (
                                            <img
                                                src={d.servicio.imagen_url}
                                                alt={d.servicio.nombre}
                                                style={{ height: '96px', objectFit: 'contain', display: 'block' }}
                                            />
                                        )}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: '700', verticalAlign: 'top' }}>
                                        {d.cantidad}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'top' }}>
                                        {([1, 2, 3] as const).map(idx => {
                                            const nombre = d.servicio?.[`precio_${idx}_tipo_nombre`] as string | null
                                            const valor = d.servicio?.[`precio_${idx}_valor`] as number | null
                                            if (!valor) return null
                                            return (
                                                <div key={idx} style={{ marginBottom: '6px' }}>
                                                    {nombre && (
                                                        <div style={{ fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', fontSize: '10px' }}>
                                                            {nombre}
                                                        </div>
                                                    )}
                                                    <div style={{ fontWeight: '700' }}>
                                                        {monedaSimbolo} {valor.toFixed(2)}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Notas / T&C */}
                    {((cotizacion as any).notas_precios || cfg.terminos) && (
                        <div style={{ marginBottom: '20px', fontSize: '11px', fontWeight: '600', lineHeight: '1.6' }}>
                            {(cotizacion as any).notas_precios && (
                                <div style={{ whiteSpace: 'pre-wrap', marginBottom: '8px' }}>{(cotizacion as any).notas_precios}</div>
                            )}
                            {cfg.terminos && <div style={{ whiteSpace: 'pre-wrap' }}>{cfg.terminos}</div>}
                        </div>
                    )}

                    {/* Forma de pago / Banco */}
                    {(cfg.forma_pago1 || cfg.forma_pago2 || cfg.banco || cfg.imagen_banco) && (
                        <div style={{ border: '1px solid #000', marginBottom: '20px' }} className="avoid-break">
                            <div style={{ backgroundColor: '#e5e7eb', borderBottom: '1px solid #000', padding: '8px', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>
                                FACTURACIÓN Y FORMA DE PAGO
                            </div>
                            <div style={{ padding: '12px', fontSize: '11px' }}>
                                {cfg.forma_pago1 && <div style={{ marginBottom: '12px', whiteSpace: 'pre-wrap', fontWeight: '600' }}>{cfg.forma_pago1}</div>}
                                {cfg.imagen_banco
                                    ? <img src={cfg.imagen_banco} alt="Banco" style={{ maxWidth: '500px', height: 'auto', border: '1px solid #d1d5db', marginBottom: '12px', display: 'block' }} />
                                    : cfg.banco && <div style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{cfg.banco}</div>
                                }
                                {cfg.forma_pago2 && <div style={{ whiteSpace: 'pre-wrap' }}>{cfg.forma_pago2}</div>}
                            </div>
                        </div>
                    )}

                    {/* Matriz de Responsabilidad */}
                    {matriz.length > 0 && (
                        <div style={{ border: '1px solid #000', marginBottom: '20px' }} className="avoid-break">
                            <div style={{ backgroundColor: '#e5e7eb', borderBottom: '1px solid #000', padding: '8px', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>
                                MATRIZ DE RESPONSABILIDADES
                            </div>
                            <div style={{ padding: '12px', fontSize: '11px' }}>
                                {[['EMPRESA', tenantNombre.toUpperCase()], ['CLIENTE', ((cotizacion as any).cliente?.razon_social || 'CLIENTE').toUpperCase()]].map(([resp, label]) => {
                                    const items = matriz.filter(m => m.responsable === resp)
                                    if (!items.length) return null
                                    return (
                                        <div key={resp} style={{ marginBottom: '8px' }}>
                                            <div style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', marginBottom: '4px' }}>
                                                RESPONSABILIDADES DE {label}
                                            </div>
                                            <ul style={{ paddingLeft: '16px', margin: 0 }}>
                                                {items.map((m, i) => <li key={i}>{m.descripcion || m.actividad}</li>)}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Firma */}
                    <div style={{ marginTop: '40px', marginBottom: '20px' }} className="avoid-break">
                        {cfg.despedida && <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '24px' }}>{cfg.despedida}</div>}
                        {cfg.mostrar_firma && cfg.imagen_firma && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: '32px' }}>
                                <img src={cfg.imagen_firma} alt="Firma" style={{ maxWidth: '250px', height: 'auto', marginBottom: '-20px', marginLeft: '16px' }} />
                                <div style={{ borderTop: '1px solid #000', paddingLeft: '16px', paddingTop: '4px', minWidth: '250px' }}>
                                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{tenantNombre.toUpperCase()}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
                        <span>Generado por REPORTAR.APP · reportar.app</span>
                        <span>{(cotizacion as any).numero} · {fechaEmision}</span>
                    </div>
                </div>
            </div>
        </>
    )
}
