"use client"

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

type SerieKey = 'enviadas' | 'rechazadas' | 'aprobadas'

const COLORS: Record<SerieKey, string> = {
    enviadas: '#3b82f6',
    rechazadas: '#ef4444',
    aprobadas: '#22c55e',
}

type Row = Record<string, number | string> & Partial<Record<SerieKey, number>>

export default function CotizacionesBarChart({ data, xKey }: { data: Row[]; xKey: string }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="enviadas" name="Enviadas" fill={COLORS.enviadas} />
                <Bar dataKey="rechazadas" name="Rechazadas" fill={COLORS.rechazadas} />
                <Bar dataKey="aprobadas" name="Aprobadas" fill={COLORS.aprobadas} />
            </BarChart>
        </ResponsiveContainer>
    )
}
