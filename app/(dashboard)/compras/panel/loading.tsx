import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-40" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 flex flex-col gap-3">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-8 w-24" />
                        {Array.from({ length: 5 }).map((_, j) => (
                            <div key={j} className="flex justify-between">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
