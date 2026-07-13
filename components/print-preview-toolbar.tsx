'use client'

interface PrintPreviewToolbarProps {
    backHref: string
    backLabel?: string
    label?: string
}

export function PrintPreviewToolbar({ backHref, backLabel = '← Volver', label }: PrintPreviewToolbarProps) {
    return (
        <div className="no-print fixed top-0 left-0 right-0 z-50 bg-[#111827] border-b border-gray-700 px-6 h-14 flex items-center justify-between print:hidden">
            <a href={backHref} className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition-colors">
                {backLabel}
            </a>
            <div className="flex items-center gap-3">
                {label && <span className="text-gray-500 text-xs hidden sm:block font-mono">{label}</span>}
                <button
                    onClick={() => window.print()}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2 rounded-full transition-colors"
                >
                    Imprimir / Guardar PDF
                </button>
            </div>
        </div>
    )
}
