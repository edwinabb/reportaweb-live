import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface AddButtonProps {
    onClick: () => void
    disabled?: boolean
    className?: string
}

export function AddButton({ onClick, disabled, className }: AddButtonProps) {
    return (
        <Button
            type="button"
            size="icon"
            onClick={onClick}
            disabled={disabled}
            className={`shrink-0 rounded-full bg-orange-500 hover:bg-orange-600 text-white h-8 w-8 ${className}`}
            title="Agregar nuevo"
        >
            <Plus className="h-4 w-4" />
        </Button>
    )
}
