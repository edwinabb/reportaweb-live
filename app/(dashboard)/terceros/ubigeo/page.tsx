import { getDepartamentos } from "@/lib/actions/catalogos"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { PageDescription } from "@/components/ui/page-description"

export default async function UbigeoPage() {
    const departamentos = await getDepartamentos()

    return (
        <div className="flex flex-col gap-4">
            <h1 className="sr-only">Ubigeo</h1>
            <PageDescription>
                Catálogo de ubicación geográfica (ubigeo) del Perú, de solo consulta.
            </PageDescription>
            <div className="border rounded-md bg-white p-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>País</TableHead>
                            <TableHead>Departamento</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {departamentos.map((dept: string, index: number) => (
                            <TableRow key={index}>
                                <TableCell>PERÚ</TableCell>
                                <TableCell>{dept}</TableCell>
                            </TableRow>
                        ))}
                        {departamentos.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center">No hay departamentos cargados.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
