'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Edit2, MoreHorizontal, Briefcase, Loader2, Power, PowerOff } from 'lucide-react'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { JobTitle } from '@/types/job-titles'
import { toggleJobTitleStatus } from '@/lib/actions/job-titles'
import { JobTitleDialog } from './job-title-dialog'

interface JobTitlesTableProps {
    data: JobTitle[]
}

export function JobTitlesTable({ data }: JobTitlesTableProps) {
    const [editingJob, setEditingJob] = useState<JobTitle | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleToggleStatus = (job: JobTitle) => {
        startTransition(async () => {
            const result = await toggleJobTitleStatus(job.id, job.is_active)
            if (result?.success) {
                toast.success(result.message)
            } else {
                toast.error(result?.message || 'Error al cambiar estado')
            }
        })
    }

    return (
        <>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[400px]">Nombre del Cargo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                    No hay cargos configurados.
                                </TableCell>
                            </TableRow>
                        ) : data.map((job) => (
                            <TableRow key={job.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Briefcase className="w-4 h-4 text-primary" />
                                        </div>
                                        <span>{job.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={job.is_active ? "default" : "secondary"}>
                                        {job.is_active ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => {
                                                setEditingJob(job)
                                                setDialogOpen(true)
                                            }}>
                                                <Edit2 className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleToggleStatus(job)}
                                                className={job.is_active ? "text-destructive" : "text-green-600"}
                                            >
                                                {job.is_active ? (
                                                    <><PowerOff className="mr-2 h-4 w-4" /> Desactivar</>
                                                ) : (
                                                    <><Power className="mr-2 h-4 w-4" /> Activar</>
                                                )}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {dialogOpen && (
                <JobTitleDialog
                    open={dialogOpen}
                    onOpenChange={(v) => {
                        setDialogOpen(v)
                        if (!v) setEditingJob(null)
                    }}
                    jobTitle={editingJob}
                />
            )}
        </>
    )
}
