import { TerceroForm } from "@/components/terceros/tercero-form"
import { getTerceroById } from "@/lib/actions/terceros"
import { notFound } from "next/navigation"

interface EditTerceroPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditTerceroPage({ params }: EditTerceroPageProps) {
    const { id } = await params
    const tercero = await getTerceroById(id)

    if (!tercero) {
        notFound()
    }

    return (
        <div className="flex flex-col gap-4">

            <div className="flex flex-col items-center">
                <div className="w-full">
                    <div className="rounded-lg border p-4 bg-background">
                        <TerceroForm initialData={tercero} isEdit />
                    </div>
                </div>
            </div>
        </div>
    )
}
