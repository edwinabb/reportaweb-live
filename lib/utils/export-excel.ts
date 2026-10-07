import { format } from 'date-fns'
import { toast } from 'sonner'

/**
 * Exporta filas a Excel con el nombre estándar: PAGINA-AAAA-MM-DD-HH-MM.xls
 * (ej: USUARIOS-2026-07-14-20-06.xls). Solo cliente (dispara descarga).
 * xlsx se carga dinámicamente para no entrar al bundle inicial (~165 KB gzip).
 * Si no hay filas, muestra un toast y no descarga.
 * Ver docs/UI-TEMPLATE-LISTADOS.md.
 */
export function exportToExcel(pageName: string, rows: Record<string, unknown>[]): void {
    if (!rows.length) {
        toast.error('No hay registros para exportar')
        return
    }

    void (async () => {
        const XLSX = await import('xlsx')

        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        // Nombre de hoja: máx 31 caracteres (límite de Excel)
        XLSX.utils.book_append_sheet(wb, ws, pageName.slice(0, 31))

        const slug = pageName
            .normalize('NFD').replace(/[̀-ͯ]/g, '') // sin tildes
            .toUpperCase().replace(/\s+/g, '-')
        const fileName = `${slug}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.xls`
        XLSX.writeFile(wb, fileName, { bookType: 'xls' })
    })()
}
