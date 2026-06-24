import { createClient } from '@supabase/supabase-js'

const BCRA_URL = 'https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/40'
const PAGE_SIZE = 1000

export const maxDuration = 60

interface BcraPoint {
  fecha: string
  valor: number
}

interface BcraResponse {
  status: number
  metadata?: {
    resultset?: {
      count?: number
      limit?: number
    }
  }
  results?: Array<{
    detalle?: BcraPoint[]
  }>
  errorMessages?: string[]
}

interface ImportResult {
  registros_insertados: number
  contratos_procesados: number
  ajustes_generados: number
}

interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  const method = request.method ?? ''
  if (!['GET', 'POST'].includes(method)) {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    response.status(500).json({ error: 'Faltan variables privadas de Supabase en el servidor.' })
    return
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const rawAuthorization = request.headers.authorization
  const authorization = Array.isArray(rawAuthorization) ? rawAuthorization[0] : rawAuthorization ?? ''
  const isCron = method === 'GET'
    && Boolean(process.env.CRON_SECRET)
    && authorization === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const accessToken = authorization.replace(/^Bearer\s+/i, '')
    if (!accessToken) {
      response.status(401).json({ error: 'Sesión requerida.' })
      return
    }

    const { data: userData, error: userError } = await admin.auth.getUser(accessToken)
    if (userError || !userData.user) {
      response.status(401).json({ error: 'Sesión inválida.' })
      return
    }

    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !['admin', 'superadmin'].includes(String(profile?.role))) {
      response.status(403).json({ error: 'No tenés permisos para sincronizar el ICL.' })
      return
    }
  }

  try {
    const points = await fetchAllIclPoints()
    let inserted = 0

    for (let index = 0; index < points.length; index += PAGE_SIZE) {
      const batch = points.slice(index, index + PAGE_SIZE)
      const { data, error } = await admin.rpc('importar_indices_icl', {
        p_indices: batch,
        p_aplicar_ajustes: false,
      })
      if (error) throw error
      inserted += Number((data?.[0] as ImportResult | undefined)?.registros_insertados ?? 0)
    }

    const { data: adjustmentData, error: adjustmentError } = await admin.rpc('importar_indices_icl', {
      p_indices: [],
      p_aplicar_ajustes: true,
    })
    if (adjustmentError) throw adjustmentError
    const adjustments = adjustmentData?.[0] as ImportResult | undefined

    response.status(200).json({
      received: points.length,
      inserted,
      latestDate: points[0]?.fecha ?? null,
      contractsProcessed: Number(adjustments?.contratos_procesados ?? 0),
      adjustmentsGenerated: Number(adjustments?.ajustes_generados ?? 0),
    })
  } catch (error) {
    console.error('ICL synchronization failed', error)
    response.status(502).json({
      error: error instanceof Error ? error.message : 'No se pudo sincronizar el ICL.',
    })
  }
}

async function fetchAllIclPoints(): Promise<BcraPoint[]> {
  const today = new Date().toISOString().slice(0, 10)
  const points: BcraPoint[] = []
  let offset = 0
  let total = Number.POSITIVE_INFINITY

  while (offset < total) {
    const url = new URL(BCRA_URL)
    url.searchParams.set('desde', '2020-07-01')
    url.searchParams.set('hasta', today)
    url.searchParams.set('limit', String(PAGE_SIZE))
    url.searchParams.set('offset', String(offset))

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Falconaro-Inmobiliaria-ICL/1.0',
      },
      signal: AbortSignal.timeout(30000),
    })
    const payload = await response.json() as BcraResponse
    if (!response.ok || payload.status !== 200) {
      throw new Error(payload.errorMessages?.join('. ') || `BCRA respondió HTTP ${response.status}`)
    }

    const detail = payload.results?.[0]?.detalle ?? []
    points.push(...detail.filter(isValidPoint).map(({ fecha, valor }) => ({ fecha, valor })))
    total = payload.metadata?.resultset?.count ?? points.length
    offset += payload.metadata?.resultset?.limit ?? PAGE_SIZE
    if (!detail.length) break
  }

  return points
}

function isValidPoint(point: BcraPoint): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(point.fecha)
    && Number.isFinite(point.valor)
    && point.valor > 0
}
