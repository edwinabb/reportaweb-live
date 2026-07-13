interface DonutSegment {
    key: string
    label: string
    count: number
    color: string
}

interface DonutChartProps {
    segments: DonutSegment[]
    size?: number
    thickness?: number
    centerLabel?: string
    centerValue?: string | number
}

export function DonutChart({
    segments,
    size = 180,
    thickness = 28,
    centerLabel,
    centerValue,
}: DonutChartProps) {
    const total = segments.reduce((s, x) => s + x.count, 0)
    const radius = (size - thickness) / 2
    const circumference = 2 * Math.PI * radius
    const cx = size / 2
    const cy = size / 2

    if (total === 0) {
        return (
            <div
                className="flex items-center justify-center rounded-full border-2 border-dashed text-xs text-muted-foreground"
                style={{ width: size, height: size }}
            >
                Sin datos
            </div>
        )
    }

    let offset = 0

    return (
        <div className="flex items-center gap-6">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth={thickness}
                    />
                    {segments.map((seg) => {
                        const length = (seg.count / total) * circumference
                        const dashoffset = -offset
                        offset += length
                        return (
                            <circle
                                key={seg.key}
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth={thickness}
                                strokeDasharray={`${length} ${circumference - length}`}
                                strokeDashoffset={dashoffset}
                            />
                        )
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{centerValue ?? total}</span>
                    {centerLabel && (
                        <span className="text-xs text-muted-foreground">{centerLabel}</span>
                    )}
                </div>
            </div>
            <ul className="space-y-1.5 text-sm">
                {segments.map((seg) => {
                    const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0
                    return (
                        <li key={seg.key} className="flex items-center gap-2">
                            <span
                                className="inline-block h-3 w-3 rounded-sm"
                                style={{ backgroundColor: seg.color }}
                            />
                            <span className="font-medium">{seg.label}</span>
                            <span className="text-muted-foreground ml-auto">
                                {seg.count} <span className="text-xs">({pct}%)</span>
                            </span>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
