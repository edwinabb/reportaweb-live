import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 flex flex-col gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 flex flex-col gap-3">
                        <Skeleton className="h-5 w-32" />
                        {Array.from({ length: 5 }).map((_, j) => (
                            <div key={j} className="flex gap-3 items-center">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-4 flex-1" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
