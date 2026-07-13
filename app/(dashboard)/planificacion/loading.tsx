import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 animate-pulse">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-40" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-28" />
                </div>
            </div>
            {/* Timeline skeleton */}
            <div className="rounded-lg border overflow-hidden">
                <div className="flex bg-muted/50 border-b">
                    <Skeleton className="h-10 w-48 m-2" />
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 flex-1 m-2" />
                    ))}
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex border-b items-center">
                        <Skeleton className="h-12 w-48 m-2" />
                        {Array.from({ length: 7 }).map((_, j) => (
                            <div key={j} className="flex-1 m-2 h-12" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
