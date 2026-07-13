import { Skeleton } from '@/components/ui/skeleton'

export default function SoporteLoading() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-32" />
            </div>
            <div className="flex gap-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-9 w-28" />)}
            </div>
            <div className="rounded-md border">
                {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                    </div>
                ))}
            </div>
        </div>
    )
}
