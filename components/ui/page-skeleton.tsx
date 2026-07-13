import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-1 animate-pulse">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-32 rounded-full" />
            </div>
            {/* Filter/search bar */}
            <div className="flex gap-3">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-32" />
            </div>
            {/* Table header */}
            <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 flex gap-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 flex gap-4 border-t items-center">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-28 ml-auto" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
        </div>
    )
}
