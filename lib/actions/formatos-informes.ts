'use server'

import { randomUUID } from 'crypto'

import { getSupabaseContext, safeRevalidatePath } from '@/lib/action-context'
import type { VersionDetalle } from '@/lib/actions/formatos'

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
type RespuestaInput = {
    pregunta_id: string
    opcion_id?: string | null
    opciones_ids?: string[] | null
    valor_texto?: string | null
    valor_numero?: number | null
    valor_fecha?: string | null
    valor_booleano?: boolean | null
    valor_foto_url?: string | null
    nota?: string | null
}

export type InformeCompleto = {
    id: string
    estado: 'BORRADOR' | 'ENVIADO' | 'APROBADO' | 'RECHAZADO' | 'CON_COMENTARIOS'
    codigo_informe: string | null
    tarea_id: string | null
    cliente_id: string | null
    cotizacion_id: string | null
    sitio_id: string | null
    contacto_id: string | null
    tarea_codigo_override: string | null
    tarea_descripcion_override: string | null
    sitio_descripcion_override: string | null
    observaciones: string | null
    firma_url: string | null
    firmante_profile_id: string | null
    fecha_inicio: string | null
    fecha_fin: string | null
    enviado_at: string | null
    aprobado_at: string | null
    rechazado_at: string | null
    razon_rechazo: string | null
    pdf_url: string | null
    created_at: string
    version: VersionDetalle
    formato: { id: string; codigo: string; nombre: string }
    tarea: { id: string; codigo: string | null; descripcion: string | null } | null
    cliente: { id: string; razon_social: string | null; ruc: string | null } | null
    cotizacion: { id: string; numero: number | null; anio: number | null } | null
    sitio: { id: string; nombre: string | null } | null
    contacto: { id: string; nombre_completo: string | null } | null
    respuestas: Array<{
        id: string
        pregunta_id: string
        opcion_id: string | null
        opciones_ids: string[] | null
        valor_texto: string | null
        valor_numero: number | null
        valor_fecha: string | null
        valor_booleano: boolean | null
        valor_foto_url: string | null
        nota: string | null
    }>
    maquinarias: Array<{ id: string; maquinaria_id: string; orden: number }>
    personal: Array<{
        id: string
        profile_id: string | null
        terceros_personal_id: string | null
        tipo_personal: 'PROPIO' | 'PROVEEDOR'
        rol_en_trabajo: string | null
    }>
}

// ─────────────────────────────────────────────────────────────
// Crear informe en BORRADOR — autocompleta desde tarea si viene
// ─────────────────────────────────────────────────────────────
export async function startInforme(input: {
    formato_id: string
    tarea_id?: string | null
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    // Obtener version_actual del formato (debe estar PUBLICADA)
    const { data: formato, error: errFmt } = await adminClient
        .from('formatos')
        .select(`
            id, codigo, nombre, version_actual_id,
            version_actual:formatos_versiones!formatos_version_actual_fkey(id, estado)
        `)
        .eq('tenant_id', tenantId)
        .eq('id', input.formato_id)
        .single()
    if (errFmt || !formato || !formato.version_actual_id) {
        return { success: false, error: 'Formato no tiene versión publicada' }
    }
    const versionActual = Array.isArray(formato.version_actual) ? formato.version_actual[0] : formato.version_actual
    if ((versionActual as { estado?: string } | null)?.estado !== 'PUBLICADA') {
        return { success: false, error: 'La versión actual no está publicada' }
    }

    // Autocompletar desde tarea si viene
    let cliente_id: string | null = null
    let cotizacion_id: string | null = null
    let sitio_id: string | null = null
    let contacto_id: string | null = null
    let tarea_codigo: string | null = null
    let tarea_descripcion: string | null = null

    if (input.tarea_id) {
        const { data: tarea } = await adminClient
            .from('tareas')
            .select('id, codigo, descripcion, cliente_id, cotizacion_id, sitio_id, contacto_id')
            .eq('tenant_id', tenantId)
            .eq('id', input.tarea_id)
            .single()
        if (tarea) {
            cliente_id = tarea.cliente_id ?? null
            cotizacion_id = tarea.cotizacion_id ?? null
            sitio_id = tarea.sitio_id ?? null
            contacto_id = tarea.contacto_id ?? null
            tarea_codigo = tarea.codigo
            tarea_descripcion = tarea.descripcion
        }
    }

    const { data, error } = await adminClient
        .from('formatos_informes')
        .insert({
            tenant_id: tenantId,
            version_id: formato.version_actual_id,
            tarea_id: input.tarea_id ?? null,
            cliente_id,
            cotizacion_id,
            sitio_id,
            contacto_id,
            tarea_codigo_override: tarea_codigo,
            tarea_descripcion_override: tarea_descripcion,
            estado: 'BORRADOR',
            firmante_profile_id: user.id,
            fecha_inicio: new Date().toISOString(),
            uuid_local: randomUUID(),
            created_by: user.id,
        })
        .select('id')
        .single()

    if (error || !data) {
        console.error('startInforme error (raw):', error, JSON.stringify(error, null, 2))
        return { success: false, error: error?.message ?? 'Error creando informe' }
    }

    safeRevalidatePath('/informes')
    return { success: true, id: data.id }
}

// ─────────────────────────────────────────────────────────────
// Cargar informe completo para llenado / vista
// ─────────────────────────────────────────────────────────────
export async function getInformeCompleto(informeId: string): Promise<InformeCompleto | null> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return null

    const { data: informe, error } = await adminClient
        .from('formatos_informes')
        .select(`
            id, estado, codigo_informe, tarea_id, cliente_id, cotizacion_id, sitio_id, contacto_id,
            tarea_codigo_override, tarea_descripcion_override, sitio_descripcion_override,
            observaciones, firma_url, firmante_profile_id,
            fecha_inicio, fecha_fin, enviado_at, aprobado_at, rechazado_at, razon_rechazo,
            pdf_url, created_at,
            version:formatos_versiones(
                id, formato_id, numero_version, etiqueta_version, estado, publicado_at,
                muestra_bloque_empresa, muestra_bloque_cliente, muestra_bloque_cotizacion,
                muestra_bloque_tarea, muestra_bloque_observaciones, muestra_bloque_firma,
                requisito_maquinaria, requisito_personal,
                formato:formatos!formatos_versiones_formato_id_fkey(id, codigo, nombre),
                preguntas:formatos_preguntas(
                    id, seccion, orden, texto, tipo, requerida, permite_nota, texto_ayuda,
                    opciones:formatos_opciones(id, orden, etiqueta, valor, es_conforme)
                )
            ),
            tarea:tareas(id, codigo, descripcion),
            cliente:terceros!formatos_informes_cliente_id_fkey(id, razon_social, ruc),
            cotizacion:cotizaciones(id, numero, anio),
            sitio:terceros_sitios(id, nombre),
            contacto:terceros_contactos(id, nombre_completo),
            respuestas:formatos_informes_respuestas(
                id, pregunta_id, opcion_id, opciones_ids, valor_texto, valor_numero,
                valor_fecha, valor_booleano, valor_foto_url, nota
            ),
            maquinarias:formatos_informes_maquinarias(id, maquinaria_id, orden),
            personal:formatos_informes_personal(
                id, profile_id, terceros_personal_id, tipo_personal, rol_en_trabajo
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', informeId)
        .single()

    if (error || !informe) {
        console.error('getInformeCompleto error:', error, JSON.stringify(error, null, 2))
        return null
    }

    const ver: any = informe.version
    const preguntas = (ver.preguntas ?? [])
        .map((q: any) => ({
            id: q.id,
            seccion: q.seccion,
            orden: q.orden,
            texto: q.texto,
            tipo: q.tipo,
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
        .sort((a: any, b: any) => a.orden - b.orden)

    return {
        id: informe.id,
        estado: informe.estado as any,
        codigo_informe: informe.codigo_informe,
        tarea_id: informe.tarea_id,
        cliente_id: informe.cliente_id,
        cotizacion_id: informe.cotizacion_id,
        sitio_id: informe.sitio_id,
        contacto_id: informe.contacto_id,
        tarea_codigo_override: informe.tarea_codigo_override,
        tarea_descripcion_override: informe.tarea_descripcion_override,
        sitio_descripcion_override: informe.sitio_descripcion_override,
        observaciones: informe.observaciones,
        firma_url: informe.firma_url,
        firmante_profile_id: informe.firmante_profile_id,
        fecha_inicio: informe.fecha_inicio,
        fecha_fin: informe.fecha_fin,
        enviado_at: informe.enviado_at,
        aprobado_at: informe.aprobado_at,
        rechazado_at: informe.rechazado_at,
        razon_rechazo: informe.razon_rechazo,
        pdf_url: informe.pdf_url,
        created_at: informe.created_at,
        version: {
            id: ver.id,
            formato_id: ver.formato_id,
            numero_version: ver.numero_version,
            etiqueta_version: ver.etiqueta_version,
            estado: ver.estado,
            publicado_at: ver.publicado_at,
            muestra_bloque_empresa: ver.muestra_bloque_empresa,
            muestra_bloque_cliente: ver.muestra_bloque_cliente,
            muestra_bloque_cotizacion: ver.muestra_bloque_cotizacion,
            muestra_bloque_tarea: ver.muestra_bloque_tarea,
            muestra_bloque_observaciones: ver.muestra_bloque_observaciones,
            muestra_bloque_firma: ver.muestra_bloque_firma,
            requisito_maquinaria: ver.requisito_maquinaria,
            requisito_personal: ver.requisito_personal,
            preguntas,
        },
        formato: ver.formato,
        tarea: informe.tarea as any,
        cliente: informe.cliente as any,
        cotizacion: informe.cotizacion as any,
        sitio: informe.sitio as any,
        contacto: informe.contacto as any,
        respuestas: informe.respuestas ?? [],
        maquinarias: informe.maquinarias ?? [],
        personal: informe.personal ?? [],
    } as InformeCompleto
}

// ─────────────────────────────────────────────────────────────
// Guardar respuestas + metadata (bulk) mientras está en BORRADOR
// ─────────────────────────────────────────────────────────────
export async function saveBorrador(
    informeId: string,
    input: {
        respuestas: RespuestaInput[]
        observaciones?: string | null
        tarea_codigo_override?: string | null
        tarea_descripcion_override?: string | null
        sitio_descripcion_override?: string | null
        maquinaria_ids?: string[]
        personal?: Array<{
            profile_id?: string | null
            terceros_personal_id?: string | null
            tipo_personal: 'PROPIO' | 'PROVEEDOR'
            rol_en_trabajo?: string | null
        }>
    }
): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    const { data: informe, error: errInf } = await adminClient
        .from('formatos_informes')
        .select('id, estado, version_id')
        .eq('tenant_id', tenantId)
        .eq('id', informeId)
        .single()
    if (errInf || !informe) return { success: false, error: 'Informe no encontrado' }
    if (informe.estado !== 'BORRADOR') {
        return { success: false, error: `No se puede editar un informe ${informe.estado}` }
    }

    // Update metadata
    const { error: errUpd } = await adminClient
        .from('formatos_informes')
        .update({
            observaciones: input.observaciones ?? null,
            tarea_codigo_override: input.tarea_codigo_override ?? null,
            tarea_descripcion_override: input.tarea_descripcion_override ?? null,
            sitio_descripcion_override: input.sitio_descripcion_override ?? null,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        })
        .eq('id', informeId)
    if (errUpd) {
        console.error('saveBorrador update error:', errUpd, JSON.stringify(errUpd, null, 2))
        return { success: false, error: errUpd.message }
    }

    // Reemplazar respuestas (UPSERT por unique(informe_id, pregunta_id))
    // Simplicidad: delete + insert
    await adminClient
        .from('formatos_informes_respuestas')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('informe_id', informeId)

    if (input.respuestas.length > 0) {
        const { error: errResp } = await adminClient
            .from('formatos_informes_respuestas')
            .insert(
                input.respuestas.map(r => ({
                    tenant_id: tenantId,
                    informe_id: informeId,
                    pregunta_id: r.pregunta_id,
                    opcion_id: r.opcion_id ?? null,
                    opciones_ids: r.opciones_ids ?? null,
                    valor_texto: r.valor_texto ?? null,
                    valor_numero: r.valor_numero ?? null,
                    valor_fecha: r.valor_fecha ?? null,
                    valor_booleano: r.valor_booleano ?? null,
                    valor_foto_url: r.valor_foto_url ?? null,
                    nota: r.nota ?? null,
                }))
            )
        if (errResp) {
            console.error('saveBorrador respuestas error:', errResp, JSON.stringify(errResp, null, 2))
            return { success: false, error: errResp.message }
        }
    }

    // Maquinarias: delete + insert
    if (input.maquinaria_ids !== undefined) {
        await adminClient
            .from('formatos_informes_maquinarias')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('informe_id', informeId)
        if (input.maquinaria_ids.length > 0) {
            // Necesitamos snapshot de cada maquinaria
            const { data: maqs } = await adminClient
                .from('maquinarias')
                .select('id, codigo, marca, modelo, descripcion')
                .eq('tenant_id', tenantId)
                .in('id', input.maquinaria_ids)

            const { error: errMaq } = await adminClient
                .from('formatos_informes_maquinarias')
                .insert(
                    input.maquinaria_ids.map((mid, idx) => {
                        const snap = maqs?.find(m => m.id === mid)
                        return {
                            tenant_id: tenantId,
                            informe_id: informeId,
                            maquinaria_id: mid,
                            maquinaria_snapshot: snap ?? {},
                            orden: idx,
                        }
                    })
                )
            if (errMaq) {
                console.error('saveBorrador maquinaria error:', errMaq, JSON.stringify(errMaq, null, 2))
                return { success: false, error: errMaq.message }
            }
        }
    }

    // Personal: delete + insert
    if (input.personal !== undefined) {
        await adminClient
            .from('formatos_informes_personal')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('informe_id', informeId)
        if (input.personal.length > 0) {
            // Snapshot de cada uno
            const profilesIds = input.personal
                .filter(p => p.profile_id)
                .map(p => p.profile_id as string)
            const tercerosIds = input.personal
                .filter(p => p.terceros_personal_id)
                .map(p => p.terceros_personal_id as string)

            const [{ data: profs }, { data: tps }] = await Promise.all([
                profilesIds.length > 0
                    ? adminClient
                          .from('profiles')
                          .select('id, first_name, last_name, email')
                          .in('id', profilesIds)
                    : Promise.resolve({ data: [] }),
                tercerosIds.length > 0
                    ? adminClient
                          .from('terceros_personal')
                          .select('id, nombre')
                          .in('id', tercerosIds)
                    : Promise.resolve({ data: [] }),
            ])

            const { error: errPers } = await adminClient
                .from('formatos_informes_personal')
                .insert(
                    input.personal.map((p, idx) => {
                        const snapshot = p.profile_id
                            ? (profs as any[])?.find((x: any) => x.id === p.profile_id) ?? {}
                            : (tps as any[])?.find((x: any) => x.id === p.terceros_personal_id) ?? {}
                        return {
                            tenant_id: tenantId,
                            informe_id: informeId,
                            profile_id: p.profile_id ?? null,
                            terceros_personal_id: p.terceros_personal_id ?? null,
                            tipo_personal: p.tipo_personal,
                            rol_en_trabajo: p.rol_en_trabajo ?? null,
                            personal_snapshot: snapshot,
                            orden: idx,
                        }
                    })
                )
            if (errPers) {
                console.error('saveBorrador personal error:', errPers, JSON.stringify(errPers, null, 2))
                return { success: false, error: errPers.message }
            }
        }
    }

    safeRevalidatePath(`/informes/${informeId}`)
    return { success: true }
}

// ─────────────────────────────────────────────────────────────
// Upload de foto a bucket `formatos` (service role para evitar RLS)
// ─────────────────────────────────────────────────────────────
export async function uploadInformeFoto(input: {
    informeId: string
    preguntaId: string
    fileBase64: string     // "data:image/...;base64,<data>"
    filename: string
}): Promise<{ success: true; url: string } | { success: false; error: string }> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return { success: false, error: 'No autenticado' }

    const match = input.fileBase64.match(/^data:(.+);base64,(.+)$/)
    if (!match) return { success: false, error: 'Formato de imagen inválido' }
    const mime = match[1]
    const data = Buffer.from(match[2], 'base64')

    const ext = mime.split('/')[1]?.split('+')[0] || 'jpg'
    const ts = Date.now()
    const safeName = input.filename.replace(/[^a-z0-9._-]/gi, '_')
    const path = `${tenantId}/${input.informeId}/${input.preguntaId}/${ts}_${safeName}.${ext}`

    const { error } = await adminClient.storage
        .from('formatos')
        .upload(path, data, { contentType: mime, upsert: true })
    if (error) {
        console.error('uploadInformeFoto error:', error, JSON.stringify(error, null, 2))
        return { success: false, error: error.message }
    }

    const { data: pub } = adminClient.storage.from('formatos').getPublicUrl(path)
    return { success: true, url: pub.publicUrl }
}

// ─────────────────────────────────────────────────────────────
// Enviar informe — valida PIN, sube firma, transiciona a ENVIADO
// ─────────────────────────────────────────────────────────────
export async function enviarInforme(input: {
    informeId: string
    firma_base64: string | null    // "data:image/png;base64,..." opcional si muestra_bloque_firma=false
    pin: number | null
    observaciones?: string | null
}): Promise<{ success: true; codigo: string | null } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    // Cargar informe + versión (para saber si requiere firma)
    const { data: informe, error: errInf } = await adminClient
        .from('formatos_informes')
        .select(`
            id, estado, firmante_profile_id,
            version:formatos_versiones(
                muestra_bloque_firma,
                preguntas:formatos_preguntas(id, requerida, tipo)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', input.informeId)
        .single()
    if (errInf || !informe) return { success: false, error: 'Informe no encontrado' }
    if (informe.estado !== 'BORRADOR') {
        return { success: false, error: `Informe ya fue enviado (estado: ${informe.estado})` }
    }

    const requiereFirma = (informe.version as any)?.muestra_bloque_firma
    if (requiereFirma) {
        if (!input.pin) return { success: false, error: 'El PIN es requerido para firmar' }
        const { data: profile } = await adminClient
            .from('profiles')
            .select('id, pin, first_name, last_name, email')
            .eq('id', user.id)
            .single()
        if (!profile?.pin) {
            return { success: false, error: 'Tu usuario no tiene PIN configurado. Andá a /settings/perfil.' }
        }
        if (Number(profile.pin) !== Number(input.pin)) {
            return { success: false, error: 'PIN incorrecto' }
        }
        if (!input.firma_base64) {
            return { success: false, error: 'La firma es requerida' }
        }
    }

    // Validar respuestas requeridas
    const preguntasReq = ((informe.version as any)?.preguntas ?? []).filter((p: any) => p.requerida)
    if (preguntasReq.length > 0) {
        const { data: respuestas } = await adminClient
            .from('formatos_informes_respuestas')
            .select('pregunta_id')
            .eq('informe_id', input.informeId)
        const respondidas = new Set((respuestas ?? []).map(r => r.pregunta_id))
        const faltantes = preguntasReq.filter((p: any) => !respondidas.has(p.id))
        if (faltantes.length > 0) {
            return {
                success: false,
                error: `Faltan ${faltantes.length} respuestas requeridas`,
            }
        }
    }

    // Upload firma si aplica
    let firma_url: string | null = null
    let firma_hash: string | null = null
    if (requiereFirma && input.firma_base64) {
        const match = input.firma_base64.match(/^data:(.+);base64,(.+)$/)
        if (!match) return { success: false, error: 'Formato de firma inválido' }
        const data = Buffer.from(match[2], 'base64')
        const path = `${tenantId}/${input.informeId}/firma_${Date.now()}.png`
        const { error: errSig } = await adminClient.storage
            .from('formatos')
            .upload(path, data, { contentType: 'image/png', upsert: true })
        if (errSig) {
            console.error('enviarInforme firma upload error:', errSig, JSON.stringify(errSig, null, 2))
            return { success: false, error: `No se pudo subir la firma: ${errSig.message}` }
        }
        firma_url = adminClient.storage.from('formatos').getPublicUrl(path).data.publicUrl
        // Hash simple del base64 (SHA-256 del buffer)
        const { createHash } = await import('crypto')
        firma_hash = createHash('sha256').update(data).digest('hex')
    }

    // Transicionar a ENVIADO (el trigger dispara asignar_correlativo)
    const nowIso = new Date().toISOString()
    const { error: errEnv } = await adminClient
        .from('formatos_informes')
        .update({
            estado: 'ENVIADO',
            enviado_at: nowIso,
            fecha_fin: nowIso,
            observaciones: input.observaciones ?? undefined,
            firmante_profile_id: user.id,
            firma_url,
            firma_hash,
            firma_metadata: requiereFirma
                ? { algoritmo: 'sha256', user_id: user.id, timestamp: nowIso }
                : null,
            pin_validado_at: requiereFirma ? nowIso : null,
            updated_at: nowIso,
            updated_by: user.id,
        })
        .eq('id', input.informeId)
    if (errEnv) {
        console.error('enviarInforme error:', errEnv, JSON.stringify(errEnv, null, 2))
        return { success: false, error: errEnv.message }
    }

    // Leer codigo_informe asignado por el trigger
    const { data: post } = await adminClient
        .from('formatos_informes')
        .select('codigo_informe')
        .eq('id', input.informeId)
        .single()

    // Auto-crear planes de acción para respuestas booleanas negativas (valor_booleano = false)
    try {
        const { data: respFalse } = await adminClient
            .from('formatos_informes_respuestas')
            .select('pregunta_id, valor_booleano')
            .eq('informe_id', input.informeId)
            .eq('valor_booleano', false)

        if (respFalse && respFalse.length > 0) {
            const preguntaIds = respFalse.map((r: any) => r.pregunta_id)
            const { data: preguntas } = await adminClient
                .from('formatos_preguntas')
                .select('id, texto')
                .in('id', preguntaIds)

            const preguntaMap = new Map<string, string>(
                (preguntas ?? []).map((p: any) => [p.id, p.texto ?? 'Pregunta'])
            )

            // Obtener nombre del formato para el título
            const { data: informeData } = await adminClient
                .from('formatos_informes')
                .select('codigo_informe, formato:formatos(nombre)')
                .eq('id', input.informeId)
                .single()
            const formatoNombre = (informeData?.formato as any)?.nombre ?? 'Informe'
            const codigoInforme = informeData?.codigo_informe ?? input.informeId.slice(0, 8)

            const planesInsert = respFalse.map((r: any) => ({
                tenant_id: tenantId,
                titulo: `${formatoNombre} ${codigoInforme} — ${preguntaMap.get(r.pregunta_id) ?? 'Hallazgo'}`.slice(0, 250),
                descripcion_problema: `Hallazgo detectado en informe ${codigoInforme}. Respuesta negativa en: "${preguntaMap.get(r.pregunta_id) ?? r.pregunta_id}"`,
                prioridad: 'MEDIA',
                estado: 'PENDIENTE',
                pregunta_ref: { informe_id: input.informeId, pregunta_id: r.pregunta_id },
                informe_bubble_id: input.informeId,
                is_active: true,
                created_by: user.id,
            }))

            await adminClient.from('planes_accion').insert(planesInsert)
        }
    } catch (e) {
        // No bloquear el envío si falla la creación de planes
        console.warn('[enviarInforme] auto-planes error:', e)
    }

    safeRevalidatePath('/informes')
    safeRevalidatePath(`/informes/${input.informeId}`)
    safeRevalidatePath('/planes-accion')
    return { success: true, codigo: post?.codigo_informe ?? null }
}

// ─────────────────────────────────────────────────────────────
// Listado de informes
// ─────────────────────────────────────────────────────────────
export type InformeListItem = {
    id: string
    codigo_informe: string | null
    estado: string
    created_at: string
    enviado_at: string | null
    formato_codigo: string
    formato_nombre: string
    version_etiqueta: string | null
    cliente_nombre: string | null
    tarea_codigo: string | null
    firmante_nombre: string | null
    pdf_url: string | null
}

export async function getInformes(filtros?: {
    estado?: string
    formato_id?: string
    tarea_id?: string
    q?: string
}): Promise<InformeListItem[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    let query = adminClient
        .from('formatos_informes')
        .select(`
            id, codigo_informe, estado, created_at, enviado_at, pdf_url,
            version:formatos_versiones(
                etiqueta_version,
                formato:formatos!formatos_versiones_formato_id_fkey(codigo, nombre, id)
            ),
            cliente:terceros!formatos_informes_cliente_id_fkey(razon_social),
            tarea:tareas(codigo),
            firmante:profiles!formatos_informes_firmante_profile_id_fkey(first_name, last_name)
        `)
        .eq('tenant_id', tenantId)
        .neq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(500)

    if (filtros?.estado) query = query.eq('estado', filtros.estado)
    if (filtros?.tarea_id) query = query.eq('tarea_id', filtros.tarea_id)

    const { data, error } = await query
    if (error) {
        console.error('getInformes error:', error, JSON.stringify(error, null, 2))
        return []
    }

    let rows: InformeListItem[] = (data ?? []).map(r => {
        const v: any = r.version
        const formato = v?.formato
        const cli: any = r.cliente
        const tar: any = r.tarea
        const firm: any = r.firmante
        return {
            id: r.id,
            codigo_informe: r.codigo_informe,
            estado: r.estado,
            created_at: r.created_at,
            enviado_at: r.enviado_at,
            formato_codigo: formato?.codigo ?? '—',
            formato_nombre: formato?.nombre ?? '—',
            version_etiqueta: v?.etiqueta_version ?? null,
            cliente_nombre: cli?.razon_social ?? null,
            tarea_codigo: tar?.codigo ?? null,
            firmante_nombre: firm
                ? `${firm.first_name ?? ''} ${firm.last_name ?? ''}`.trim() || null
                : null,
            pdf_url: r.pdf_url,
        }
    })

    if (filtros?.formato_id) {
        const { data: formato } = await adminClient
            .from('formatos')
            .select('codigo')
            .eq('id', filtros.formato_id)
            .single()
        if (formato) rows = rows.filter(r => r.formato_codigo === formato.codigo)
    }

    if (filtros?.q) {
        const q = filtros.q.toLowerCase()
        rows = rows.filter(
            r =>
                (r.codigo_informe ?? '').toLowerCase().includes(q) ||
                r.formato_codigo.toLowerCase().includes(q) ||
                (r.cliente_nombre ?? '').toLowerCase().includes(q) ||
                (r.tarea_codigo ?? '').toLowerCase().includes(q)
        )
    }

    return rows
}

// ─────────────────────────────────────────────────────────────
// Aprobar / rechazar informe
// ─────────────────────────────────────────────────────────────
export async function aprobarInforme(informeId: string): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    const nowIso = new Date().toISOString()
    const { error } = await adminClient
        .from('formatos_informes')
        .update({
            estado: 'APROBADO',
            aprobado_at: nowIso,
            aprobado_por: user.id,
            updated_at: nowIso,
            updated_by: user.id,
        })
        .eq('tenant_id', tenantId)
        .eq('id', informeId)
        .in('estado', ['ENVIADO', 'CON_COMENTARIOS', 'RECHAZADO'])
    if (error) return { success: false, error: error.message }

    safeRevalidatePath('/informes')
    safeRevalidatePath(`/informes/${informeId}`)
    return { success: true }
}

export async function rechazarInforme(
    informeId: string,
    razon: string
): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    if (!razon.trim()) return { success: false, error: 'La razón del rechazo es requerida' }

    const nowIso = new Date().toISOString()
    const { error } = await adminClient
        .from('formatos_informes')
        .update({
            estado: 'RECHAZADO',
            rechazado_at: nowIso,
            rechazado_por: user.id,
            razon_rechazo: razon.trim(),
            updated_at: nowIso,
            updated_by: user.id,
        })
        .eq('tenant_id', tenantId)
        .eq('id', informeId)
    if (error) return { success: false, error: error.message }

    safeRevalidatePath('/informes')
    safeRevalidatePath(`/informes/${informeId}`)
    return { success: true }
}

export async function agregarComentarioInforme(
    informeId: string,
    texto: string,
    autor_tipo: 'INTERNO' | 'CLIENTE' = 'INTERNO',
    pregunta_id?: string | null
): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    if (!texto.trim()) return { success: false, error: 'El comentario no puede estar vacío' }

    const { error } = await adminClient
        .from('formatos_informes_comentarios')
        .insert({
            tenant_id: tenantId,
            informe_id: informeId,
            autor_profile_id: user.id,
            autor_tipo,
            texto: texto.trim(),
            pregunta_id: pregunta_id ?? null,
        })
    if (error) return { success: false, error: error.message }

    // Marcar informe como CON_COMENTARIOS si está APROBADO o ENVIADO
    await adminClient
        .from('formatos_informes')
        .update({ estado: 'CON_COMENTARIOS', updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('tenant_id', tenantId)
        .eq('id', informeId)
        .in('estado', ['ENVIADO', 'APROBADO'])

    safeRevalidatePath(`/informes/${informeId}`)
    return { success: true }
}

export async function getComentariosInforme(informeId: string) {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId) return []

    const { data, error } = await adminClient
        .from('formatos_informes_comentarios')
        .select(`
            id, autor_tipo, texto, pregunta_id, created_at,
            autor:profiles(id, first_name, last_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('informe_id', informeId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
    if (error) {
        console.error('getComentariosInforme error:', error, JSON.stringify(error, null, 2))
        return []
    }
    return data ?? []
}

// ─────────────────────────────────────────────────────────────
// Buscar tareas por código (para selector en NuevoInformeForm)
// ─────────────────────────────────────────────────────────────
export type TareaResumen = {
    id: string
    codigo: string | null
    titulo: string
    fecha_inicio: string | null
    fecha_fin: string | null
    cliente: { id: string; razon_social: string | null } | null
    sitio: { id: string; nombre: string | null } | null
}

export async function searchTareasPorCodigo(q: string): Promise<TareaResumen[]> {
    const { adminClient, tenantId } = await getSupabaseContext()
    if (!adminClient || !tenantId || !q.trim()) return []

    const { data, error } = await adminClient
        .from('tareas')
        .select(`
            id, codigo, titulo,
            cliente:terceros!tareas_cliente_id_fkey(id, razon_social),
            sitio:terceros_sitios!tareas_sitio_id_fkey(id, nombre),
            fechas:tareas_fechas(fecha_inicio, fecha_fin)
        `)
        .eq('tenant_id', tenantId)
        .neq('is_active', false)
        .or(`codigo.ilike.%${q.trim()}%,titulo.ilike.%${q.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('searchTareasPorCodigo error:', error)
        return []
    }

    return (data ?? []).map(r => {
        const fechas = (r.fechas as any[]) ?? []
        const fechaInicio = fechas.length > 0
            ? fechas.reduce((min: string | null, f: any) => (!min || f.fecha_inicio < min) ? f.fecha_inicio : min, null)
            : null
        const fechaFin = fechas.length > 0
            ? fechas.reduce((max: string | null, f: any) => (!max || f.fecha_fin > max) ? f.fecha_fin : max, null)
            : null
        return {
            id: r.id,
            codigo: r.codigo,
            titulo: r.titulo,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            cliente: Array.isArray(r.cliente) ? (r.cliente[0] ?? null) : (r.cliente as any),
            sitio: Array.isArray(r.sitio) ? (r.sitio[0] ?? null) : (r.sitio as any),
        }
    })
}

// ─────────────────────────────────────────────────────────────
// Reabrir informe rechazado como borrador (para re-editar)
// ─────────────────────────────────────────────────────────────
export async function reabrirInforme(
    informeId: string
): Promise<{ success: true } | { success: false; error: string }> {
    const { adminClient, tenantId, user } = await getSupabaseContext()
    if (!adminClient || !tenantId || !user) return { success: false, error: 'No autenticado' }

    const { data: informe } = await adminClient
        .from('formatos_informes')
        .select('id, estado')
        .eq('id', informeId)
        .eq('tenant_id', tenantId)
        .single()

    if (!informe) return { success: false, error: 'Informe no encontrado' }
    if (informe.estado !== 'RECHAZADO') {
        return { success: false, error: 'Solo se pueden reabrir informes rechazados' }
    }

    const { error } = await adminClient
        .from('formatos_informes')
        .update({
            estado: 'BORRADOR',
            rechazado_at: null,
            rechazado_por: null,
            razon_rechazo: null,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        })
        .eq('id', informeId)

    if (error) return { success: false, error: error.message }

    safeRevalidatePath(`/informes/${informeId}`)
    safeRevalidatePath('/informes')
    return { success: true }
}
