import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase/client'

export interface UserProfile {
  id: string
  email: string
  role: 'superadmin' | 'admin' | 'user'
}

export interface AuthState {
  session: Session | null
  user: User | null
  profile: UserProfile | null
}

export async function getAuthState(): Promise<AuthState> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  const session = data.session
  const profile = session?.user ? await getUserProfile(session.user) : null

  return {
    session,
    user: session?.user ?? null,
    profile,
  }
}

export async function getUserProfile(user: User): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id,email,role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.warn(error.message)
    return null
  }

  return data as UserProfile | null
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/?auth=recovery`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
