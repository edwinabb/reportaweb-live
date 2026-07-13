import { getPlantillas } from '@/lib/actions/plantillas'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, ClipboardList, PenTool } from 'lucide-react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

export default async function NuevaInspeccionSelectorPage() {
    const plantillas = await getPlantillas(true)

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-orange-600">
                    Nueva Inspección
                </h2>
                <p className="text-muted-foreground">
                    Seleccione el tipo de formato que desea completar.
                </p>
            </div>

            <Separator className="bg-orange-200" />

            {plantillas.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-muted-foreground mb-4">No hay plantillas de inspección configuradas.</p>
                    <Link href="/formatos/plantillas">
                        <Button variant="outline">Configurar Plantillas</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {plantillas.map((plantilla) => (
                        <Card key={plantilla.id} className="hover:border-orange-400 transition-all cursor-pointer group">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 group-hover:text-orange-600 transition-colors">
                                    <ClipboardList className="h-5 w-5" />
                                    {plantilla.nombre}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {plantilla.descripcion || 'Sin descripción'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">
                                    {plantilla.estructura?.length || 0} Secciones configuradas
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/formatos/nuevo/${plantilla.id}`} className="w-full">
                                    <Button className="w-full bg-slate-800 group-hover:bg-orange-600 transition-colors">
                                        Iniciar Inspección <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}

                    {/* Placeholder for creating new if accessing admin */}
                    <Card className="border-dashed flex flex-col justify-center items-center bg-gray-50 opacity-70 hover:opacity-100">
                        <CardContent className="flex flex-col items-center pt-6 text-center">
                            <PenTool className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm font-medium text-gray-500">¿Necesitas otro formato?</p>
                            <Link href="/formatos/plantillas" className="mt-2">
                                <Button variant="link" size="sm">Gestionar Plantillas</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
