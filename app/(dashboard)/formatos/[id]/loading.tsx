import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 animate-pulse h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-7 w-56" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            <div className="flex gap-4 flex-1">
                <Skeleton className="w-64 h-full rounded-lg" />
                <Skeleton className="flex-1 h-full rounded-lg" />
            </div>
        </div>
    )
}
