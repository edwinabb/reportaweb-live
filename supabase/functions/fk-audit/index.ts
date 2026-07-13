import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Verificar autenticación (solo reporta_admin)
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

  // FK audit queries using PostgREST
  // Note: PostgREST doesn't support raw SQL, so we'll use table counts and link verification
  const queries = [
    {
      name: 'FK-1: cotizaciones.cliente_id → terceros.id',
      test: async () => {
        const { data: cotizaciones, error: e1 } = await supabaseAdmin
          .from('cotizaciones')
          .select('cliente_id', { count: 'exact' })

        if (e1) return { error: e1.message }

        const clienteIds = new Set(cotizaciones?.map((c: any) => c.cliente_id) || [])
        const { data: terceros, error: e2 } = await supabaseAdmin
          .from('terceros')
          .select('id')

        if (e2) return { error: e2.message }

        const terceroIds = new Set(terceros?.map((t: any) => t.id) || [])

        let orphans = 0
        for (const cid of clienteIds) {
          if (cid && !terceroIds.has(cid)) orphans++
        }

        return { orphans, totalRecords: cotizaciones?.length || 0 }
      }
    },
    {
      name: 'FK-2: cotizaciones_detalle.cotizacion_id → cotizaciones.id',
      test: async () => {
        const { data: detalles } = await supabaseAdmin
          .from('cotizaciones_detalle')
          .select('cotizacion_id')

        const cotIds = new Set(detalles?.map((d: any) => d.cotizacion_id) || [])
        const { data: cotizaciones } = await supabaseAdmin
          .from('cotizaciones')
          .select('id')

        const cotizacionIds = new Set(cotizaciones?.map((c: any) => c.id) || [])

        let orphans = 0
        for (const cid of cotIds) {
          if (cid && !cotizacionIds.has(cid)) orphans++
        }

        return { orphans, totalRecords: detalles?.length || 0 }
      }
    },
  ]

  try {
    console.log('Starting FK audit...')
    const results: any[] = []

    for (const query of queries) {
      const result = await query.test()
      results.push({
        name: query.name,
        ...result,
        status: result.error ? 'ERROR' : result.orphans === 0 ? 'PASS' : 'FAIL'
      })
    }

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        environment: 'prod',
        audit: 'fk-integrity-v3.11',
        results,
        summary: {
          totalChecks: results.length,
          passed: results.filter(r => r.status === 'PASS').length,
          failed: results.filter(r => r.status === 'FAIL').length,
          errors: results.filter(r => r.status === 'ERROR').length,
        }
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as any).message }),
      { status: 500 }
    )
  }
})
