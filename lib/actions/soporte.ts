'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { captureWithContext } from '@/lib/sentry'
import {
    type TicketEstado,
    type TicketCriticidad,
    type RespuestaTipo,
    type SeccionSoporte,
    type TicketSoporte,
    type TicketRespuesta,
} from '@/lib/soporte-shared'

// ── Queries ────────────────────────────────────────────────────────────────

async function getProfileNames(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
    if (ids.length === 0) return new Map<string, string>()
    const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', ids)
    const map = new Map<string, string>()
    for (const p of data ?? []) {
        map.set(p.id as string, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim())
    }
    return map
}

export async function getTickets(opts?: {
    estado?: TicketEstado
    seccion?: SeccionSoporte
    criticidad?: TicketCriticidad
    page?: number
    pageSize?: number
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], total: 0 }

    const page     = opts?.page     ?? 1
    const pageSize = opts?.pageSize ?? 20
    const from     = (page - 1) * pageSize
    const to       = from + pageSize - 1

    let query = supabase
        .from('tickets_soporte')
        .select(`*, company:companies!tickets_soporte_tenant_id_fkey(name)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (opts?.estado)     query = query.eq('estado',     opts.estado)
    if (opts?.seccion)    query = query.eq('seccion',    opts.seccion)
    if (opts?.criticidad) query = query.eq('criticidad', opts.criticidad)

    const { data, count, error } = await query
    if (error) {
        captureWithContext(error, '/soporte')
        return { data: [], total: 0 }
    }

    const userIds = [...new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean))]
    const profileMap = await getProfileNames(supabase, userIds)

    const tickets: TicketSoporte[] = (data ?? []).map((row: any) => ({
        ...row,
        imagenes_problema:         row.imagenes_problema         ?? [],
        imagenes_replica_dev:      row.imagenes_replica_dev      ?? [],
        imagenes_pruebas_exitosas: row.imagenes_pruebas_exitosas ?? [],
        reporter_nombre: profileMap.get(row.user_id) ?? null,
        tenant_nombre:   (row.company as any)?.name ?? null,
    }))

    return { data: tickets, total: count ?? 0 }
}

export async function getTicketById(id: string): Promise<TicketSoporte | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tickets_soporte')
        .select(`*, company:companies!tickets_soporte_tenant_id_fkey(name)`)
        .eq('id', id)
        .single()

    if (error || !data) return null

    const profileMap = await getProfileNames(supabase, [(data as any).user_id].filter(Boolean))

    return {
        ...(data as any),
        imagenes_problema:         (data as any).imagenes_problema         ?? [],
        imagenes_replica_dev:      (data as any).imagenes_replica_dev      ?? [],
        imagenes_pruebas_exitosas: (data as any).imagenes_pruebas_exitosas ?? [],
        reporter_nombre: profileMap.get((data as any).user_id) ?? null,
        tenant_nombre:   (data as any).company?.name ?? null,
    }
}

export async function getRespuestas(ticketId: string): Promise<TicketRespuesta[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tickets_soporte_respuestas')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

    if (error) return []

    const userIds = [...new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean))]
    const profileMap = await getProfileNames(supabase, userIds)

    return (data ?? []).map((row: any) => ({
        ...row,
        imagenes:        row.imagenes ?? [],
        reporter_nombre: row.user_id ? (profileMap.get(row.user_id) ?? null) : null,
    }))
}

// ── Mutaciones ─────────────────────────────────────────────────────────────

export async function crearTicket(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile?.tenant_id) return { success: false, error: 'Usuario sin empresa asignada' }

    const seccion     = formData.get('seccion')     as string
    const criticidad  = formData.get('criticidad')  as string
    const descripcion = formData.get('descripcion') as string

    if (!seccion || !criticidad || !descripcion?.trim()) {
        return { success: false, error: 'Faltan campos requeridos' }
    }

    try {
        const { data: numero } = await supabase.rpc('next_ticket_soporte_numero', {
            p_tenant_id: profile.tenant_id,
        })

        const { data: ticket, error } = await supabase
            .from('tickets_soporte')
            .insert({
                numero,
                tenant_id:   profile.tenant_id,
                user_id:     user.id,
                sistema:     'REPORTA_WEB',
                seccion,
                criticidad,
                descripcion: descripcion.trim(),
            })
            .select('id, numero')
            .single()

        if (error) throw error

        // Entrada de sistema: ticket abierto
        await supabase.from('tickets_soporte_respuestas').insert({
            ticket_id:    ticket.id,
            tenant_id:    profile.tenant_id,
            user_id:      user.id,
            mensaje:      'Ticket creado',
            tipo:         'SISTEMA',
            es_de_soporte: false,
        })

        revalidatePath('/soporte')
        return { success: true, ticketId: ticket.id, numero: ticket.numero }
    } catch (err) {
        captureWithContext(err, '/soporte/nuevo')
        return { success: false, error: 'Error al crear el ticket' }
    }
}

export async function guardarImagenesProblema(ticketId: string, urls: string[]) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('tickets_soporte')
        .update({ imagenes_problema: urls })
        .eq('id', ticketId)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/soporte/${ticketId}`)
    return { success: true }
}

export async function agregarRespuesta(
    ticketId: string,
    mensaje: string,
    tipo: RespuestaTipo,
    estadoNuevo?: TicketEstado,
    imagenesUrls?: string[],
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!profile?.tenant_id) return { success: false, error: 'Sin empresa' }

    try {
        await supabase.from('tickets_soporte_respuestas').insert({
            ticket_id:     ticketId,
            tenant_id:     profile.tenant_id,
            user_id:       user.id,
            mensaje,
            tipo,
            estado_nuevo:  estadoNuevo ?? null,
            imagenes:      imagenesUrls ?? [],
            es_de_soporte: profile.role === 'reporta_admin',
        })

        if (estadoNuevo) {
            await supabase
                .from('tickets_soporte')
                .update({ estado: estadoNuevo })
                .eq('id', ticketId)
        }

        revalidatePath(`/soporte/${ticketId}`)
        revalidatePath('/soporte')
        return { success: true }
    } catch (err) {
        captureWithContext(err, `/soporte/${ticketId}`)
        return { success: false, error: 'Error al agregar respuesta' }
    }
}

export async function guardarResolucion(
    ticketId: string,
    opts: {
        explicacion_no_tecnica?: string
        como_se_previene?: string
        imagenes_replica_dev?: string[]
        imagenes_pruebas_exitosas?: string[]
    }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!['reporta_admin','admin_tenant'].includes(profile?.role ?? '')) {
        return { success: false, error: 'Sin permisos' }
    }

    const updates: Record<string, unknown> = {}
    if (opts.explicacion_no_tecnica !== undefined) updates.explicacion_no_tecnica    = opts.explicacion_no_tecnica
    if (opts.como_se_previene       !== undefined) updates.como_se_previene          = opts.como_se_previene
    if (opts.imagenes_replica_dev   !== undefined) updates.imagenes_replica_dev      = opts.imagenes_replica_dev
    if (opts.imagenes_pruebas_exitosas !== undefined) updates.imagenes_pruebas_exitosas = opts.imagenes_pruebas_exitosas

    const { error } = await supabase
        .from('tickets_soporte')
        .update(updates)
        .eq('id', ticketId)

    if (error) return { success: false, error: error.message }
    revalidatePath(`/soporte/${ticketId}`)
    return { success: true }
}

export async function cerrarTicket(ticketId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!['reporta_admin','admin_tenant'].includes(profile?.role ?? '')) {
        return { success: false, error: 'Sin permisos para cerrar tickets' }
    }

    try {
        await supabase
            .from('tickets_soporte')
            .update({
                estado:        'CERRADO',
                cerrado_at:    new Date().toISOString(),
                cerrado_por_id: user.id,
            })
            .eq('id', ticketId)

        await supabase.from('tickets_soporte_respuestas').insert({
            ticket_id:     ticketId,
            tenant_id:     profile!.tenant_id,
            user_id:       user.id,
            mensaje:       'Ticket cerrado',
            tipo:          'SISTEMA',
            es_de_soporte: true,
        })

        revalidatePath(`/soporte/${ticketId}`)
        revalidatePath('/soporte')
        return { success: true }
    } catch (err) {
        captureWithContext(err, `/soporte/${ticketId}`)
        return { success: false, error: 'Error al cerrar el ticket' }
    }
}
