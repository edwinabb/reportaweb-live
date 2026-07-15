import { format, startOfWeek, endOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { getTareas, getRecursosForPlanning } from "@/lib/actions/planificacion"
import { getFestivosInRange } from "@/lib/actions/festivos"
import { PrintPreviewToolbar } from "@/components/print-preview-toolbar"
import { PrintTimeline, type PrintAssignment, type PrintResource } from "@/components/planificacion/print-timeline"
import type { TareaWithRelations } from "@/types/planificacion"

/**
 * Vista imprimible de la planificación semanal (Personal | Maquinaria).
 * PDF carta horizontal — @page { size: letter landscape }.
 *
 * Query params:
 *   vista  = personal | maquinaria  (default: personal)
 *   semana = YYYY-MM-DD             (cualquier día de la semana objetivo; se normaliza
 *                                    a la semana igual que /planificacion, weekStartsOn: 0)
 */

interface Props {
    searchParams: Promise<{ vista?: string; semana?: string }>
}

interface DerivedAssignment extends PrintAssignment {
    tipo: "PERSONAL" | "MAQUINARIA"
}

/**
 * Deriva las asignaciones (recurso × día) desde las tareas de la semana.
 * Misma lógica que el useMemo `assignments` de /planificacion/page.tsx,
 * incluyendo los fallbacks por nombre/proveedor para datos legacy.
 */
function deriveAssignments(
    tareas: TareaWithRelations[],
    recursos: Awaited<ReturnType<typeof getRecursosForPlanning>>,
    startStr: string,
    endStr: string,
): DerivedAssignment[] {
    const personalNombreMap = new Map(recursos.personal.map((p) => [p.nombre.toUpperCase(), p.id]))
    const maquinariaNombreMap = new Map<string, string>([
        ...recursos.maquinaria.map((m): [string, string] => [m.nombre.toUpperCase(), m.id]),
        ...recursos.maquinaria.map((m): [string, string] => [m.nombre.replace(/ · /g, " ").toUpperCase(), m.id]),
        ...recursos.maquinaria.filter((m) => m.categoria).map((m): [string, string] => [m.categoria!.toUpperCase(), m.id]),
        ...recursos.maquinaria.filter((m) => m.codigo).map((m): [string, string] => [m.codigo.toUpperCase(), m.id]),
    ])

    const result: DerivedAssignment[] = []
    for (const tarea of tareas) {
        for (const fecha of tarea.fechas || []) {
            const days: string[] = []
            if (fecha.fecha_inicio && fecha.fecha_fin) {
                const cur = new Date(fecha.fecha_inicio + "T00:00:00Z")
                const stop = new Date(fecha.fecha_fin + "T00:00:00Z")
                const wStart = new Date(startStr + "T00:00:00Z")
                const wEnd = new Date(endStr + "T00:00:00Z")
                const d = new Date(Math.max(cur.getTime(), wStart.getTime()))
                const e = new Date(Math.min(stop.getTime(), wEnd.getTime()))
                while (d <= e) {
                    days.push(d.toISOString().slice(0, 10))
                    d.setUTCDate(d.getUTCDate() + 1)
                }
            } else if (fecha.fechas_multiples) {
                for (const d of fecha.fechas_multiples) {
                    if (d >= startStr && d <= endStr) days.push(d)
                }
            }
            for (const recurso of fecha.recursos || []) {
                let resourceId: string | null =
                    recurso.tipo_recurso === "PERSONAL" ? recurso.personal_id : recurso.maquinaria_id
                // Fallback por nombre para datos legacy (personal_id/maquinaria_id null)
                if (!resourceId && recurso.recurso_externo_nombre) {
                    const nameUpper = recurso.recurso_externo_nombre.toUpperCase()
                    const nameMap = recurso.tipo_recurso === "PERSONAL" ? personalNombreMap : maquinariaNombreMap
                    resourceId = nameMap.get(nameUpper) ?? null
                }
                // Fallback por proveedor: máquina externa con maquinaria_id=null
                if (!resourceId && recurso.tipo_recurso === "MAQUINARIA" && recurso.proveedor_id) {
                    const candidates = recursos.maquinaria.filter((m) => m.proveedor_id === recurso.proveedor_id)
                    if (candidates.length === 1) resourceId = candidates[0].id
                }
                if (!resourceId) continue
                const hi = (fecha as { hora_inicio?: string | null }).hora_inicio ?? null
                const hf = (fecha as { hora_fin?: string | null }).hora_fin ?? null
                const horario = hi && hf ? `${hi.slice(0, 5)} - ${hf.slice(0, 5)}` : hi ? hi.slice(0, 5) : ""
                for (const day of days) {
                    result.push({
                        resourceId,
                        tipo: recurso.tipo_recurso as "PERSONAL" | "MAQUINARIA",
                        date: day,
                        tarea: {
                            id: tarea.id,
                            titulo: tarea.titulo,
                            sitio: tarea.sitio ?? "",
                            codigo: tarea.codigo ?? "",
                            cliente: tarea.cliente_nombre ?? "",
                            horario,
                        },
                    })
                }
            }
        }
    }
    return result
}

export default async function PlanificacionImprimirPage({ searchParams }: Props) {
    const sp = await searchParams
    const vista: "PERSONAL" | "MAQUINARIA" = sp.vista?.toLowerCase() === "maquinaria" ? "MAQUINARIA" : "PERSONAL"

    // Normalizar semana (igual que /planificacion: weekStartsOn 0)
    let base = new Date()
    if (sp.semana && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana)) {
        const [y, m, d] = sp.semana.split("-").map(Number)
        const parsed = new Date(y, m - 1, d)
        if (!isNaN(parsed.getTime())) base = parsed
    }
    const startObj = startOfWeek(base, { weekStartsOn: 0 })
    const endObj = endOfWeek(base, { weekStartsOn: 0 })
    const startIso = format(startObj, "yyyy-MM-dd")
    const endIso = format(endObj, "yyyy-MM-dd")

    const [tareas, recursos, festivos] = await Promise.all([
        getTareas(startIso, endIso),
        getRecursosForPlanning(),
        getFestivosInRange(startIso, endIso),
    ])

    const assignments = deriveAssignments(tareas, recursos, startIso, endIso).filter((a) => a.tipo === vista)
    const occupiedIds = new Set(assignments.map((a) => a.resourceId))

    // Mismo orden que el timeline en pantalla: ocupados primero, luego alfabético
    const sortOccupiedFirst = (a: PrintResource, b: PrintResource) => {
        const aOcc = occupiedIds.has(a.id) ? 0 : 1
        const bOcc = occupiedIds.has(b.id) ? 0 : 1
        if (aOcc !== bOcc) return aOcc - bOcc
        return a.nombre.localeCompare(b.nombre)
    }

    const resources: PrintResource[] =
        vista === "PERSONAL"
            ? recursos.personal
                  .map((p) => ({ id: p.id, nombre: p.nombre, proveedor_nombre: p.proveedor_nombre }))
                  .sort(sortOccupiedFirst)
            : recursos.maquinaria
                  .map((m) => ({ id: m.id, nombre: m.nombre, codigo: m.codigo, proveedor_nombre: m.proveedor_nombre }))
                  .sort(sortOccupiedFirst)

    const vistaLabel = vista === "PERSONAL" ? "Personal" : "Maquinaria"
    const rangoSemana = `${format(startObj, "d 'de' MMMM", { locale: es })} — ${format(endObj, "d 'de' MMMM 'de' yyyy", { locale: es })}`
    const generadoEl = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })

    return (
        <>
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    @page { size: letter landscape; margin: 8mm; }
                    body { background: white !important; margin: 0 !important; }
                    /* min-height 216mm es solo para el preview en pantalla; impreso
                       desborda a una 2ª página en blanco (216mm > 216mm - márgenes) */
                    .print-sheet { box-shadow: none !important; max-width: none !important; width: 100% !important; padding: 0 !important; margin: 0 !important; min-height: 0 !important; }
                }
                body { background: #f1f5f9; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }
                /* Repetir encabezado de días en cada página */
                .print-table thead { display: table-header-group; }
                /* Evitar cortar filas entre páginas */
                .print-table tr { page-break-inside: avoid; break-inside: avoid; }
            `}</style>

            <PrintPreviewToolbar
                backHref="/planificacion"
                backLabel="← Volver a Planificación"
                label={`${vistaLabel} · ${startIso}`}
            />

            <div className="pt-20 pb-12 px-4 print:p-0 print:pt-0">
                <div
                    className="print-sheet bg-white mx-auto shadow-lg text-black"
                    style={{ maxWidth: "279mm", minHeight: "216mm", padding: "8mm" }}
                >
                    {/* Encabezado del documento */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                            marginBottom: "12px",
                            paddingBottom: "8px",
                            borderBottom: "2px solid #111827",
                        }}
                    >
                        <div>
                            <h1 style={{ margin: 0, fontSize: "14pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                Planificación semanal — {vistaLabel}
                            </h1>
                            <div style={{ fontSize: "10pt", color: "#374151", textTransform: "capitalize", marginTop: "2px" }}>
                                {rangoSemana}
                            </div>
                        </div>
                        <div style={{ fontSize: "8pt", color: "#6b7280", textAlign: "right" }}>
                            <div>Generado: {generadoEl}</div>
                            <div>{resources.length} {vista === "PERSONAL" ? "personas" : "equipos"} · {occupiedIds.size} con asignaciones</div>
                        </div>
                    </div>

                    <PrintTimeline
                        resources={resources}
                        assignments={assignments}
                        startDate={startObj}
                        endDate={endObj}
                        festivos={festivos}
                    />
                </div>
            </div>
        </>
    )
}
