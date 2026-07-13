"use client";

import { useState } from "react";
import { MoreHorizontal, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TerceroContacto, Tercero } from "@/types/terceros";
import { deleteTerceroContacto } from "@/lib/actions/terceros-modules";
import { ContactoDialog } from "@/components/terceros/contacto-dialog";

interface CellActionProps {
    data: TerceroContacto;
    terceros: Tercero[];
}

export const ContactosCellAction: React.FC<CellActionProps> = ({ data, terceros }) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const onConfirm = async () => {
        try {
            setLoading(true);
            const res = await deleteTerceroContacto(data.id);
            if (res.success) {
                toast.success("Contacto eliminado");
                router.refresh();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Error al eliminar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ContactoDialog
                terceros={terceros}
                contactoToEdit={data}
                open={open}
                onOpenChange={setOpen}
                onSuccess={() => router.refresh()}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(data.nombre_completo)}>
                        Copiar nombre
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onConfirm} className="text-red-600 focus:text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
};
