import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseConfig } from './utils.js'

export type MigrationClient = SupabaseClient

export async function createSupabaseClient(): Promise<MigrationClient> {
  const { url, anonKey } = getSupabaseConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const key = serviceRoleKey || anonKey
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  if (serviceRoleKey) {
    console.log('Conectado a Supabase con service role para migracion.')
    return supabase
  }

  const email = process.env.SUPABASE_AUTH_EMAIL
    ?? process.env.SUPERADMIN_EMAIL
    ?? 'magdalenabelaustegui@gmail.com'
  const password = process.env.SUPABASE_AUTH_PASSWORD ?? process.env.SUPERADMIN_PASSWORD

  if (!password) {
    throw new Error(
      'Falta SUPABASE_AUTH_PASSWORD o SUPERADMIN_PASSWORD. El migrador necesita iniciar sesion como admin/superadmin para pasar RLS.',
    )
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`No se pudo iniciar sesion en Supabase con ${email}: ${error.message}`)
  }

  console.log(`Sesion Supabase iniciada como ${email}.`)
  return supabase
}

export async function fetchAll<T>(
  supabase: MigrationClient,
  table: string,
  columns = '*',
): Promise<T[]> {
  const pageSize = 1000
  const results: T[] = []
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase.from(table).select(columns).range(from, to)
    if (error) throw error

    const page = (data ?? []) as T[]
    results.push(...page)
    if (page.length < pageSize) break
    from += pageSize
  }

  return results
}
