import { CssBaseline, ThemeProvider } from '@mui/material'
import { useState } from 'react'
import { AuthPage } from './components/AuthPage'
import { Dashboard } from './components/Dashboard'
import { EmptyState } from './components/EmptyState'
import { EntityPage } from './components/EntityPage'
import { Layout } from './components/Layout'
import { ProfilePage } from './components/ProfilePage'
import { Reports } from './components/Reports'
import { TeamPage } from './components/TeamPage'
import { getModule, modules } from './config/modules'
import { useAuth } from './hooks/useAuth'
import { signOut } from './services/auth'
import { isSupabaseConfigured } from './services/supabase/client'
import type { ModuleKey } from './services/supabase/types'
import { appTheme } from './theme'

function App() {
  const [active, setActive] = useState<ModuleKey | 'profile'>('dashboard')
  const auth = useAuth()

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme />
      {!isSupabaseConfigured ? (
        <Layout
          active={active}
          modules={modules}
          onNavigate={setActive}
          onOpenProfile={() => setActive('profile')}
          onOpenTeam={() => setActive('userRoles')}
          onSignOut={handleSignOut}
          userEmail={auth.user?.email}
          userRole={auth.profile?.role}
        >
          <EmptyState
            title="Faltan credenciales de Supabase"
            description="Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para consumir las tablas configuradas."
            severity="warning"
          />
        </Layout>
      ) : auth.isLoading ? (
        <div className="auth-shell">
          <EmptyState title="Cargando sesion" description="Verificando tu acceso al sistema." />
        </div>
      ) : auth.isPasswordRecovery ? (
        <AuthPage mode="recovery" onPasswordUpdated={auth.finishPasswordRecovery} />
      ) : !auth.session ? (
        <AuthPage mode="login" />
      ) : !['superadmin', 'admin'].includes(auth.profile?.role ?? '') ? (
        <div className="auth-shell">
          <EmptyState
            title="Sin permisos de administrador"
            description="Tu usuario existe, pero todavia no tiene rol admin o superadmin para entrar al panel."
            severity="warning"
          />
        </div>
      ) : (
        <Layout
          active={active}
          modules={modules}
          onNavigate={setActive}
          onOpenProfile={() => setActive('profile')}
          onOpenTeam={() => setActive('userRoles')}
          onSignOut={handleSignOut}
          userEmail={auth.user?.email}
          userRole={auth.profile?.role}
        >
          {active === 'profile' ? (
            <ProfilePage email={auth.user?.email} role={auth.profile?.role} />
          ) : active === 'dashboard' ? (
            <Dashboard modules={modules} />
          ) : active === 'reports' ? (
            <Reports />
          ) : active === 'userRoles' ? (
            <TeamPage module={getModule(active)} currentUserRole={auth.profile?.role} />
          ) : (
            <EntityPage module={getModule(active)} />
          )}
        </Layout>
      )}
    </ThemeProvider>
  )

  async function handleSignOut() {
    await signOut()
    setActive('dashboard')
  }
}

export default App
