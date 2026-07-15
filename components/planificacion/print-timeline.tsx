import { format, eachDayOfInterval, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import type { Festivo } from "@/lib/actions/festivos"

/**
 * Versión estática (server-renderable, sin interacción) del ResourceTimeline,
 * optimizada para impresión en papel carta horizontal.
 * Grilla recurso (filas) × día de la semana (columnas) con chips por tarea.
 */

export interface PrintResource {
    id: string
    nombre: string
    codigo?: string | null
    proveedor_nombre?: string | null
}

export interface PrintAssignment {
    resourceId: string
    date: string // YYYY-MM-DD
    tarea: {
        id: string
        titulo: string
        sitio: string
        codigo: string
        cliente: string
        horario: string
    }
}

interface Props {
    resources: PrintResource[]
    assignments: PrintAssignment[]
    startDate: Date
    endDate: Date
    festivos?: Festivo[]
}

const cellBorder = "1px solid #d1d5db"

export function PrintTimeline({ resources, assignments, startDate, endDate, festivos = [] }: Props) {
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const festivosMap = new Map(festivos.map((f) => [f.fecha, f.descripcion ?? "Festivo"]))

    // Índice recurso|día → asignaciones para lookup O(1) por celda
    const byKey = new Map<string, PrintAssignment[]>()
    for (const a of assignments) {
        const key = `${a.resourceId}|${a.date}`
        const list = byKey.get(key)
        if (list) list.push(a)
        else byKey.set(key, [a])
    }

    if (resources.length === 0) {
        return (
            <p style={{ fontSize: "10pt", color: "#6b7280", padding: "16px 0" }}>
                No hay recursos para mostrar en esta semana.
            </p>
        )
    }

    return (
        <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
                <tr>
                    <th
                        style={{
                            width: "38mm",
                            border: cellBorder,
                            backgroundColor: "#f3f4f6",
                            padding: "4px 6px",
                            textAlign: "left",
                            fontSize: "7.5pt",
                            textTransform: "uppercase",
                            color: "#374151",
                        }}
                    >
                        Recurso
                    </th>
                    {days.map((day) => {
                        const dayStr = format(day, "yyyy-MM-dd")
                        const festivoDesc = festivosMap.get(dayStr)
                        const esEspecial = day.getDay() === 0 || !!festivoDesc
                        const esHoy = isSameDay(day, new Date())
                        return (
                            <th
                                key={dayStr}
                                style={{
                                    border: cellBorder,
                                    backgroundColor: esEspecial ? "#fffbeb" : "#f3f4f6",
                                    padding: "3px 4px",
                                    textAlign: "center",
                                    fontSize: "7.5pt",
                                    color: esEspecial ? "#b45309" : "#374151",
                                }}
                            >
                                <div style={{ textTransform: "uppercase", fontWeight: 500 }}>
                                    {format(day, "EEE", { locale: es })}
                                </div>
                                <div style={{ fontSize: "9pt", fontWeight: 700, color: esHoy ? "#ea580c" : undefined }}>
                                    {format(day, "d MMM", { locale: es })}
                                </div>
                                {festivoDesc && (
                                    <div style={{ fontSize: "6pt", fontWeight: 400, lineHeight: 1.1 }}>{festivoDesc}</div>
                                )}
                            </th>
                        )
                    })}
                </tr>
            </thead>
            <tbody>
                {resources.map((resource) => (
                    <tr key={resource.id}>
                        <td
                            style={{
                                border: cellBorder,
                                padding: "3px 6px",
                                verticalAlign: "top",
                                backgroundColor: "#fafafa",
                            }}
                        >
                            <div style={{ fontSize: "7.5pt", fontWeight: 600, color: "#111827", lineHeight: 1.2 }}>
                                {resource.nombre}
                            </div>
                            {resource.codigo && (
                                <div style={{ fontSize: "6.5pt", color: "#6b7280" }}>{resource.codigo}</div>
                            )}
                            {resource.proveedor_nombre && (
                                <div style={{ fontSize: "6pt", color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                    {resource.proveedor_nombre}
                                </div>
                            )}
                        </td>
                        {days.map((day) => {
                            const dayStr = format(day, "yyyy-MM-dd")
                            const asigs = byKey.get(`${resource.id}|${dayStr}`) ?? []
                            const esCeldaEspecial = day.getDay() === 0 || festivosMap.has(dayStr)
                            return (
                                <td
                                    key={`${resource.id}-${dayStr}`}
                                    style={{
                                        border: cellBorder,
                                        padding: "2px",
                                        verticalAlign: "top",
                                        backgroundColor: esCeldaEspecial ? "#fffbeb" : "#ffffff",
                                        minHeight: "8mm",
                                    }}
                                >
                                    {asigs.map((asig, idx) => (
                                        <div
                                            key={`${asig.tarea.id}-${idx}`}
                                            style={{
                                                backgroundColor: "#ffedd5",
                                                border: "1px solid #fed7aa",
                                                borderRadius: "2px",
                                                padding: "2px 3px",
                                                marginBottom: idx < asigs.length - 1 ? "2px" : 0,
                                                lineHeight: 1.2,
                                                overflow: "hidden",
                                            }}
                                        >
                                            <div style={{ fontSize: "6.5pt", fontWeight: 700, color: "#9a3412" }}>
                                                {asig.tarea.codigo}
                                            </div>
                                            <div style={{ fontSize: "6.5pt", fontWeight: 500, color: "#7c2d12" }}>
                                                {asig.tarea.titulo}
                                            </div>
                                            {asig.tarea.horario && (
                                                <div style={{ fontSize: "6pt", color: "#c2410c" }}>{asig.tarea.horario}</div>
                                            )}
                                            {asig.tarea.sitio && (
                                                <div style={{ fontSize: "6pt", color: "#ea580c" }}>{asig.tarea.sitio}</div>
                                            )}
                                        </div>
                                    ))}
                                </td>
                            )
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
