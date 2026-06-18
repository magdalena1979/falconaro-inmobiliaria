import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = 'magdalenabelaustegui@gmail.com'
const password = process.env.SUPERADMIN_PASSWORD

if (!url || !serviceRoleKey || !password) {
  console.error('Faltan SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SUPERADMIN_PASSWORD.')
  process.exit(1)
}

const normalizedUrl = url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
const supabase = createClient(normalizedUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    role: 'superadmin',
  },
})

if (createError && !createError.message.toLowerCase().includes('already')) {
  console.error(createError.message)
  process.exit(1)
}

const userId = created.user?.id

if (userId) {
  const { error: profileError } = await supabase.from('user_profiles').upsert({
    id: userId,
    email,
    role: 'superadmin',
  })

  if (profileError) {
    console.error(profileError.message)
    process.exit(1)
  }
}

console.log(`Superadministrador listo: ${email}`)
