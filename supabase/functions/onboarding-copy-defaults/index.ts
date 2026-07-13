import { createClient } from 'jsr:@supabase/supabase-js@2'

const REF_TENANT_ID = '3be055d3-7570-45ed-843e-1bc9bdb733fd' // INGEM

// Tablas con id UUID propio + tenant_id
const TABLES = [
  { table: 'formas_pago',           columns: ['nombre', 'is_active'] },
  { table: 'plazos_pago',           columns: ['nombre', 'dias', 'is_active'] },
  { table: 'contactos_area',        columns: ['nombre', 'is_active'] },
  { table: 'contactos_cargo',       columns: ['nombre', 'is_active'] },
  { table: 'areas',                 columns: ['name', 'is_active'] },
  { table: 'personal_cargos',       columns: ['nombre', 'is_active'] },
  { table: 'job_titles',            columns: ['name', 'is_active'] },
  { table: 'rubros',                columns: ['nombre', 'is_active'] },
  { table: 'sitios_tipo',           columns: ['nombre', 'is_active'] },
  { table: 'terceros_tipos',        columns: ['nombre', 'is_active'] },
  { table: 'servicios_tipo',        columns: ['nombre', 'is_active'] },
  { table: 'document_types',        columns: ['name', 'code', 'category', 'expiration_alert_days', 'is_active'] },
  { table: 'maquinaria_tipos_docs', columns: ['nombre', 'aplica_a', 'requiere_vencimiento', 'dias_alerta',
                                               'is_active', 'categoria', 'es_obligatorio', 'categoria_equipo'] },
  { table: 'catalogos',             columns: ['categoria', 'nombre', 'is_active'] },
  { table: 'actividades_matriz',    columns: ['nombre', 'responsable_default', 'orden', 'descripcion', 'is_active'] },
  { table: 'sst_epp_config',        columns: ['epp_nombre', 'dias_renovacion', 'nivel_riesgo', 'tipo', 'is_active'] },
]

// Tablas de config donde tenant_id ES la clave primaria
const CONFIG_TABLES = [
  {
    table: 'config_informe_maquinaria',
    columns: [
      'cantidad_turnos', 'cantidad_riggers', 'incluye_firma_cliente',
      'incluye_foto_trabajo', 'incluye_foto_reporte_escrito', 'incluye_tipo_recorrido',
      'incluye_salida_autorizada', 'incluye_tonelaje_placa', 'codigo_formato',
      'version_formato', 'fecha_formato', 'incluye_guia_transporte',
      'incluye_fotos_adicionales', 'etiquetas_fotos_adicionales',
    ],
  },
  {
    table: 'config_informe_personal',
    columns: [
      'cantidad_turnos', 'incluye_horas_extras', 'incluye_horas_extras_extraord',
      'incluye_horas_dominicales', 'incluye_gastos', 'incluye_firma_cliente_horas',
      'incluye_firma_trabajador', 'incluye_foto_trabajo', 'codigo_formato',
      'version_formato', 'fecha_formato',
    ],
  },
]

// config_checklist tiene id UUID propio
const CHECKLIST_COLS = [
  'mostrar_empresa', 'mostrar_cliente', 'mostrar_tarea', 'mostrar_medidores',
  'mostrar_observaciones', 'texto_declaracion', 'label_footer', 'planes_accion_notificar_a',
]

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Verificar que el caller es reporta_admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'reporta_admin') {
    return new Response('Forbidden: solo reporta_admin', { status: 403 })
  }

  // Leer body
  let newTenantId: string
  try {
    const body = await req.json()
    newTenantId = body.tenant_id
  } catch {
    return new Response('Body JSON inválido', { status: 400 })
  }

  if (!newTenantId) {
    return new Response('tenant_id requerido', { status: 400 })
  }

  // Verificar que el tenant existe
  const { data: tenant } = await supabaseAdmin
    .from('companies')
    .select('id, name')
    .eq('id', newTenantId)
    .single()

  if (!tenant) {
    return new Response('Tenant no encontrado', { status: 404 })
  }

  const results: Record<string, { copied: number; error?: string }> = {}
  let totalCopied = 0
  const now = new Date().toISOString()

  // Marcar paso como in_progress
  await supabaseAdmin.from('onboarding_progress').upsert({
    tenant_id: newTenantId,
    step_config: 'in_progress',
    updated_at: now,
  })

  // ── 1. Tablas con UUID propio ────────────────────────────
  for (const { table, columns } of TABLES) {
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select(columns.join(','))
      .eq('tenant_id', REF_TENANT_ID)
      .eq('is_active', true)

    if (fetchErr) {
      results[table] = { copied: 0, error: fetchErr.message }
      continue
    }

    if (!rows || rows.length === 0) {
      results[table] = { copied: 0 }
      continue
    }

    const newRows = rows.map(row => ({
      ...row,
      tenant_id: newTenantId,
      created_at: now,
      updated_at: now,
    }))

    const { error: insertErr } = await supabaseAdmin.from(table).insert(newRows)
    if (insertErr) {
      results[table] = { copied: 0, error: insertErr.message }
    } else {
      results[table] = { copied: rows.length }
      totalCopied += rows.length
    }
  }

  // ── 2. Config tables (tenant_id = PK) ─────────────────────
  for (const { table, columns } of CONFIG_TABLES) {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select(columns.join(','))
      .eq('tenant_id', REF_TENANT_ID)
      .maybeSingle()

    if (fetchErr) {
      results[table] = { copied: 0, error: fetchErr.message }
      continue
    }

    if (!row) {
      results[table] = { copied: 0 }
      continue
    }

    const { error: upsertErr } = await supabaseAdmin.from(table).upsert({
      ...row,
      tenant_id: newTenantId,
      created_at: now,
      updated_at: now,
    })

    if (upsertErr) {
      results[table] = { copied: 0, error: upsertErr.message }
    } else {
      results[table] = { copied: 1 }
      totalCopied++
    }
  }

  // ── 3. config_checklist (tiene id UUID propio) ────────────
  const { data: checklist, error: clErr } = await supabaseAdmin
    .from('config_checklist')
    .select(CHECKLIST_COLS.join(','))
    .eq('tenant_id', REF_TENANT_ID)
    .maybeSingle()

  if (clErr) {
    results['config_checklist'] = { copied: 0, error: clErr.message }
  } else if (checklist) {
    const { error: clInsertErr } = await supabaseAdmin.from('config_checklist').insert({
      ...checklist,
      tenant_id: newTenantId,
      created_at: now,
    })
    if (clInsertErr) {
      results['config_checklist'] = { copied: 0, error: clInsertErr.message }
    } else {
      results['config_checklist'] = { copied: 1 }
      totalCopied++
    }
  } else {
    results['config_checklist'] = { copied: 0 }
  }

  // ── 4. cotizaciones_configuracion (id UUID + tenant_id UNIQUE) ──
  const COT_CONFIG_COLS = [
    'saludo', 'introduccion', 'terminos_condiciones', 'pie_pagina', 'despedida',
    'forma_pago1', 'forma_pago2', 'mostrar_firma', 'is_active',
  ]
  const { data: cotConfig, error: cotErr } = await supabaseAdmin
    .from('cotizaciones_configuracion')
    .select(COT_CONFIG_COLS.join(','))
    .eq('tenant_id', REF_TENANT_ID)
    .maybeSingle()

  if (cotErr) {
    results['cotizaciones_configuracion'] = { copied: 0, error: cotErr.message }
  } else if (cotConfig) {
    const { error: cotInsertErr } = await supabaseAdmin.from('cotizaciones_configuracion').insert({
      ...cotConfig,
      tenant_id: newTenantId,
      created_at: now,
      updated_at: now,
    })
    if (cotInsertErr) {
      results['cotizaciones_configuracion'] = { copied: 0, error: cotInsertErr.message }
    } else {
      results['cotizaciones_configuracion'] = { copied: 1 }
      totalCopied++
    }
  } else {
    results['cotizaciones_configuracion'] = { copied: 0 }
  }

  // ── Actualizar progreso ───────────────────────────────────
  const hasErrors = Object.values(results).some(r => r.error)
  await supabaseAdmin.from('onboarding_progress').upsert({
    tenant_id: newTenantId,
    step_config: hasErrors ? 'in_progress' : 'completed',
    config_count: totalCopied,
    updated_at: new Date().toISOString(),
  })

  return new Response(
    JSON.stringify({
      success: !hasErrors,
      tenant: tenant.name,
      totalCopied,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
