
import { Metadata } from "next"
import { getJobTitles } from "@/lib/actions/job-titles"
import { JobTitlesTable } from "@/components/settings/users/job-titles/job-titles-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { JobTitleDialogTrigger } from "@/app/(dashboard)/settings/users/job-titles/job-title-dialog-trigger"

export const metadata: Metadata = {
    title: "Cargos de Personal | Reporta",
    description: "Gestión de cargos y puestos de trabajo.",
}

export default async function JobTitlesPage() {
    const { data: jobTitles, error } = await getJobTitles(false) // Get all including inactive

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cargos de Personal</h2>
                    <p className="text-muted-foreground">
                        Administre los cargos y puestos de trabajo disponibles para su organización.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <JobTitleDialogTrigger />
                </div>
            </div>

            {error ? (
                <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive">
                    Error al cargar cargos: {error}
                </div>
            ) : (
                <JobTitlesTable data={jobTitles || []} />
            )}
        </div>
    )
}
