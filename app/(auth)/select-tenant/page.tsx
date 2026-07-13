'use client'

import { useEffect, useState } from 'react'
import { getTenants, selectTenant } from '@/lib/actions/tenants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Building2 } from 'lucide-react'

export default function SelectTenantPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [tenants, setTenants] = useState<any[]>([])
    const [selectedTenant, setSelectedTenant] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getTenants().then(data => {
            setTenants(data)
            setLoading(false)
        })
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-xl border-orange-500/20">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-orange-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <Building2 className="h-8 w-8 text-orange-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Seleccionar Organización</CardTitle>
                    <CardDescription>
                        Identifícate con la organización para continuar
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={selectTenant} className="space-y-6">
                        <div className="space-y-2">
                            <Select name="tenantId" onValueChange={setSelectedTenant} required>
                                <SelectTrigger className="w-full py-6 text-base bg-white">
                                    <SelectValue placeholder="Seleccione una empresa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {loading ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Cargando...</div>
                                    ) : (
                                        tenants.map((tenant) => (
                                            <SelectItem key={tenant.id} value={tenant.id} className="cursor-pointer py-3">
                                                <span className="font-medium">{tenant.name}</span>
                                                {tenant.ruc && <span className="text-xs text-muted-foreground ml-2">({tenant.ruc})</span>}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg font-semibold shadow-lg shadow-orange-500/20"
                            disabled={!selectedTenant}
                        >
                            Continuar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
