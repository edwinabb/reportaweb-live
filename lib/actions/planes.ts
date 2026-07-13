'use server'

import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'
import { PlanAccion, PlanAccionAvance } from '@/types/formatos'

const EVIDENCIA_BUCKET = 'reporta-maquinaria-fotos'

const OPEN_STATES = ['PENDIENTE', 'EN_PROCESO', 'REVISION'] as const

export interface CreatePlanAccionInput {
    titulo: string
    descripcion_problema?: string | null
    prioridad?: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
    plantilla_id?: string | null
    pregunta_ref?: Record<string, unknown> | null
    informe_bubble_id?: string | null
}

/**
 * Crea un plan de acción. Llamado internamente cuando se envía un informe con
 * respuestas booleanas negativas.
 */
export async function createPlanAccion(input: CreatePlanAccionInput): Promise<{ success: boolean; id?: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false }

    const { data, error } = await adminClient
        .from('planes_accion')
        .insert({
            tenant_id: tenantId,
            titulo: input.titulo,
            descripcion_problema: input.descripcion_problema ?? null,
            prioridad: input.prioridad ?? 'MEDIA',
            estado: 'PENDIENTE',
            plantilla_id: input.plantilla_id ?? null,
            pregunta_ref: input.pregunta_ref ?? null,
            informe_bubble_id: input.informe_bubble_id ?? null,
            is_active: true,
            created_by: user.id,
        })
        .select('id')
        .single()

    if (error) {
        console.error('[createPlanAccion] error:', error.message)
        return { success: false }
    }

    safeRevalidatePath('/planes-accion')
    return { success: true, id: data.id }
}

export interface PlanesFilter {
    estado?: string
    prioridad?: string
    maquinaria_id?: string
    plantilla_id?: string
    onlyActive?: boolean
}

export async function getPlanesAccion(filter: PlanesFilter = {}): Promise<PlanAccion[]> {
    const { estado, prioridad, maquinaria_id, plantilla_id, onlyActive = true } = filter
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('planes_accion')
        .select(`
            *,
            responsables:planes_accion_responsables(
                plan_id,
                profile_id,
                tenant_id,
                profile:profiles!planes_accion_responsables_profile_id_fkey(id, first_name, last_name, email)
            )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

    if (onlyActive) query = query.eq('is_active', true)
    if (estado && estado !== 'all') query = query.eq('estado', estado)
    if (prioridad && prioridad !== 'all') query = query.eq('prioridad', prioridad)
    if (maquinaria_id) query = query.eq('maquinaria_id', maquinaria_id)
    if (plantilla_id) query = query.eq('plantilla_id', plantilla_id)

    const { data, error } = await query
    if (error) {
        console.error('[getPlanesAccion] query error:', error)
        return []
    }

    return (data || []) as unknown as PlanAccion[]
}

export async function getPlanAccionById(id: string): Promise<PlanAccion | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data, error } = await adminClient
        .from('planes_accion')
        .select(`
            *,
            responsables:planes_accion_responsables(
                plan_id,
                profile_id,
                tenant_id,
                profile:profiles!planes_accion_responsables_profile_id_fkey(id, first_name, last_name, email)
            )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error) {
        console.error('[getPlanAccionById] query error:', error)
        return null
    }

    return (data as unknown as PlanAccion) || null
}

export async function updatePlanAccion(id: string, updates: Partial<PlanAccion>) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, message: 'No autorizado' }

    // Strip relational fields that can't be updated directly
    const { maquinaria, plantilla, responsables, ...patch } = updates as Record<string, unknown>
    void maquinaria; void plantilla; void responsables

    const { error } = await adminClient
        .from('planes_accion')
        .update({
            ...patch,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, message: error.message }

    safeRevalidatePath('/planes-accion')
    safeRevalidatePath(`/planes-accion/${id}`)
    return { success: true, message: 'Plan actualizado correctamente' }
}

export async function getPlanAvances(planId: string): Promise<PlanAccionAvance[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data } = await adminClient
        .from('planes_accion_avances')
        .select('*')
        .eq('plan_id', planId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

    return (data || []) as unknown as PlanAccionAvance[]
}

export interface CreatePlanAvanceInput {
    plan_id: string
    comentario: string
    estado?: string
}

export async function createPlanAvance(input: CreatePlanAvanceInput): Promise<{ success: boolean; message?: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, message: 'No autorizado' }

    const { error } = await adminClient
        .from('planes_accion_avances')
        .insert({
            plan_id: input.plan_id,
            tenant_id: tenantId,
            estado: input.estado ?? 'EN_PROCESO',
            comentario: input.comentario,
            fotos: [],
            created_by: user.id,
        })

    if (error) return { success: false, message: error.message }

    await adminClient
        .from('planes_accion')
        .update({ estado: 'EN_PROCESO', updated_at: new Date().toISOString() })
        .eq('id', input.plan_id)
        .eq('tenant_id', tenantId)
        .eq('estado', 'PENDIENTE')

    safeRevalidatePath('/planes-accion')
    safeRevalidatePath(`/planes-accion/${input.plan_id}`)
    return { success: true }
}

export interface ClosePlanInput {
    comentario: string
    evidencia?: File | null
}

export async function closePlanAccion(planId: string, input: ClosePlanInput) {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) {
        return { success: false, message: 'No autorizado' }
    }

    const { comentario, evidencia } = input
    if (!comentario || !comentario.trim()) {
        return { success: false, message: 'El comentario de cierre es obligatorio' }
    }

    let evidenciaUrl: string | null = null
    if (evidencia && evidencia.size > 0) {
        const ext = (evidencia.name.split('.').pop() || 'jpg').toLowerCase()
        const stamp = Date.now()
        const safeName = `${stamp}.${ext}`
        const storagePath = `planes-accion/${tenantId}/${planId}/${safeName}`

        const { error: upErr } = await adminClient.storage
            .from(EVIDENCIA_BUCKET)
            .upload(storagePath, evidencia, {
                upsert: true,
                contentType: evidencia.type || `image/${ext}`,
            })

        if (upErr) {
            return { success: false, message: `Error al subir evidencia: ${upErr.message}` }
        }

        const { data: pub } = adminClient.storage
            .from(EVIDENCIA_BUCKET)
            .getPublicUrl(storagePath)
        evidenciaUrl = pub.publicUrl
    }

    const nowIso = new Date().toISOString()

    const { error: avanceErr } = await adminClient
        .from('planes_accion_avances')
        .insert({
            plan_id: planId,
            tenant_id: tenantId,
            estado: 'CERRADO',
            comentario,
            fotos: evidenciaUrl ? [evidenciaUrl] : [],
            created_by: user.id,
        })

    if (avanceErr) {
        return { success: false, message: `Error al guardar avance: ${avanceErr.message}` }
    }

    const { error: updErr } = await adminClient
        .from('planes_accion')
        .update({
            estado: 'CERRADO',
            fecha_cierre: nowIso,
            comentario_cierre: comentario,
            evidencia_cierre_url: evidenciaUrl,
            updated_at: nowIso,
        })
        .eq('id', planId)
        .eq('tenant_id', tenantId)

    if (updErr) {
        return { success: false, message: `Error al cerrar plan: ${updErr.message}` }
    }

    safeRevalidatePath('/planes-accion')
    safeRevalidatePath(`/planes-accion/${planId}`)
    safeRevalidatePath('/planes-accion/panel')
    return { success: true, message: 'Plan cerrado correctamente' }
}

export interface PlanesStats {
    total: number
    abiertos: number
    criticos: number
    cerrados: number
    vencidos: number
}

export interface PlanesAggregates {
    byEstado: Array<{ key: string; count: number }>
    byPrioridad: Array<{ key: string; count: number }>
    byMaquinaria: Array<{ id: string; nombre: string; count: number }>
    byPregunta: Array<{ titulo: string; count: number }>
}

export async function getPlanesAggregates(): Promise<PlanesAggregates> {
    const empty: PlanesAggregates = { byEstado: [], byPrioridad: [], byMaquinaria: [], byPregunta: [] }
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return empty

    const { data, error } = await adminClient
        .from('planes_accion')
        .select('estado, prioridad, maquinaria_id, pregunta_ref')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

    if (error) {
        console.error('[getPlanesAggregates] query error:', error)
        return empty
    }
    if (!data) return empty

    const byEstadoMap = new Map<string, number>()
    const byPrioridadMap = new Map<string, number>()
    const byMaquinariaMap = new Map<string, { nombre: string; count: number }>()
    const byPreguntaMap = new Map<string, number>()

    for (const row of data as unknown as Array<{
        estado: string | null
        prioridad: string | null
        maquinaria_id: string | null
        maquinaria: { id: string; nombre: string | null } | null
        pregunta_ref: { titulo?: string } | null
    }>) {
        const estado = row.estado || 'SIN_ESTADO'
        byEstadoMap.set(estado, (byEstadoMap.get(estado) || 0) + 1)

        const prioridad = row.prioridad || 'SIN_PRIORIDAD'
        byPrioridadMap.set(prioridad, (byPrioridadMap.get(prioridad) || 0) + 1)

        if (row.maquinaria_id && row.maquinaria) {
            const current = byMaquinariaMap.get(row.maquinaria_id)
            byMaquinariaMap.set(row.maquinaria_id, {
                nombre: row.maquinaria.nombre || 'Sin nombre',
                count: (current?.count || 0) + 1,
            })
        }

        const titulo = row.pregunta_ref?.titulo?.trim()
        if (titulo) byPreguntaMap.set(titulo, (byPreguntaMap.get(titulo) || 0) + 1)
    }

    const estadoOrder = ['PENDIENTE', 'EN_PROCESO', 'REVISION', 'CERRADO', 'VERIFICADO', 'RECHAZADO']
    const prioridadOrder = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA']

    return {
        byEstado: estadoOrder
            .map((k) => ({ key: k, count: byEstadoMap.get(k) || 0 }))
            .concat(
                [...byEstadoMap.entries()]
                    .filter(([k]) => !estadoOrder.includes(k))
                    .map(([key, count]) => ({ key, count })),
            )
            .filter((x) => x.count > 0),
        byPrioridad: prioridadOrder
            .map((k) => ({ key: k, count: byPrioridadMap.get(k) || 0 }))
            .concat(
                [...byPrioridadMap.entries()]
                    .filter(([k]) => !prioridadOrder.includes(k))
                    .map(([key, count]) => ({ key, count })),
            )
            .filter((x) => x.count > 0),
        byMaquinaria: [...byMaquinariaMap.entries()]
            .map(([id, v]) => ({ id, nombre: v.nombre, count: v.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        byPregunta: [...byPreguntaMap.entries()]
            .map(([titulo, count]) => ({ titulo, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
    }
}

export async function getPlanesStats(): Promise<PlanesStats> {
    const empty: PlanesStats = { total: 0, abiertos: 0, criticos: 0, cerrados: 0, vencidos: 0 }
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return empty

    const base = () =>
        adminClient
            .from('planes_accion')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)

    const today = new Date().toISOString().slice(0, 10)

    const [total, abiertos, criticos, cerrados, vencidos] = await Promise.all([
        base(),
        base().in('estado', OPEN_STATES as unknown as string[]),
        base().eq('prioridad', 'CRITICA').neq('estado', 'CERRADO'),
        base().eq('estado', 'CERRADO'),
        base().in('estado', OPEN_STATES as unknown as string[]).lt('fecha_limite', today),
    ])

    return {
        total: total.count ?? 0,
        abiertos: abiertos.count ?? 0,
        criticos: criticos.count ?? 0,
        cerrados: cerrados.count ?? 0,
        vencidos: vencidos.count ?? 0,
    }
}
