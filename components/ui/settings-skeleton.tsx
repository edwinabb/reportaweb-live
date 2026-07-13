import { Skeleton } from '@/components/ui/skeleton'

export function SettingsSkeleton() {
    return (
        <div className="flex flex-col gap-6 max-w-2xl animate-pulse">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-48" />
            </div>
            <div className="rounded-lg border p-6 flex flex-col gap-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                ))}
                <div className="flex justify-end pt-2">
                    <Skeleton className="h-9 w-28" />
                </div>
            </div>
        </div>
    )
}
