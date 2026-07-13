'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { todayInTZ } from '@/lib/utils/tz'
import { randomUUID } from 'crypto'

export type FleetType =
  | 'gruas'
  | 'excavadoras'
  | 'compactadoras'
  | 'mezcladoras'
  | 'mixta'

// ─── Data tables ────────────────────────────────────────────────────────────

const fleetLabel: Record<FleetType, string> = {
  gruas: 'Grúas',
  excavadoras: 'Excavadoras',
  compactadoras: 'Compactadoras',
  mezcladoras: 'Mezcladoras',
  mixta: 'Mixta',
}

const maquinariasByFleet: Record<FleetType, string[]> = {
  gruas: [
    'Grúa Grove GMK-5150L',
    'Grúa Liebherr LTM 1050-3.1',
    'Grúa Manitowoc 18000',
    'Grúa Tadano ATF 60G-4',
    'Grúa Terex AC 80-2',
  ],
  excavadoras: [
    'Excavadora CAT 320',
    'Excavadora Komatsu PC200-8',
    'Excavadora Volvo EC220E',
    'Excavadora Hitachi ZX200-6',
    'Excavadora JD 350G LC',
  ],
  compactadoras: [
    'Compactadora Dynapac CA250D',
    'Compactadora Bomag BW211D-50',
    'Rodillo HAMM HD12 VV',
    'Compactadora Sakai SV540',
    'Rodillo CAT CS64B',
  ],
  mezcladoras: [
    'Mixer Schwing Stetter S34X',
    'Mixer Putzmeister M38-5',
    'Mixer SANY SY5310GJB',
    'Mixer Liebherr HTM 1204',
    'Mixer Zoomlion 9m3',
  ],
  mixta: [
    'Grúa Grove GMK-5150L',
    'Excavadora CAT 320',
    'Compactadora Bomag BW211D',
    'Camión Volvo FMX 8x4',
    'Generador Caterpillar XQ375',
  ],
}

const codigoPrefixByFleet: Record<FleetType, string> = {
  gruas: 'GRU',
  excavadoras: 'EXC',
  compactadoras: 'COM',
  mezcladoras: 'MEZ',
  mixta: 'MIX',
}

const serviciosByFleet: Record<FleetType, string[]> = {
  gruas: [
    'Alquiler de grúa con operador',
    'Transporte de carga pesada',
    'Montaje de estructura metálica',
  ],
  excavadoras: [
    'Movimiento de tierras',
    'Alquiler de excavadora',
    'Demolición y retiro',
  ],
  compactadoras: [
    'Compactación de subrasante',
    'Alquiler de rodillo',
    'Pavimentación y compactado',
  ],
  mezcladoras: [
    'Mezcla y transporte de concreto',
    'Alquiler de mixer',
    'Bombeo de concreto',
  ],
  mixta: [
    'Servicio integral de maquinaria',
    'Alquiler de maquinaria pesada',
    'Mantenimiento de vías',
  ],
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function getTomorrow(tz = 'America/Lima'): string {
  const today = todayInTZ(tz)
  const d = new Date(today + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ─── Main function ───────────────────────────────────────────────────────────

export async function seedDemoData(params: {
  tenantId: string
  fleetType: FleetType | null
  companyName: string
  adminUserId: string
}): Promise<void> {
  const { tenantId, companyName, adminUserId } = params
  const effectiveFleet: FleetType = params.fleetType ?? 'gruas'
  const supabase = createAdminClient()
  const prefix = codigoPrefixByFleet[effectiveFleet]

  try {
  // ── 1. Maquinarias ──────────────────────────────────────────────────────
  const maquinariaNames = maquinariasByFleet[effectiveFleet]
  const maquinariasInsert = maquinariaNames.map((nombre, i) => ({
    nombre,
    codigo_interno: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    is_active: true,
    tenant_id: tenantId,
    created_by: adminUserId,
  }))

  const { data: maquinarias, error: errMaq } = await supabase
    .from('maquinarias')
    .insert(maquinariasInsert)
    .select('id')

  if (errMaq) throw new Error(`seedDemoData maquinarias: ${errMaq.message}`)

  // ── 2. Personal demo (4 profiles without Auth accounts) ────────────────
  const tenantSlice = tenantId.slice(0, 6)

  const personalData: Array<{
    id: string
    first_name: string
    last_name: string
    email: string
    role: 'supervisor' | 'member' | 'planner'
    tenant_id: string
    is_active: boolean
    created_by: string
  }> = [
    {
      id: randomUUID(),
      first_name: 'Carlos',
      last_name: 'Demo',
      email: `carlos.demo.${tenantSlice}@demo.reportar.app`,
      role: 'supervisor',
      tenant_id: tenantId,
      is_active: true,
      created_by: adminUserId,
    },
    {
      id: randomUUID(),
      first_name: 'Luis',
      last_name: 'Demo',
      email: `luis.demo.${tenantSlice}@demo.reportar.app`,
      role: 'member',
      tenant_id: tenantId,
      is_active: true,
      created_by: adminUserId,
    },
    {
      id: randomUUID(),
      first_name: 'Pedro',
      last_name: 'Demo',
      email: `pedro.demo.${tenantSlice}@demo.reportar.app`,
      role: 'member',
      tenant_id: tenantId,
      is_active: true,
      created_by: adminUserId,
    },
    {
      id: randomUUID(),
      first_name: 'Ana',
      last_name: 'Demo',
      email: `ana.demo.${tenantSlice}@demo.reportar.app`,
      role: 'planner',
      tenant_id: tenantId,
      is_active: true,
      created_by: adminUserId,
    },
  ]

  // NOTE: These profiles have no auth.users row (intentional for demo purposes).
  // Demo profiles are identified by email domain '@demo.reportar.app'.
  // Do NOT add FK from profiles.id → auth.users.id without updating this seeder.
  const { data: profiles, error: errProfiles } = await supabase
    .from('profiles')
    .insert(personalData)
    .select('id, role')

  if (errProfiles) throw new Error(`seedDemoData profiles: ${errProfiles.message}`)

  // ── 3. Terceros ─────────────────────────────────────────────────────────
  const tercerosInsert = [
    {
      razon_social: `${companyName} — Cliente Demo A`,
      tipo: 'CLIENTE',
      is_active: true,
      tenant_id: tenantId,
      created_by: adminUserId,
    },
    {
      razon_social: `${companyName} — Cliente Demo B`,
      tipo: 'CLIENTE',
      is_active: true,
      tenant_id: tenantId,
      created_by: adminUserId,
    },
  ]

  const { data: terceros, error: errTerceros } = await supabase
    .from('terceros')
    .insert(tercerosInsert)
    .select('id')

  if (errTerceros) throw new Error(`seedDemoData terceros: ${errTerceros.message}`)

  // ── 4. Servicios ────────────────────────────────────────────────────────
  const servicioNames = serviciosByFleet[effectiveFleet]
  const serviciosInsert = servicioNames.map((nombre, i) => ({
    nombre,
    codigo: `SRV-${tenantId.slice(0, 6).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
    is_active: true,
    tenant_id: tenantId,
    created_by: adminUserId,
  }))

  const { error: errServicios } = await supabase
    .from('servicios')
    .insert(serviciosInsert)

  if (errServicios) throw new Error(`seedDemoData servicios: ${errServicios.message}`)

  // ── 5. Tarea demo ───────────────────────────────────────────────────────
  const tomorrow = getTomorrow()
  const clienteId = terceros?.[0]?.id ?? null

  const { data: tareas, error: errTarea } = await supabase
    .from('tareas')
    .insert({
      titulo: `Tarea demo — ${fleetLabel[effectiveFleet]}`,
      codigo: `DEMO-${tenantId.slice(0, 6).toUpperCase()}`,
      estado: 'CONFIRMADA',
      cliente_id: clienteId,
      created_by: adminUserId,
      tenant_id: tenantId,
    })
    .select('id')

  if (errTarea) throw new Error(`seedDemoData tarea: ${errTarea.message}`)

  const tareaId = tareas?.[0]?.id
  if (!tareaId) throw new Error('seedDemoData: tarea not created')

  // Insert tarea fecha
  const { error: errFecha } = await supabase
    .from('tareas_fechas')
    .insert({
      tarea_id: tareaId,
      tenant_id: tenantId,
      fecha_inicio: tomorrow,
      fecha_fin: tomorrow,
    })

  if (errFecha) throw new Error(`seedDemoData tareas_fechas: ${errFecha.message}`)

  // ── 6. Tareas recursos ──────────────────────────────────────────────────
  const maquinariaId = maquinarias?.[0]?.id
  const memberProfile = profiles?.find((p) => p.role === 'member')

  const recursosInsert: Array<{
    tarea_id: string
    tenant_id: string
    tipo_recurso: string
    maquinaria_id?: string
    personal_id?: string
  }> = []

  if (maquinariaId) {
    recursosInsert.push({
      tarea_id: tareaId,
      tenant_id: tenantId,
      tipo_recurso: 'MAQUINARIA',
      maquinaria_id: maquinariaId,
    })
  }

  if (memberProfile?.id) {
    recursosInsert.push({
      tarea_id: tareaId,
      tenant_id: tenantId,
      tipo_recurso: 'PERSONAL',
      personal_id: memberProfile.id,
    })
  }

  if (recursosInsert.length > 0) {
    const { error: errRecursos } = await supabase
      .from('tareas_recursos')
      .insert(recursosInsert)

    if (errRecursos) throw new Error(`seedDemoData tareas_recursos: ${errRecursos.message}`)
  }
  // ── 7. Formato demo (checklist de inspección) ──────────────────────────
  await seedFormatoDemo({ tenantId, adminUserId, supabase })

  } catch (err) {
    // Compensating cleanup — delete in reverse dependency order
    const sb = createAdminClient() as any
    await sb.from('tareas_recursos').delete().eq('tenant_id', tenantId).catch(() => {})
    await sb.from('tareas_fechas').delete().eq('tenant_id', tenantId).catch(() => {})
    await sb.from('tareas').delete().eq('tenant_id', tenantId).catch(() => {})
    await sb.from('servicios').delete().eq('tenant_id', tenantId).catch(() => {})
    await sb.from('terceros').delete().eq('tenant_id', tenantId).catch(() => {})
    await sb.from('profiles').delete().eq('tenant_id', tenantId).neq('id', params.adminUserId).catch(() => {})
    await sb.from('maquinarias').delete().eq('tenant_id', tenantId).catch(() => {})
    throw err
  }
}

// ─── seedFormatoDemo ──────────────────────────────────────────────────────────
// Crea un formato de inspección de muestra para el tenant trial.
// Estructura: 1 formato → 1 versión → 3 secciones con 2-3 preguntas c/u

async function seedFormatoDemo(params: {
  tenantId: string
  adminUserId: string
  supabase: ReturnType<typeof createAdminClient>
}): Promise<void> {
  const { tenantId, adminUserId, supabase } = params

  // 1. Formato header (sin version_actual_id por FK circular)
  const { data: formato, error: errFmt } = await supabase
    .from('formatos')
    .insert({
      tenant_id:   tenantId,
      codigo:      'DEMO-01',
      nombre:      'Inspección Pre-Operacional — Demo',
      descripcion: 'Checklist de ejemplo para inspección previa a la operación de maquinaria pesada.',
      is_active:   true,
      created_by:  adminUserId,
    })
    .select('id')
    .single()

  if (errFmt || !formato) {
    console.warn('[seedFormatoDemo] No se pudo crear formato:', errFmt?.message)
    return
  }

  // 2. Versión publicada
  const { data: version, error: errVer } = await supabase
    .from('formatos_versiones')
    .insert({
      tenant_id:                   tenantId,
      formato_id:                  formato.id,
      numero_version:              1,
      etiqueta_version:            '01',
      estado:                      'PUBLICADA',
      publicado_at:                new Date().toISOString(),
      muestra_bloque_empresa:      true,
      muestra_bloque_cliente:      true,
      muestra_bloque_cotizacion:   false,
      muestra_bloque_tarea:        true,
      muestra_bloque_observaciones: true,
      muestra_bloque_firma:        true,
      requisito_maquinaria:        'UNICO',
      requisito_personal:          'OPCIONAL',
      is_active:                   true,
      created_by:                  adminUserId,
    })
    .select('id')
    .single()

  if (errVer || !version) {
    console.warn('[seedFormatoDemo] No se pudo crear versión:', errVer?.message)
    return
  }

  // 3. Actualizar version_actual_id (resuelve FK circular)
  await supabase
    .from('formatos')
    .update({ version_actual_id: version.id })
    .eq('id', formato.id)

  // 4. Preguntas por sección con opciones
  const secciones: Array<{
    seccion: string
    preguntas: Array<{ texto: string; tipo: string; opciones?: string[] }>
  }> = [
    {
      seccion: 'DOCUMENTACIÓN Y HABILITACIÓN',
      preguntas: [
        { texto: '¿El operador cuenta con licencia vigente?',            tipo: 'SELECCION', opciones: ['Conforme', 'No conforme', 'No aplica'] },
        { texto: '¿Los documentos del equipo están al día?',             tipo: 'SELECCION', opciones: ['Conforme', 'No conforme', 'No aplica'] },
        { texto: 'Número de licencia del operador (referencia)',          tipo: 'TEXTO' },
      ],
    },
    {
      seccion: 'ESTADO MECÁNICO',
      preguntas: [
        { texto: '¿El nivel de aceite es el correcto?',                  tipo: 'SELECCION', opciones: ['Conforme', 'No conforme', 'No aplica'] },
        { texto: '¿El nivel de refrigerante es el correcto?',            tipo: 'SELECCION', opciones: ['Conforme', 'No conforme', 'No aplica'] },
        { texto: '¿Los frenos responden correctamente?',                 tipo: 'SELECCION', opciones: ['Conforme', 'No conforme', 'No aplica'] },
        { texto: 'Observaciones sobre estado mecánico',                  tipo: 'TEXTO' },
      ],
    },
    {
      seccion: 'SEGURIDAD Y EPP',
      preguntas: [
        { texto: '¿El operador usa EPP completo (casco, guantes, calzado)?', tipo: 'SELECCION', opciones: ['Conforme', 'No conforme'] },
        { texto: '¿El área de trabajo está delimitada correctamente?',    tipo: 'SELECCION', opciones: ['Conforme', 'No conforme', 'No aplica'] },
        { texto: 'Foto del equipo antes de iniciar operación',            tipo: 'FOTO' },
      ],
    },
  ]

  let pregOrden = 0
  for (const sec of secciones) {
    for (const preg of sec.preguntas) {
      pregOrden++

      const { data: pregunta, error: errPreg } = await supabase
        .from('formatos_preguntas')
        .insert({
          tenant_id:   tenantId,
          version_id:  version.id,
          seccion:     sec.seccion,
          orden:       pregOrden,
          texto:       preg.texto,
          tipo:        preg.tipo,
          requerida:   preg.tipo !== 'FOTO',
          permite_nota: true,
          is_active:   true,
        })
        .select('id')
        .single()

      if (errPreg || !pregunta) continue

      if (preg.opciones?.length) {
        const opcionesInsert = preg.opciones.map((etiqueta, i) => ({
          tenant_id:   tenantId,
          pregunta_id: pregunta.id,
          orden:       i + 1,
          etiqueta,
          es_conforme: etiqueta.toLowerCase().startsWith('conforme'),
          is_active:   true,
        }))
        await supabase.from('formatos_opciones').insert(opcionesInsert)
      }
    }
  }
}
