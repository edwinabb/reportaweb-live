/**
 * Wrapper de la plantilla de Valorización para Compras — mismo layout que
 * Ventas (lib/valorizacion-venta-pdf-template.ts), con el rótulo "PROVEEDOR"
 * en vez de "CLIENTE" y título "VALORIZACIÓN DE COMPRA".
 */
import {
    renderValorizacionVentaHtml,
    type ValorizacionVentaPdfData,
    type ValorizacionVentaItem,
    type ConfigValorizacionVenta,
} from './valorizacion-venta-pdf-template'

export type ConfigValorizacionCompra = ConfigValorizacionVenta
export type ValorizacionCompraItem = ValorizacionVentaItem

export type ValorizacionCompraPdfData = Omit<ValorizacionVentaPdfData, 'cliente' | 'partyLabel' | 'titulo'> & {
    proveedor: {
        razon_social?: string | null
        ruc?: string | null
    }
}

export function renderValorizacionCompraHtml(data: ValorizacionCompraPdfData): string {
    const { proveedor, ...rest } = data
    return renderValorizacionVentaHtml({
        ...rest,
        cliente: proveedor,
        partyLabel: 'PROVEEDOR',
        titulo: 'VALORIZACIÓN DE COMPRA',
    })
}
