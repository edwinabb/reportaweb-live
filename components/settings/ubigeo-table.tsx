
"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { getUbigeoPaginated } from "@/lib/actions/catalogos"

export function UbigeoTable() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query)
            setPage(1) // Reset page on search
        }, 500)
        return () => clearTimeout(timer)
    }, [query])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getUbigeoPaginated(page, 10, debouncedQuery)
            setData(res.data || [])
            setTotalPages(res.totalPages)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [page, debouncedQuery])

    useEffect(() => {
        loadData()
    }, [loadData])

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar departamento, provincia..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Departamento</TableHead>
                            <TableHead>Provincia</TableHead>
                            <TableHead>Distrito</TableHead>
                            <TableHead>Código</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow key="loading">
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No se encontraron resultados
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.id || item.codigo || item.id_ubigeo || Math.random()}>
                                    <TableCell>{item.departamento}</TableCell>
                                    <TableCell>{item.provincia}</TableCell>
                                    <TableCell>{item.distrito}</TableCell>
                                    <TableCell>{item.codigo || item.id_ubigeo}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages || 1}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
