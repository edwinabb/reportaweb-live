import { Skeleton } from '@/components/ui/skeleton'

export function FormSkeleton() {
    return (
        <div className="flex flex-col gap-6 max-w-3xl animate-pulse">
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-7 w-48" />
            </div>
            <div className="rounded-lg border p-6 flex flex-col gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                ))}
                <div className="flex justify-end gap-2 pt-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-28" />
                </div>
            </div>
        </div>
    )
}
