import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-9 w-28" />
            </div>
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-0">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-none rounded-t-md" />
                ))}
            </div>
            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-5 w-32" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-5 w-32" />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
