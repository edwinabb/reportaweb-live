"use client"

import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import type { DayPicker } from "react-day-picker"

// Dynamic wrapper: react-day-picker (+16 KB gzip) solo entra al bundle cuando
// Calendar aparece (popovers de date-range, forms de planificación/reportes).
const CalendarInner = dynamic(() => import("./calendar-inner").then((m) => m.Calendar), {
    ssr: false,
    loading: () => <div className="h-[300px] w-[280px] animate-pulse rounded-md bg-muted/40" />,
})

export type CalendarProps = ComponentProps<typeof DayPicker>

export function Calendar(props: CalendarProps) {
    return <CalendarInner {...props} />
}
