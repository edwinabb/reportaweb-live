interface BarItem {
    label: string
    value: number
    sublabel?: string
}

interface BarListProps {
    items: BarItem[]
    color?: string
    emptyLabel?: string
}

export function BarList({
    items,
    color = 'bg-blue-500',
    emptyLabel = 'Sin datos',
}: BarListProps) {
    if (items.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-8 text-center">{emptyLabel}</p>
        )
    }

    const max = Math.max(...items.map((i) => i.value), 1)

    return (
        <ul className="space-y-2">
            {items.map((item, i) => {
                const pct = (item.value / max) * 100
                return (
                    <li key={`${item.label}-${i}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">
                                <span className="font-medium">{item.label}</span>
                                {item.sublabel && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                        {item.sublabel}
                                    </span>
                                )}
                            </span>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {item.value}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full ${color} transition-all`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
