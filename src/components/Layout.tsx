import { Avatar, Box, Button, Divider, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import type { ModuleDefinition, ModuleKey } from '../services/supabase/types'

interface LayoutProps {
  active: ModuleKey | 'profile'
  modules: ModuleDefinition[]
  onNavigate: (key: ModuleKey) => void
  onOpenProfile: () => void
  onOpenTeam: () => void
  onSignOut: () => void
  userEmail?: string
  userRole?: string
  children: React.ReactNode
}

const mainNavItems: Array<{ key: ModuleKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'properties', label: 'Propiedades' },
  { key: 'owners', label: 'Propietarios' },
  { key: 'tenants', label: 'Locatarios' },
  { key: 'contracts', label: 'Contratos' },
  { key: 'payments', label: 'Cobros' },
  { key: 'ownerCollections', label: 'Liquidaciones' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'reports', label: 'Reportes' },
  { key: 'userRoles', label: 'Equipo' },
  { key: 'contractOwners', label: 'Contrato propietarios' },
  { key: 'contractTenants', label: 'Contrato inquilinos' },
  { key: 'employees', label: 'Empleados' },
]

const configNavItems: Array<{ key: ModuleKey; label: string }> = [
  { key: 'propertyTypes', label: 'Tipos' },
  { key: 'contractTerms', label: 'Plazos' },
  { key: 'currencies', label: 'Monedas' },
  { key: 'updateTypes', label: 'Actualizacion' },
]

export function Layout({
  active,
  modules,
  onNavigate,
  onOpenProfile,
  onOpenTeam,
  onSignOut,
  userEmail,
  userRole,
  children,
}: LayoutProps) {
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null)
  const isAccountMenuOpen = Boolean(accountAnchor)

  return (
    <Box className="app-shell">
      <Box component="aside" className="sidebar">
        <Box className="brand">
          <Box
            alt="Falconaro Servicios Inmobiliarios"
            className="brand-logo"
            component="img"
            src="/images/logo.jpg"
          />
          <Typography variant="caption">Gestion inmobiliaria</Typography>
        </Box>
        <Box className="sidebar-scroll">
          <Stack spacing={0.75}>
            {mainNavItems.map((item) => {
              const resolved = modules.find((module) => module.key === item.key)
              return (
                <Button
                  key={item.key}
                  className="nav-button"
                  color={active === item.key ? 'primary' : 'inherit'}
                  onClick={() => onNavigate(item.key)}
                  variant={active === item.key ? 'contained' : 'text'}
                >
                  <span>{item.label}</span>
                  {resolved && <small>{resolved.table.name}</small>}
                </Button>
              )
            })}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography className="nav-section-label" variant="caption" color="text.secondary">
            Configuracion
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {configNavItems.map((item) => {
              const resolved = modules.find((module) => module.key === item.key)
              return (
                <Button
                  key={item.key}
                  className="nav-button"
                  color={active === item.key ? 'primary' : 'inherit'}
                  onClick={() => onNavigate(item.key)}
                  variant={active === item.key ? 'contained' : 'text'}
                >
                  <span>{item.label}</span>
                  {resolved && <small>{resolved.table.name}</small>}
                </Button>
              )
            })}
          </Stack>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Supabase real, sin datos mock.
        </Typography>
      </Box>
      <Box className="main-shell">
        <Box component="header" className="topbar">
          {userEmail && (
            <>
              <Button
                aria-controls={isAccountMenuOpen ? 'account-menu' : undefined}
                aria-expanded={isAccountMenuOpen ? 'true' : undefined}
                aria-haspopup="true"
                className="account-button"
                color="inherit"
                onClick={(event) => setAccountAnchor(event.currentTarget)}
              >
                <Avatar className="account-avatar">{avatarInitial(userEmail)}</Avatar>
                <Box className="account-summary">
                  <Typography variant="body2">{userEmail}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {roleLabel(userRole)}
                  </Typography>
                </Box>
              </Button>
              <Menu
                anchorEl={accountAnchor}
                id="account-menu"
                onClose={closeAccountMenu}
                open={isAccountMenuOpen}
                slotProps={{ paper: { className: 'account-menu-paper' } }}
              >
                <Box className="account-menu-header">
                  <Avatar className="account-avatar account-avatar-large">{avatarInitial(userEmail)}</Avatar>
                  <Box>
                    <Typography variant="body2">{userEmail}</Typography>
                    <Typography className="role-pill" variant="caption">
                      {roleLabel(userRole)}
                    </Typography>
                  </Box>
                </Box>
                <Divider />
                <MenuItem onClick={openProfile}>Mi perfil</MenuItem>
                <MenuItem onClick={openTeam}>Mi equipo</MenuItem>
                <Divider />
                <MenuItem className="account-signout-item" onClick={signOutFromMenu}>
                  Cerrar sesion
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
        <Box component="main" className="content">
          {children}
        </Box>
      </Box>
    </Box>
  )

  function closeAccountMenu() {
    setAccountAnchor(null)
  }

  function openProfile() {
    closeAccountMenu()
    onOpenProfile()
  }

  function openTeam() {
    closeAccountMenu()
    onOpenTeam()
  }

  function signOutFromMenu() {
    closeAccountMenu()
    onSignOut()
  }
}

function roleLabel(role: string | undefined): string {
  if (role === 'superadmin') return 'Super administrador'
  if (role === 'admin') return 'Administrador'
  return 'Sin acceso al panel'
}

function avatarInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || 'U'
}
