'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'
import type { Database } from '@/types/supabase'

type TipoPregunta =
    | 'SELECCION_UNICA'
    | 'SELECCION_MULTIPLE'
    | 'TEXTO_CORTO'
    | 'TEXTO_LARGO'
    | 'NUMERO'
    | 'FECHA'
    | 'BOOLEANO'
    | 'FOTO'

type EstadoVersion = 'BORRADOR' | 'PUBLICADA' | 'ARCHIVADA'

export type PlantillaListItem = {
    id: string
    codigo: string
    nombre: string
    descripcion: string | null
    version_actual_id: string | null
    version_actual_etiqueta: string | null
    version_actual_numero: number | null
    total_versiones: number
    total_informes: number
    created_at: string
    updated_at: string | null
}

export type PreguntaRow = {
    id: string
    seccion: string | null
    orden: number
    texto: string
    tipo: TipoPregunta
    requerida: boolean
    permite_nota: boolean
    texto_ayuda: string | null
    opciones: Array<{
        id: string
        orden: number
        etiqueta: string
        valor: string
        es_conforme: boolean | null
    }>
}

export type VersionDetalle = {
    id: string
    formato_id: string
    numero_version: number
    etiqueta_version: string | null
    estado: EstadoVersion
    publicado_at: string | null
    muestra_bloque_empresa: boolean
    muestra_bloque_cliente: boolean
    muestra_bloque_cotizacion: boolean
    muestra_bloque_tarea: boolean
    muestra_bloque_observaciones: boolean
    muestra_bloque_firma: boolean
    requisito_maquinaria: 'DESHABILITADO' | 'OPCIONAL' | 'UNICO' | 'MULTIPLE'
    requisito_personal: 'DESHABILITADO' | 'OPCIONAL' | 'UNICO' | 'MULTIPLE'
    preguntas: PreguntaRow[]
}

export type PlantillaDetalle = {
    id: string
    codigo: string
    nombre: string
    descripcion: string | null
    version_actual_id: string | null
    is_active: boolean
    created_at: string
    versiones: Array<{
        id: string
        numero_version: number
        etiqueta_version: string | null
        estado: EstadoVersion
        publicado_at: string | null
        total_preguntas: number
    }>
}

// ─────────────────────────────────────────────────────────────
// Listado de plantillas
// ─────────────────────────────────────────────────────────────
export async function getFormatos(): Promise<PlantillaListItem[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data: plantillas, error } = await adminClient
        .from('formatos')
        .select(`
            id, codigo, nombre, descripcion, version_actual_id, created_at, updated_at,
            version_actual:formatos_versiones!formatos_version_actual_fkey(etiqueta_version, numero_version),
            versiones:formatos_versiones!formatos_versiones_formato_id_fkey(
                id,
                informes:formatos_informes(id)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('codigo', { ascending: true })

    if (error) {
        console.error('getFormatos error (raw):', error, JSON.stringify(error, null, 2))
        return []
    }

    return (plantillas ?? []).map(p => {
        const va = Array.isArray(p.version_actual) ? p.version_actual[0] : p.version_actual
        const versiones = Array.isArray(p.versiones) ? p.versiones : []
        const totalInformes = versiones.reduce((acc: number, v: { informes?: { id: string }[] | null }) => {
            return acc + (Array.isArray(v.informes) ? v.informes.length : 0)
        }, 0)
        return {
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            descripcion: p.descripcion,
            version_actual_id: p.version_actual_id,
            version_actual_etiqueta: (va as { etiqueta_version?: string } | null)?.etiqueta_version ?? null,
            version_actual_numero: (va as { numero_version?: number } | null)?.numero_version ?? null,
            total_versiones: versiones.length,
            total_informes: totalInformes,
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    })
}

// ─────────────────────────────────────────────────────────────
// Detalle de una plantilla con sus versiones
// ─────────────────────────────────────────────────────────────
export async function getFormatoById(formatoId: string): Promise<PlantillaDetalle | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data: formato, error } = await adminClient
        .from('formatos')
        .select(`
            id, codigo, nombre, descripcion, version_actual_id, is_active, created_at,
            versiones:formatos_versiones!formatos_versiones_formato_id_fkey(
                id, numero_version, etiqueta_version, estado, publicado_at,
                preguntas:formatos_preguntas(id)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', formatoId)
        .single()

    if (error || !formato) {
        console.error('getFormatoById error:', error, JSON.stringify(error, null, 2))
        return null
    }

    const versiones = (formato.versiones ?? [])
        .map(v => ({
            id: v.id,
            numero_version: v.numero_version,
            etiqueta_version: v.etiqueta_version,
            estado: v.estado as EstadoVersion,
            publicado_at: v.publicado_at,
            total_preguntas: Array.isArray(v.preguntas) ? v.preguntas.length : 0,
        }))
        .sort((a, b) => b.numero_version - a.numero_version)

    return {
        id: formato.id,
        codigo: formato.codigo,
        nombre: formato.nombre,
        descripcion: formato.descripcion,
        version_actual_id: formato.version_actual_id,
        is_active: formato.is_active,
        created_at: formato.created_at,
        versiones,
    }
}

// ─────────────────────────────────────────────────────────────
// Detalle de una versión con sus preguntas
// ─────────────────────────────────────────────────────────────
export async function getVersionById(versionId: string): Promise<VersionDetalle | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data: version, error } = await adminClient
        .from('formatos_versiones')
        .select(`
            id, formato_id, numero_version, etiqueta_version, estado, publicado_at,
            muestra_bloque_empresa, muestra_bloque_cliente, muestra_bloque_cotizacion,
            muestra_bloque_tarea, muestra_bloque_observaciones, muestra_bloque_firma,
            requisito_maquinaria, requisito_personal,
            preguntas:formatos_preguntas(
                id, seccion, orden, texto, tipo, requerida, permite_nota, texto_ayuda,
                opciones:formatos_opciones(id, orden, etiqueta, valor, es_conforme)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', versionId)
        .single()

    if (error || !version) {
        console.error('getVersionById error:', error, JSON.stringify(error, null, 2))
        return null
    }

    const preguntas: PreguntaRow[] = (version.preguntas ?? [])
        .filter((q: any) => q.is_active !== false)
        .map((q: any) => ({
            id: q.id,
            seccion: q.seccion,
            orden: q.orden,
            texto: q.texto,
            tipo: q.tipo as TipoPregunta,
            requerida: q.requerida,
            permite_nota: q.permite_nota,
            texto_ayuda: q.texto_ayuda,
            opciones: (q.opciones ?? [])
                .map((o: any) => ({
                    id: o.id,
                    orden: o.orden,
                    etiqueta: o.etiqueta,
                    valor: o.valor,
                    es_conforme: o.es_conforme,
                }))
                .sort((a: any, b: any) => a.orden - b.orden),
        }))
        .sort((a, b) => a.orden - b.orden)

    return {
        id: version.id,
        formato_id: version.formato_id,
        numero_version: version.numero_version,
        etiqueta_version: version.etiqueta_version,
        estado: version.estado as EstadoVersion,
        publicado_at: version.publicado_at,
        muestra_bloque_empresa: version.muestra_bloque_empresa,
        muestra_bloque_cliente: version.muestra_bloque_cliente,
        muestra_bloque_cotizacion: version.muestra_bloque_cotizacion,
        muestra_bloque_tarea: version.muestra_bloque_tarea,
        muestra_bloque_observaciones: version.muestra_bloque_observaciones,
        muestra_bloque_firma: version.muestra_bloque_firma,
        requisito_maquinaria: version.requisito_maquinaria as VersionDetalle['requisito_maquinaria'],
        requisito_personal: version.requisito_personal as VersionDetalle['requisito_personal'],
        preguntas,
    }
}

// ─────────────────────────────────────────────────────────────
// CRUD plantilla
// ─────────────────────────────────────────────────────────────
export async function createFormato(input: {
    codigo: string
    nombre: string
    descripcion?: string | null
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    const codigo = input.codigo.trim()
    const nombre = input.nombre.trim()
    if (!codigo || !nombre) return { success: false, error: 'Código y nombre son requeridos' }

    const { data, error } = await adminClient
        .from('formatos')
        .insert({
            tenant_id: tenantId,
            codigo,
            nombre,
            descripcion: input.descripcion?.trim() || null,
            created_by: user.id,
        })
        .select('id')
        .single()

    if (error || !data) {
        console.error('createFormato error (raw):', error, JSON.stringify(error, null, 2))
        return { success: false, error: error?.message ?? 'Error desconocido' }
    }

    // Al crear un formato, también creamos su primera versión BORRADOR vacía
    const { data: version, error: versionError } = await adminClient
        .from('formatos_versiones')
        .insert({
            tenant_id: tenantId,
            formato_id: data.id,
            numero_version: 1,
            etiqueta_version: 'V.01',
            estado: 'BORRADOR',
            created_by: user.id,
        })
        .select('id')
        .single()

    if (versionError || !version) {
        console.error('createFormato version error (raw):', versionError, JSON.stringify(versionError, null, 2))
        return { success: false, error: versionError?.message ?? 'Error creando versión inicial' }
    }

    safeRevalidatePath('/formatos')
    return { success: true, id: data.id }
}

export async function updateFormato(
    formatoId: string,
    input: { codigo?: string; nombre?: string; descripcion?: string | null }
): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    const patch: Record<string, unknown> = { updated_by: user.id, updated_at: new Date().toISOString() }
    if (input.codigo !== undefined) patch.codigo = input.codigo.trim()
    if (input.nombre !== undefined) patch.nombre = input.nombre.trim()
    if (input.descripcion !== undefined) patch.descripcion = input.descripcion?.trim() || null

    const { error } = await adminClient
        .from('formatos')
        .update(patch)
        .eq('tenant_id', tenantId)
        .eq('id', formatoId)

    if (error) {
        console.error('updateFormato error (raw):', error, JSON.stringify(error, null, 2))
        return { success: false, error: error.message }
    }

    safeRevalidatePath('/formatos')
    safeRevalidatePath(`/formatos/${formatoId}`)
    return { success: true }
}

export async function deactivateFormato(
    formatoId: string
): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    const { error } = await adminClient
        .from('formatos')
        .update({ is_active: false, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', formatoId)

    if (error) {
        console.error('deactivateFormato error (raw):', error, JSON.stringify(error, null, 2))
        return { success: false, error: error.message }
    }

    safeRevalidatePath('/formatos')
    return { success: true }
}

// ─────────────────────────────────────────────────────────────
// Editor de versión BORRADOR — save-all (drop-and-insert transacción best-effort)
// ─────────────────────────────────────────────────────────────

type SavePreguntaInput = {
    id?: string            // null/undefined = nueva; string = existente
    seccion: string | null
    orden: number
    texto: string
    tipo: TipoPregunta
    requerida: boolean
    permite_nota: boolean
    texto_ayuda?: string | null
    opciones: Array<{
        id?: string
        orden: number
        etiqueta: string
        valor: string
        es_conforme: boolean | null
    }>
}

export type SaveVersionInput = {
    muestra_bloque_empresa: boolean
    muestra_bloque_cliente: boolean
    muestra_bloque_cotizacion: boolean
    muestra_bloque_tarea: boolean
    muestra_bloque_observaciones: boolean
    muestra_bloque_firma: boolean
    requisito_maquinaria: 'DESHABILITADO' | 'OPCIONAL' | 'UNICO' | 'MULTIPLE'
    requisito_personal: 'DESHABILITADO' | 'OPCIONAL' | 'UNICO' | 'MULTIPLE'
    preguntas: SavePreguntaInput[]
}

export async function saveVersionBorrador(
    versionId: string,
    input: SaveVersionInput
): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    // Validar que la versión esté en BORRADOR
    const { data: version, error: errVer } = await adminClient
        .from('formatos_versiones')
        .select('id, estado, formato_id')
        .eq('tenant_id', tenantId)
        .eq('id', versionId)
        .single()
    if (errVer || !version) return { success: false, error: 'Versión no encontrada' }
    if (version.estado !== 'BORRADOR') {
        return { success: false, error: `No se puede editar una versión ${version.estado}. Cloná a una nueva versión primero.` }
    }

    // 1) Update metadata de la versión
    const { error: errUpd } = await adminClient
        .from('formatos_versiones')
        .update({
            muestra_bloque_empresa: input.muestra_bloque_empresa,
            muestra_bloque_cliente: input.muestra_bloque_cliente,
            muestra_bloque_cotizacion: input.muestra_bloque_cotizacion,
            muestra_bloque_tarea: input.muestra_bloque_tarea,
            muestra_bloque_observaciones: input.muestra_bloque_observaciones,
            muestra_bloque_firma: input.muestra_bloque_firma,
            requisito_maquinaria: input.requisito_maquinaria,
            requisito_personal: input.requisito_personal,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', versionId)
    if (errUpd) {
        console.error('saveVersion update error:', errUpd, JSON.stringify(errUpd, null, 2))
        return { success: false, error: errUpd.message }
    }

    // 2) Estrategia simple: borrar todas las preguntas + re-insertar (RLS + cascade borran opciones).
    // Esto es aceptable en BORRADOR porque no hay informes apuntando a ellas todavía (los informes
    // solo se crean contra versiones PUBLICADAS desde el llenado).
    const { error: errDel } = await adminClient
        .from('formatos_preguntas')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('version_id', versionId)
    if (errDel) {
        console.error('saveVersion delete error:', errDel, JSON.stringify(errDel, null, 2))
        return { success: false, error: errDel.message }
    }

    if (input.preguntas.length > 0) {
        const preguntasInsert = input.preguntas.map((q, idx) => ({
            tenant_id: tenantId,
            version_id: versionId,
            seccion: q.seccion,
            orden: idx + 1,
            texto: q.texto,
            tipo: q.tipo,
            requerida: q.requerida,
            permite_nota: q.permite_nota,
            texto_ayuda: q.texto_ayuda ?? null,
        }))
        const { data: pregInsertadas, error: errIns } = await adminClient
            .from('formatos_preguntas')
            .insert(preguntasInsert)
            .select('id, orden')
        if (errIns || !pregInsertadas) {
            console.error('saveVersion insert preguntas error:', errIns, JSON.stringify(errIns, null, 2))
            return { success: false, error: errIns?.message ?? 'Error insertando preguntas' }
        }

        const opcionesInsert: Array<{
            tenant_id: string
            pregunta_id: string
            orden: number
            etiqueta: string
            valor: string
            es_conforme: boolean | null
        }> = []
        for (let i = 0; i < input.preguntas.length; i++) {
            const q = input.preguntas[i]
            if (!q.opciones || q.opciones.length === 0) continue
            const preguntaInsertada = pregInsertadas.find(p => p.orden === i + 1)
            if (!preguntaInsertada) continue
            q.opciones.forEach((opt, idx) => {
                opcionesInsert.push({
                    tenant_id: tenantId,
                    pregunta_id: preguntaInsertada.id,
                    orden: idx + 1,
                    etiqueta: opt.etiqueta.trim(),
                    valor: opt.valor.trim(),
                    es_conforme: opt.es_conforme,
                })
            })
        }
        if (opcionesInsert.length > 0) {
            const { error: errOpt } = await adminClient
                .from('formatos_opciones')
                .insert(opcionesInsert)
            if (errOpt) {
                console.error('saveVersion insert opciones error:', errOpt, JSON.stringify(errOpt, null, 2))
                return { success: false, error: errOpt.message }
            }
        }
    }

    safeRevalidatePath(`/formatos/${version.formato_id}`)
    safeRevalidatePath(`/formatos/${version.formato_id}/versiones/${versionId}`)
    return { success: true }
}

// ─────────────────────────────────────────────────────────────
// Publicar versión
// ─────────────────────────────────────────────────────────────
export async function publicarVersion(
    versionId: string
): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    const { data: version, error: errVer } = await adminClient
        .from('formatos_versiones')
        .select('id, estado, formato_id, tenant_id')
        .eq('tenant_id', tenantId)
        .eq('id', versionId)
        .single()
    if (errVer || !version) return { success: false, error: 'Versión no encontrada' }
    if (version.estado !== 'BORRADOR') {
        return { success: false, error: `Sólo versiones en BORRADOR se pueden publicar (estado actual: ${version.estado})` }
    }

    // Validar que tenga al menos 1 pregunta
    const { count: totalPreguntas } = await adminClient
        .from('formatos_preguntas')
        .select('id', { count: 'exact', head: true })
        .eq('version_id', versionId)
    if (!totalPreguntas || totalPreguntas === 0) {
        return { success: false, error: 'La versión no puede publicarse sin preguntas' }
    }

    // Publicar
    const { error: errPub } = await adminClient
        .from('formatos_versiones')
        .update({
            estado: 'PUBLICADA',
            publicado_at: new Date().toISOString(),
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', versionId)
    if (errPub) {
        console.error('publicarVersion error:', errPub, JSON.stringify(errPub, null, 2))
        return { success: false, error: errPub.message }
    }

    // Apuntar version_actual_id del formato (y archivar versiones anteriores publicadas)
    const { data: anterior } = await adminClient
        .from('formatos')
        .select('version_actual_id')
        .eq('id', version.formato_id)
        .single()

    if (anterior?.version_actual_id && anterior.version_actual_id !== versionId) {
        await adminClient
            .from('formatos_versiones')
            .update({ estado: 'ARCHIVADA' })
            .eq('id', anterior.version_actual_id)
    }

    await adminClient
        .from('formatos')
        .update({ version_actual_id: versionId, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', version.formato_id)

    safeRevalidatePath(`/formatos/${version.formato_id}`)
    safeRevalidatePath(`/formatos/${version.formato_id}/versiones/${versionId}`)
    return { success: true }
}

// ─────────────────────────────────────────────────────────────
// Clonar versión (para editar una publicada)
// ─────────────────────────────────────────────────────────────
export async function clonarVersion(
    versionId: string
): Promise<{ success: true; nuevaVersionId: string } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    const { data: src, error: errSrc } = await adminClient
        .from('formatos_versiones')
        .select(`
            id, formato_id, numero_version, etiqueta_version,
            muestra_bloque_empresa, muestra_bloque_cliente, muestra_bloque_cotizacion,
            muestra_bloque_tarea, muestra_bloque_observaciones, muestra_bloque_firma,
            requisito_maquinaria, requisito_personal,
            preguntas:formatos_preguntas(
                id, seccion, orden, texto, tipo, requerida, permite_nota, texto_ayuda,
                opciones:formatos_opciones(orden, etiqueta, valor, es_conforme)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', versionId)
        .single()
    if (errSrc || !src) return { success: false, error: 'Versión origen no encontrada' }

    // Chequear si ya hay una versión BORRADOR para este formato (no duplicar)
    const { data: borradorExistente } = await adminClient
        .from('formatos_versiones')
        .select('id')
        .eq('formato_id', src.formato_id)
        .eq('estado', 'BORRADOR')
        .maybeSingle()
    if (borradorExistente) {
        return { success: false, error: 'Ya existe una versión BORRADOR para este formato' }
    }

    // Calcular siguiente numero_version
    const { data: ultima } = await adminClient
        .from('formatos_versiones')
        .select('numero_version')
        .eq('formato_id', src.formato_id)
        .order('numero_version', { ascending: false })
        .limit(1)
    const proximoNumero = ultima && ultima.length > 0 ? ultima[0].numero_version + 1 : 1
    const nuevaEtiqueta = `V.${String(proximoNumero).padStart(2, '0')}`

    // Crear nueva versión BORRADOR
    const { data: nueva, error: errNueva } = await adminClient
        .from('formatos_versiones')
        .insert({
            tenant_id: tenantId,
            formato_id: src.formato_id,
            numero_version: proximoNumero,
            etiqueta_version: nuevaEtiqueta,
            estado: 'BORRADOR',
            muestra_bloque_empresa: src.muestra_bloque_empresa,
            muestra_bloque_cliente: src.muestra_bloque_cliente,
            muestra_bloque_cotizacion: src.muestra_bloque_cotizacion,
            muestra_bloque_tarea: src.muestra_bloque_tarea,
            muestra_bloque_observaciones: src.muestra_bloque_observaciones,
            muestra_bloque_firma: src.muestra_bloque_firma,
            requisito_maquinaria: src.requisito_maquinaria,
            requisito_personal: src.requisito_personal,
            created_by: user.id,
        })
        .select('id')
        .single()
    if (errNueva || !nueva) {
        console.error('clonarVersion insert nueva error:', errNueva, JSON.stringify(errNueva, null, 2))
        return { success: false, error: errNueva?.message ?? 'Error creando versión' }
    }

    // Clonar preguntas + opciones
    const preguntasOrdenadas = (src.preguntas ?? []).sort((a: any, b: any) => a.orden - b.orden)
    for (const p of preguntasOrdenadas) {
        const { data: nuevaPreg, error: errPreg } = await adminClient
            .from('formatos_preguntas')
            .insert({
                tenant_id: tenantId,
                version_id: nueva.id,
                seccion: (p as any).seccion,
                orden: (p as any).orden,
                texto: (p as any).texto,
                tipo: (p as any).tipo,
                requerida: (p as any).requerida,
                permite_nota: (p as any).permite_nota,
                texto_ayuda: (p as any).texto_ayuda,
            })
            .select('id')
            .single()
        if (errPreg || !nuevaPreg) {
            console.error('clonarVersion insert preg error:', errPreg, JSON.stringify(errPreg, null, 2))
            return { success: false, error: errPreg?.message ?? 'Error clonando preguntas' }
        }
        const opciones = (p as any).opciones ?? []
        if (opciones.length > 0) {
            await adminClient.from('formatos_opciones').insert(
                opciones.map((o: any) => ({
                    tenant_id: tenantId,
                    pregunta_id: nuevaPreg.id,
                    orden: o.orden,
                    etiqueta: o.etiqueta,
                    valor: o.valor,
                    es_conforme: o.es_conforme,
                }))
            )
        }
    }

    safeRevalidatePath(`/formatos/${src.formato_id}`)
    return { success: true, nuevaVersionId: nueva.id }
}

// ─────────────────────────────────────────────────────────────
// Get plantillas publicadas disponibles para llenar (filtrado por tenant)
// ─────────────────────────────────────────────────────────────
export async function getPlantillasPublicadas(): Promise<Array<{
    formato_id: string
    version_id: string
    codigo: string
    nombre: string
    etiqueta_version: string | null
}>> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data, error } = await adminClient
        .from('formatos')
        .select(`
            id, codigo, nombre, version_actual_id,
            version_actual:formatos_versiones!formatos_version_actual_fkey(id, etiqueta_version, estado)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('version_actual_id', 'is', null)

    if (error) {
        console.error('getPlantillasPublicadas error:', error, JSON.stringify(error, null, 2))
        return []
    }

    type VA = { id: string; etiqueta_version: string | null; estado: string }
    const normalize = (v: unknown): VA | null => {
        if (Array.isArray(v)) return (v[0] as VA) ?? null
        return (v as VA | null) ?? null
    }
    return (data ?? [])
        .map(f => ({ ...f, va: normalize(f.version_actual) }))
        .filter(f => f.va?.estado === 'PUBLICADA')
        .map(f => ({
            formato_id: f.id,
            version_id: f.va!.id,
            codigo: f.codigo,
            nombre: f.nombre,
            etiqueta_version: f.va?.etiqueta_version ?? null,
        }))
}
