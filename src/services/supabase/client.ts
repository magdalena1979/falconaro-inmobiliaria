import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabaseAnonKey = normalizeEnvValue(rawSupabaseAnonKey)
export const supabaseUrl = normalizeProjectUrl(rawSupabaseUrl)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

function normalizeProjectUrl(value: string | undefined): string | undefined {
  return normalizeEnvValue(value)
    ?.replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined
  const normalized = value
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()

  return normalized || undefined
}
