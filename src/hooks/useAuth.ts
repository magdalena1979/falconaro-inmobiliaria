import { useEffect, useState } from 'react'
import { getAuthState, getUserProfile } from '../services/auth'
import type { AuthState } from '../services/auth'
import { supabase } from '../services/supabase/client'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    new URLSearchParams(window.location.search).get('auth') === 'recovery',
  )

  useEffect(() => {
    let isMounted = true

    getAuthState()
      .then((state) => {
        if (isMounted) setAuthState(state)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }

      void (async () => {
        const profile = session?.user ? await getUserProfile(session.user) : null
        setAuthState({
          session,
          user: session?.user ?? null,
          profile,
        })
        setIsLoading(false)
      })()
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  return {
    ...authState,
    isLoading,
    isPasswordRecovery,
    finishPasswordRecovery: () => setIsPasswordRecovery(false),
  }
}
