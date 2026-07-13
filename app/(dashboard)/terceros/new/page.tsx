import { TerceroForm } from "@/components/terceros/tercero-form"

// HMR Trigger
export default function CreateTerceroPage() {
    return (
        <div className="flex flex-col gap-4">

            <div className="flex flex-col items-center">
                <div className="w-full">
                    <div className="rounded-lg border p-4 bg-background">
                        <TerceroForm />
                    </div>
                </div>
            </div>
        </div>
    )
}
