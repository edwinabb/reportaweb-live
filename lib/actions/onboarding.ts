'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// ── Auth helpers ──────────────────────────────────────────────────

async function assertSystemAdmin() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'reporta_admin') redirect('/planificacion')
    return { user, supabase }
}

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )
}

// ── Storage helpers ───────────────────────────────────────────────

function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 60)
}

function extFromContentType(ct: string): string {
    if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg'
    if (ct.includes('png')) return 'png'
    if (ct.includes('gif')) return 'gif'
    if (ct.includes('webp')) return 'webp'
    if (ct.includes('pdf')) return 'pdf'
    if (ct.includes('msword') || ct.includes('docx')) return 'docx'
    return 'bin'
}

/**
 * Descarga un archivo desde sourceUrl y lo sube a Supabase Storage.
 * Retorna la URL pública del nuevo archivo, o null si falla.
 */
async function downloadAndUpload(
    sourceUrl: string | undefined,
    bucket: string,
    storagePath: string,
    admin: ReturnType<typeof getAdminClient>
): Promise<string | null> {
    if (!sourceUrl?.startsWith('http')) return null
    try {
        const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) })
        if (!res.ok) return null
        const buffer = await res.arrayBuffer()
        const contentType = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0]
        const ext = extFromContentType(contentType)
        const fullPath = `${storagePath}.${ext}`
        const { error } = await admin.storage.from(bucket).upload(fullPath, buffer, { contentType, upsert: true })
        if (error) return null
        return admin.storage.from(bucket).getPublicUrl(fullPath).data.publicUrl
    } catch {
        return null
    }
}

/**
 * Igual que downloadAndUpload pero retorna solo el path relativo al bucket
 * (para buckets privados donde se generan URLs firmadas en runtime).
 */
async function downloadAndUploadPrivate(
    sourceUrl: string | undefined,
    bucket: string,
    storagePath: string,
    admin: ReturnType<typeof getAdminClient>
): Promise<{ path: string; contentType: string; size: number } | null> {
    if (!sourceUrl?.startsWith('http')) return null
    try {
        const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(20_000) })
        if (!res.ok) return null
        const buffer = await res.arrayBuffer()
        const contentType = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0]
        const ext = extFromContentType(contentType)
        const fullPath = `${storagePath}.${ext}`
        const { error } = await admin.storage.from(bucket).upload(fullPath, buffer, { contentType, upsert: true })
        if (error) return null
        return { path: fullPath, contentType, size: buffer.byteLength }
    } catch {
        return null
    }
}

// ── Types ─────────────────────────────────────────────────────────

export type DocPersonalRow = {
    email: string           // clave para vincular al perfil
    tipo_doc: string        // nombre del tipo (debe existir en document_types)
    fecha_desde?: string    // valid_from YYYY-MM-DD
    fecha_hasta?: string    // valid_until YYYY-MM-DD
    archivo_url?: string    // URL pública para descargar y subir
}

export type DocMaquinariaRow = {
    placa: string           // clave para vincular a la maquinaria
    tipo_doc: string        // nombre del tipo (debe existir en maquinaria_tipos_docs)
    numero_doc?: string
    fecha_emision?: string  // YYYY-MM-DD
    fecha_vencimiento?: string // YYYY-MM-DD
    archivo_url?: string    // URL pública para descargar y subir
}

export type UsuarioRow = {
    nombre: string
    apellido: string
    email: string
    cargo: string
    tipo_doc: string
    num_doc: string
    rol: string
    telefono?: string
    foto_url?: string           // URL de retrato → sube a bucket usuarios
    documentos?: DocPersonalRow[]
}

export type ContactoRow = {
    nombre_completo: string
    cargo?: string
    area?: string
    telefono?: string
    email?: string
}

export type SitioRow = {
    nombre: string
    codigo?: string
    direccion?: string
    ciudad?: string
}

export type TerceroRow = {
    razon_social: string
    ruc?: string
    tipo?: string
    rubro?: string
    email?: string
    telefono?: string
    direccion?: string
    logo_url?: string           // URL de logo → sube a bucket logos
    contactos?: ContactoRow[]
    sitios?: SitioRow[]
}

export type MaquinariaRow = {
    nombre: string
    placa?: string
    marca?: string
    modelo?: string
    tipo_equipo?: string
    capacidad?: string
    estado?: string
    foto_url?: string           // URL de foto → sube a bucket maquinarias
    documentos?: DocMaquinariaRow[]
}

export type ServicioRow = {
    codigo?: string
    nombre: string
    tipo_servicio?: string
    moneda?: string
    toneladas?: string
    precio_1_tipo?: string
    precio_1_valor?: number
    precio_2_tipo?: string
    precio_2_valor?: number
    imagen_url?: string         // URL de imagen referencia → sube a bucket logos/servicios
}

export type OnboardingStatus = {
    step1Done: boolean
    step2Done: boolean
    step3Done: boolean
    step4Done: boolean
    step5Done: boolean
    step6Done: boolean
    configDone: boolean
}

// ── createCompany ─────────────────────────────────────────────────

export async function createCompany(formData: FormData): Promise<{ success: boolean; tenantId?: string; message?: string }> {
    await assertSystemAdmin()
    const admin = getAdminClient()

    const name = (formData.get('companyName') as string)?.trim()
    const razon_social = (formData.get('razonSocial') as string)?.trim() || null
    const ruc = (formData.get('ruc') as string)?.trim() || null
    const email = (formData.get('companyEmail') as string)?.trim() || null
    const phone = (formData.get('companyPhone') as string)?.trim() || null
    const timezone = (formData.get('timezone') as string)?.trim() || 'America/Lima'
    const ubicacion_ciudad = (formData.get('ciudad') as string)?.trim() || null
    const ubicacion_pais = (formData.get('pais') as string)?.trim() || null
    const direccion = (formData.get('direccion') as string)?.trim() || null

    if (!name) return { success: false, message: 'El nombre de la empresa es obligatorio.' }

    let existingId: string | null = null
    if (ruc) {
        const { data } = await admin.from('companies').select('id').eq('ruc', ruc).maybeSingle()
        existingId = data?.id ?? null
    }
    if (!existingId) {
        const { data } = await admin.from('companies').select('id').eq('name', name).maybeSingle()
        existingId = data?.id ?? null
    }

    if (existingId) {
        const { error } = await admin.from('companies').update({
            name, razon_social, ruc, email, phone, timezone, ubicacion_ciudad, ubicacion_pais, direccion,
        }).eq('id', existingId)
        if (error) return { success: false, message: `Error actualizando empresa: ${error.message}` }
        return { success: true, tenantId: existingId }
    }

    const { data, error } = await admin.from('companies').insert({
        name, razon_social, ruc, email, phone, timezone, ubicacion_ciudad, ubicacion_pais, direccion, is_active: true,
    }).select('id').single()

    if (error) return { success: false, message: `Error creando empresa: ${error.message}` }
    return { success: true, tenantId: data.id }
}

// ── createTenantAdminUser ─────────────────────────────────────────

export async function createTenantAdminUser(
    tenantId: string,
    formData: FormData
): Promise<{ success: boolean; userId?: string; message?: string }> {
    await assertSystemAdmin()
    const admin = getAdminClient()

    const email = (formData.get('adminEmail') as string)?.trim()
    const password = (formData.get('adminPassword') as string)?.trim()
    const firstName = (formData.get('adminNombre') as string)?.trim()
    const lastName = (formData.get('adminApellido') as string)?.trim()
    const docType = (formData.get('adminTipoDoc') as string)?.trim() || 'DNI'
    const docNumber = (formData.get('adminNumDoc') as string)?.trim()

    if (!email || !password || !firstName || !lastName || !docNumber) {
        return { success: false, message: 'Todos los campos del administrador son obligatorios.' }
    }

    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = listData?.users?.find(u => u.email === email)

    if (existing) {
        const { data: existingProfile } = await admin.from('profiles').select('id, tenant_id').eq('id', existing.id).maybeSingle()
        if (existingProfile?.tenant_id === tenantId) return { success: true, userId: existing.id }
        return { success: false, message: `El email ${email} ya está registrado en otro tenant.` }
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
    })
    if (authError) return { success: false, message: `Error de autenticación: ${authError.message}` }
    const userId = authData.user!.id

    const { error: profileError } = await admin.from('profiles').insert({
        id: userId, email, first_name: firstName, last_name: lastName,
        role: 'admin_tenant', doc_number: docNumber, tenant_id: tenantId,
    })
    if (profileError) {
        await admin.auth.admin.deleteUser(userId)
        return { success: false, message: `Error creando perfil: ${profileError.message}` }
    }

    await admin.from('profile_details').insert({
        id: userId, tenant_id: tenantId,
        doc_type: docType as 'DNI' | 'CE' | 'PASSPORT' | 'RUC' | 'OTHER',
        pin: null,
    })

    return { success: true, userId }
}

// ── importUsuarios ────────────────────────────────────────────────

function generatePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let pw = ''
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    return pw
}

export async function importUsuarios(
    tenantId: string,
    rows: UsuarioRow[]
): Promise<{ success: boolean; imported: number; skipped: number; docsImported: number; errors: string[]; passwords: { email: string; password: string }[] }> {
    await assertSystemAdmin()
    const admin = getAdminClient()
    const errors: string[] = []
    const passwords: { email: string; password: string }[] = []
    let imported = 0
    let skipped = 0
    let docsImported = 0

    // 1. Upsert job_titles únicos + cargo_permisos
    const uniqueCargos = [...new Set(rows.map(r => r.cargo?.trim()).filter(Boolean))]
    const jobTitleMap: Record<string, string> = {}
    for (const cargo of uniqueCargos) {
        const { data: existing } = await admin.from('job_titles').select('id').eq('name', cargo).eq('tenant_id', tenantId).maybeSingle()
        if (existing) {
            jobTitleMap[cargo] = existing.id
        } else {
            const { data: inserted } = await admin.from('job_titles').insert({ name: cargo, tenant_id: tenantId }).select('id').single()
            if (inserted) jobTitleMap[cargo] = inserted.id
        }
    }
    const { data: recursos } = await admin.from('sistema_recursos').select('id')
    if (recursos) {
        for (const jobTitleId of Object.values(jobTitleMap)) {
            const permisoRows = recursos.map(r => ({
                cargo_id: jobTitleId, recurso_id: r.id, tenant_id: tenantId,
                puede_ver: true, puede_ingresar: true, puede_editar: false, puede_eliminar: false,
            }))
            for (let i = 0; i < permisoRows.length; i += 500) {
                await admin.from('cargo_permisos').upsert(permisoRows.slice(i, i + 500), {
                    onConflict: 'cargo_id,recurso_id', ignoreDuplicates: true,
                })
            }
        }
    }

    // 2. Mapa de tipos de documentos de personal
    const { data: docTypes } = await admin.from('document_types').select('id, name').eq('tenant_id', tenantId)
    const docTypeMap: Record<string, string> = {}
    for (const dt of docTypes ?? []) docTypeMap[dt.name.toLowerCase()] = dt.id

    // 3. Fetch existing auth users
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existingEmails = new Set((listData?.users ?? []).map(u => u.email))

    // 4. Crear cada usuario
    for (const row of rows) {
        const email = row.email?.trim()
        if (!email) { errors.push('Fila sin email'); skipped++; continue }
        if (existingEmails.has(email)) { errors.push(`${email}: ya existe`); skipped++; continue }

        const password = generatePassword()
        const firstName = row.nombre?.trim() || ''
        const lastName = row.apellido?.trim() || ''
        const validRoles = ['admin_tenant', 'supervisor', 'planner', 'member', 'viewer']
        const role = (validRoles.includes(row.rol) ? row.rol : 'member') as 'admin_tenant' | 'supervisor' | 'planner' | 'member' | 'viewer'

        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { first_name: firstName, last_name: lastName },
        })
        if (authError) { errors.push(`${email}: ${authError.message}`); skipped++; continue }
        const userId = authData.user!.id

        const { error: profileError } = await admin.from('profiles').insert({
            id: userId, email, first_name: firstName, last_name: lastName,
            role, doc_number: row.num_doc?.trim() || '', tenant_id: tenantId,
            phone: row.telefono?.trim() || null,
        })
        if (profileError) {
            await admin.auth.admin.deleteUser(userId)
            errors.push(`${email}: ${profileError.message}`)
            skipped++
            continue
        }

        // 5. Subir foto (retrato) si viene URL
        let photoUrl: string | null = null
        if (row.foto_url) {
            photoUrl = await downloadAndUpload(
                row.foto_url,
                'usuarios',
                `${tenantId}/${slugify(email)}`,
                admin
            )
        }

        await admin.from('profile_details').insert({
            id: userId, tenant_id: tenantId,
            doc_type: (['DNI', 'CE', 'PASSPORT'].includes(row.tipo_doc) ? row.tipo_doc : 'DNI') as 'DNI' | 'CE' | 'PASSPORT',
            doc_number: row.num_doc?.trim() || '',
            job_title_id: jobTitleMap[row.cargo?.trim()] || null,
            photo_url: photoUrl,
            pin: null,
        })

        // 6. Documentos del personal
        const ts = Date.now()
        for (const doc of row.documentos ?? []) {
            const tipoId = docTypeMap[doc.tipo_doc?.toLowerCase()]
            if (!tipoId) {
                errors.push(`${email} — tipo_doc "${doc.tipo_doc}" no encontrado`)
                continue
            }
            let filePath: string | null = null
            let fileSize: number | null = null
            let contentType = 'application/octet-stream'

            if (doc.archivo_url) {
                const uploaded = await downloadAndUploadPrivate(
                    doc.archivo_url,
                    'doc_usuarios',
                    `${tenantId}/${userId}/${slugify(doc.tipo_doc)}_${ts}`,
                    admin
                )
                if (uploaded) {
                    filePath = uploaded.path
                    fileSize = uploaded.size
                    contentType = uploaded.contentType
                }
            }

            const fileName = filePath ? filePath.split('/').pop()! : `${slugify(doc.tipo_doc)}_${ts}`
            const { error: docErr } = await admin.from('user_documents').insert({
                tenant_id: tenantId,
                user_id: userId,
                document_type_id: tipoId,
                file_path: filePath ?? '',
                file_name: fileName,
                file_size: fileSize,
                content_type: contentType,
                valid_from: doc.fecha_desde || null,
                valid_until: doc.fecha_hasta || null,
                is_active: true,
            })
            if (docErr) errors.push(`${email} doc "${doc.tipo_doc}": ${docErr.message}`)
            else docsImported++
        }

        passwords.push({ email, password })
        existingEmails.add(email)
        imported++
    }

    return { success: true, imported, skipped, docsImported, errors, passwords }
}

// ── importTerceros ────────────────────────────────────────────────

export async function importTerceros(
    tenantId: string,
    rows: TerceroRow[]
): Promise<{ success: boolean; imported: number; contactosImported: number; sitiosImported: number; errors: string[] }> {
    await assertSystemAdmin()
    const admin = getAdminClient()
    const errors: string[] = []

    // 1. Upsert rubros únicos
    const uniqueRubros = [...new Set(rows.map(r => r.rubro?.trim()).filter((v): v is string => Boolean(v)))]
    const rubroMap: Record<string, string> = {}
    for (const rubro of uniqueRubros) {
        const { data: existing } = await admin.from('rubros').select('id').eq('nombre', rubro).eq('tenant_id', tenantId).maybeSingle()
        if (existing) {
            rubroMap[rubro] = existing.id
        } else {
            const { data: inserted } = await admin.from('rubros').insert({ nombre: rubro, tenant_id: tenantId }).select('id').single()
            if (inserted) rubroMap[rubro] = inserted.id
        }
    }

    // 2. Upsert terceros en lotes (sin logo_url aún)
    const toInsert = rows.map(r => ({
        razon_social: r.razon_social?.trim() || 'Sin nombre',
        ruc: r.ruc?.trim() || null,
        tipo: r.tipo?.trim() || 'cliente',
        rubro_id: (r.rubro && rubroMap[r.rubro.trim()]) || null,
        email: r.email?.trim() || null,
        telefono: r.telefono?.trim() || null,
        direccion: r.direccion?.trim() || null,
        tenant_id: tenantId,
        is_active: true,
    }))

    let imported = 0
    for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500)
        const { error } = await admin.from('terceros').upsert(chunk, {
            onConflict: 'ruc,tenant_id',
            ignoreDuplicates: false,
        })
        if (error) errors.push(`Chunk ${i / 500 + 1}: ${error.message}`)
        else imported += chunk.length
    }

    // 3. Recuperar IDs por RUC para logos + subtablas
    const rucs = rows.map(r => r.ruc?.trim()).filter((v): v is string => Boolean(v))
    const idByRuc: Record<string, string> = {}

    if (rucs.length > 0) {
        const { data: terceroRecords } = await admin
            .from('terceros').select('id, ruc').eq('tenant_id', tenantId).in('ruc', rucs)
        for (const t of terceroRecords ?? []) {
            if (t.ruc) idByRuc[t.ruc] = t.id
        }
    }

    // 4. Subir logos y actualizar registro
    for (const row of rows) {
        if (!row.logo_url || !row.ruc) continue
        const terceroId = idByRuc[row.ruc.trim()]
        if (!terceroId) continue
        const logoUrl = await downloadAndUpload(
            row.logo_url,
            'logos',
            `${tenantId}/${slugify(row.ruc)}`,
            admin
        )
        if (logoUrl) {
            await admin.from('terceros').update({ logo_url: logoUrl }).eq('id', terceroId)
        }
    }

    // 5. Insertar contactos y sitios con FK
    let contactosImported = 0
    let sitiosImported = 0
    const rowsConSubtablas = rows.filter(r => (r.contactos?.length ?? 0) + (r.sitios?.length ?? 0) > 0)

    const allContactos: object[] = []
    const allSitios: object[] = []

    for (const row of rowsConSubtablas) {
        const terceroId = row.ruc ? idByRuc[row.ruc.trim()] : null
        if (!terceroId) {
            if ((row.contactos?.length ?? 0) + (row.sitios?.length ?? 0) > 0) {
                errors.push(`RUC ${row.ruc} no encontrado — contactos/sitios omitidos`)
            }
            continue
        }
        for (const c of row.contactos ?? []) {
            if (!c.nombre_completo?.trim()) continue
            allContactos.push({
                tercero_id: terceroId, tenant_id: tenantId,
                nombre_completo: c.nombre_completo.trim(),
                cargo: c.cargo?.trim() || null,
                area: c.area?.trim() || null,
                telefono: c.telefono?.trim() || null,
                email: c.email?.trim() || null,
                is_active: true,
            })
        }
        for (const s of row.sitios ?? []) {
            if (!s.nombre?.trim()) continue
            allSitios.push({
                tercero_id: terceroId, tenant_id: tenantId,
                nombre: s.nombre.trim(),
                codigo: s.codigo?.trim() || null,
                direccion: s.direccion?.trim() || null,
                ciudad: s.ciudad?.trim() || null,
                is_active: true,
            })
        }
    }

    for (let i = 0; i < allContactos.length; i += 500) {
        const { error } = await admin.from('terceros_contactos').insert(allContactos.slice(i, i + 500))
        if (error) errors.push(`Contactos: ${error.message}`)
        else contactosImported += allContactos.slice(i, i + 500).length
    }
    for (let i = 0; i < allSitios.length; i += 500) {
        const { error } = await admin.from('terceros_sitios').insert(allSitios.slice(i, i + 500))
        if (error) errors.push(`Sitios: ${error.message}`)
        else sitiosImported += allSitios.slice(i, i + 500).length
    }

    return { success: errors.length === 0, imported, contactosImported, sitiosImported, errors }
}

// ── importMaquinaria ──────────────────────────────────────────────

export async function importMaquinaria(
    tenantId: string,
    rows: MaquinariaRow[]
): Promise<{ success: boolean; imported: number; docsImported: number; errors: string[] }> {
    await assertSystemAdmin()
    const admin = getAdminClient()
    const errors: string[] = []
    let docsImported = 0

    // 1. Upsert maquinaria_modelos únicos
    type ModeloKey = { marca: string; modelo: string; tipo_equipo: string }
    const modeloKeys: ModeloKey[] = []
    const seen = new Set<string>()
    for (const r of rows) {
        const key = `${r.marca || ''}|${r.modelo || ''}|${r.tipo_equipo || ''}`
        if (!seen.has(key) && (r.marca || r.modelo || r.tipo_equipo)) {
            seen.add(key)
            modeloKeys.push({ marca: r.marca || '', modelo: r.modelo || '', tipo_equipo: r.tipo_equipo || '' })
        }
    }
    for (const mk of modeloKeys) {
        await admin.from('maquinaria_modelos').upsert({
            marca: mk.marca, modelo: mk.modelo, tipo_equipo: mk.tipo_equipo, tenant_id: tenantId,
        }, { onConflict: 'marca,modelo,tipo_equipo,tenant_id', ignoreDuplicates: true })
    }

    // 2. Recuperar modelo_ids
    const modeloMap: Record<string, string> = {}
    if (modeloKeys.length > 0) {
        const { data: modeloRecords } = await admin
            .from('maquinaria_modelos').select('id, marca, modelo, tipo_equipo')
            .eq('tenant_id', tenantId)
            .in('marca', modeloKeys.map(m => m.marca))
        for (const m of modeloRecords ?? []) {
            modeloMap[`${m.marca}|${m.modelo}|${m.tipo_equipo}`] = m.id
        }
    }

    // 3. Upsert maquinarias con modelo_id FK
    const toInsert = rows.map(r => {
        const modeloKey = `${r.marca || ''}|${r.modelo || ''}|${r.tipo_equipo || ''}`
        return {
            nombre: r.nombre?.trim() || 'Sin nombre',
            placa: r.placa?.trim() || null,
            marca: r.marca?.trim() || null,
            modelo: r.modelo?.trim() || null,
            categoria: r.tipo_equipo?.trim() || null,
            capacidad: r.capacidad?.trim() || null,
            estado: (['operativo', 'mantenimiento', 'inactivo'].includes(r.estado || '') ? r.estado : 'operativo') as 'operativo' | 'mantenimiento' | 'inactivo',
            modelo_id: modeloMap[modeloKey] || null,
            tenant_id: tenantId,
            is_active: true,
        }
    })

    let imported = 0
    for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500)
        const { error } = await admin.from('maquinarias').upsert(chunk, {
            onConflict: 'nombre,tenant_id', ignoreDuplicates: false,
        })
        if (error) errors.push(`Chunk ${i / 500 + 1}: ${error.message}`)
        else imported += chunk.length
    }

    // 4. Recuperar IDs de maquinarias por placa/nombre para foto y docs
    const placas = rows.map(r => r.placa?.trim()).filter((v): v is string => Boolean(v))
    const nombres = rows.map(r => r.nombre?.trim()).filter(Boolean)
    const idByPlaca: Record<string, string> = {}
    const idByNombre: Record<string, string> = {}

    if (placas.length > 0) {
        const { data } = await admin.from('maquinarias').select('id, placa, nombre').eq('tenant_id', tenantId).in('placa', placas)
        for (const m of data ?? []) {
            if (m.placa) idByPlaca[m.placa] = m.id
            if (m.nombre) idByNombre[m.nombre] = m.id
        }
    } else if (nombres.length > 0) {
        const { data } = await admin.from('maquinarias').select('id, nombre').eq('tenant_id', tenantId).in('nombre', nombres)
        for (const m of data ?? []) if (m.nombre) idByNombre[m.nombre] = m.id
    }

    // 5. Mapa de tipos de documentos de maquinaria
    const { data: tiposDocs } = await admin.from('maquinaria_tipos_docs').select('id, nombre').eq('tenant_id', tenantId)
    const tipoDocMap: Record<string, string> = {}
    for (const td of tiposDocs ?? []) tipoDocMap[td.nombre.toLowerCase()] = td.id

    // 6. Foto y documentos por equipo
    const ts = Date.now()
    for (const row of rows) {
        const maquinariaId = (row.placa && idByPlaca[row.placa.trim()]) || idByNombre[row.nombre.trim()]
        if (!maquinariaId) continue

        // Subir foto
        if (row.foto_url) {
            const fotoUrl = await downloadAndUpload(
                row.foto_url,
                'maquinarias',
                `${tenantId}/${slugify(row.placa || row.nombre)}`,
                admin
            )
            if (fotoUrl) await admin.from('maquinarias').update({ foto_url: fotoUrl }).eq('id', maquinariaId)
        }

        // Documentos
        for (const doc of row.documentos ?? []) {
            const tipoId = tipoDocMap[doc.tipo_doc?.toLowerCase()]
            if (!tipoId) {
                errors.push(`${row.placa || row.nombre} — tipo_doc "${doc.tipo_doc}" no encontrado`)
                continue
            }
            let archivoUrl: string | null = null
            if (doc.archivo_url) {
                archivoUrl = await downloadAndUpload(
                    doc.archivo_url,
                    'doc_maquinarias',
                    `${tenantId}/${maquinariaId}/${slugify(doc.tipo_doc)}_${ts}`,
                    admin
                )
            }
            const { error: docErr } = await admin.from('maquinaria_documentos').insert({
                tenant_id: tenantId,
                maquinaria_id: maquinariaId,
                tipo_doc_id: tipoId,
                numero_doc: doc.numero_doc?.trim() || null,
                fecha_emision: doc.fecha_emision || null,
                fecha_vencimiento: doc.fecha_vencimiento || null,
                archivo_url: archivoUrl,
                is_active: true,
            })
            if (docErr) errors.push(`${row.placa || row.nombre} doc "${doc.tipo_doc}": ${docErr.message}`)
            else docsImported++
        }
    }

    return { success: errors.length === 0, imported, docsImported, errors }
}

// ── importServicios ───────────────────────────────────────────────

export async function importServicios(
    tenantId: string,
    rows: ServicioRow[]
): Promise<{ success: boolean; imported: number; errors: string[] }> {
    await assertSystemAdmin()
    const admin = getAdminClient()
    const errors: string[] = []

    // 1. Upsert servicios_tipo_precios
    const uniqueTipoPrecios = [...new Set([
        ...rows.map(r => r.precio_1_tipo?.trim()),
        ...rows.map(r => r.precio_2_tipo?.trim()),
    ].filter(Boolean))] as string[]
    for (const tp of uniqueTipoPrecios) {
        await admin.from('servicios_tipo_precios').upsert(
            { nombre: tp, tenant_id: tenantId },
            { onConflict: 'nombre,tenant_id', ignoreDuplicates: true }
        )
    }

    // 2. Upsert servicios_tipo
    const uniqueTipoServicio = [...new Set(rows.map(r => r.tipo_servicio?.trim()).filter(Boolean))] as string[]
    for (const ts of uniqueTipoServicio) {
        await admin.from('servicios_tipo').upsert(
            { nombre: ts, tenant_id: tenantId },
            { onConflict: 'nombre,tenant_id', ignoreDuplicates: true }
        )
    }

    // 3. Upsert servicios (sin imagen_url aún)
    let idx = 0
    const toInsert = rows.map(r => {
        idx++
        const codigo = r.codigo?.trim() || `SVC-${String(idx).padStart(4, '0')}`
        return {
            codigo,
            nombre: r.nombre?.trim() || codigo,
            tipo_servicio: r.tipo_servicio?.trim() || null,
            moneda: (['PEN', 'USD'].includes(r.moneda || '') ? r.moneda : 'PEN'),
            toneladas: r.toneladas?.trim() || null,
            precio_1_tipo: r.precio_1_tipo?.trim() || null,
            precio_1_valor: r.precio_1_valor ?? null,
            precio_2_tipo: r.precio_2_tipo?.trim() || null,
            precio_2_valor: r.precio_2_valor ?? null,
            tenant_id: tenantId,
            is_active: true,
        }
    })

    let imported = 0
    for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500)
        const { error } = await admin.from('servicios').upsert(chunk, {
            onConflict: 'codigo,tenant_id', ignoreDuplicates: false,
        })
        if (error) errors.push(`Chunk ${i / 500 + 1}: ${error.message}`)
        else imported += chunk.length
    }

    // 4. Subir imágenes de referencia y actualizar
    const rowsConImagen = rows.filter(r => r.imagen_url && r.codigo)
    if (rowsConImagen.length > 0) {
        const codigos = rowsConImagen.map(r => r.codigo!.trim())
        const { data: servicioRecords } = await admin
            .from('servicios').select('id, codigo').eq('tenant_id', tenantId).in('codigo', codigos)
        const idByCodigo: Record<string, string> = {}
        for (const s of servicioRecords ?? []) if (s.codigo) idByCodigo[s.codigo] = s.id

        for (const row of rowsConImagen) {
            const servicioId = idByCodigo[row.codigo!.trim()]
            if (!servicioId) continue
            const imagenUrl = await downloadAndUpload(
                row.imagen_url,
                'logos',
                `${tenantId}/servicios/${slugify(row.codigo!)}`,
                admin
            )
            if (imagenUrl) await admin.from('servicios').update({ imagen_url: imagenUrl }).eq('id', servicioId)
        }
    }

    return { success: errors.length === 0, imported, errors }
}

// ── setupTenantConfig ─────────────────────────────────────────────

export async function setupTenantConfig(tenantId: string): Promise<{ success: boolean; message?: string }> {
    await assertSystemAdmin()
    const admin = getAdminClient()

    const ops = await Promise.all([
        admin.from('config_checklist').upsert({
            tenant_id: tenantId, mostrar_cliente: true, mostrar_empresa: true,
            mostrar_tarea: true, mostrar_observaciones: true,
        }, { onConflict: 'tenant_id' }),

        admin.from('config_informe_personal').upsert({
            tenant_id: tenantId, cantidad_turnos: 1, codigo_formato: 'INF-P',
            fecha_formato: 'dd/MM/yyyy', version_formato: 'v2',
            incluye_firma_trabajador: true, incluye_foto_trabajo: false,
            incluye_gastos: false, incluye_horas_extras: true,
            incluye_horas_dominicales: true, incluye_horas_extras_extraord: false,
            incluye_firma_cliente_horas: false,
        }, { onConflict: 'tenant_id' }),

        admin.from('config_informe_maquinaria').upsert({
            tenant_id: tenantId, cantidad_riggers: 1, cantidad_turnos: 1,
            codigo_formato: 'INF-M', fecha_formato: 'dd/MM/yyyy', version_formato: 'v2',
            incluye_firma_cliente: false, incluye_foto_trabajo: false,
            incluye_foto_reporte_escrito: false, incluye_salida_autorizada: false,
            incluye_tipo_recorrido: false, incluye_tonelaje_placa: false, incluye_guia_transporte: false,
        }, { onConflict: 'tenant_id' }),

        admin.from('config_valorizacion_compra').upsert({
            tenant_id: tenantId, codigo_formato: 'VAL-C', fecha_formato: 'dd/MM/yyyy',
            detraccion_default: 0, version_formato: 'v2',
        }, { onConflict: 'tenant_id' }),

        admin.from('config_valorizacion_venta').upsert({
            tenant_id: tenantId, codigo_formato: 'VAL-V', fecha_formato: 'dd/MM/yyyy',
            detraccion_default: 0, version_formato: 'v2',
        }, { onConflict: 'tenant_id' }),
    ])

    const firstError = ops.find(r => r.error)
    if (firstError?.error) return { success: false, message: `Error configurando tenant: ${firstError.error.message}` }
    return { success: true }
}

// ── getTenantOnboardingStatus ─────────────────────────────────────

export async function getTenantOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
    await assertSystemAdmin()
    const admin = getAdminClient()

    const [
        { count: companyCount },
        { count: jobTitleCount },
        { count: adminCount },
        { count: profileCount },
        { count: terceroCount },
        { count: maquinariaCount },
        { count: servicioCount },
        { count: configCount },
    ] = await Promise.all([
        admin.from('companies').select('*', { count: 'exact', head: true }).eq('id', tenantId),
        admin.from('job_titles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        admin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('role', 'admin_tenant'),
        admin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        admin.from('terceros').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        admin.from('maquinarias').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        admin.from('servicios').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        admin.from('config_checklist').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    ])

    return {
        step1Done: (companyCount ?? 0) > 0,
        step2Done: (jobTitleCount ?? 0) > 0 && (adminCount ?? 0) > 0,
        step3Done: ((profileCount ?? 0) - (adminCount ?? 0)) > 0,
        step4Done: (terceroCount ?? 0) > 0,
        step5Done: (maquinariaCount ?? 0) > 0,
        step6Done: (servicioCount ?? 0) > 0,
        configDone: (configCount ?? 0) > 0,
    }
}
