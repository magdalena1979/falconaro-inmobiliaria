import { Avatar, Box, Button, Divider, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import type { ModuleKey } from '../services/supabase/types'

interface LayoutProps {
  active: ModuleKey | 'profile'
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
  { key: 'clients', label: 'Clientes' },
  { key: 'properties', label: 'Inmuebles' },
  { key: 'contracts', label: 'Locaciones' },
]

const administrationNavItems: Array<{ key: ModuleKey; label: string }> = [
  { key: 'administration', label: 'Resumen de cuenta' },
  { key: 'cashMovements', label: 'Caja' },
  { key: 'rentInstallments', label: 'Cuotas' },
  { key: 'ownerSettlements', label: 'Liquidaciones' },
]

const configNavItems: Array<{ key: ModuleKey; label: string }> = [
  { key: 'propertyTypes', label: 'Tipos de inmueble' },
  { key: 'contractTerms', label: 'Plazos de contrato' },
  { key: 'currencies', label: 'Monedas' },
  { key: 'updateTypes', label: 'Actualizaciones' },
  { key: 'iclIndices', label: 'Índice ICL' },
  { key: 'agencySettings', label: 'Datos y comisión' },
  { key: 'financialSettings', label: 'Finanzas' },
  { key: 'userRoles', label: 'Usuarios y roles' },
  { key: 'employees', label: 'Empleados' },
]

export function Layout({
  active,
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
            {mainNavItems.map(renderNavItem)}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography className="nav-section-label" variant="caption" color="text.secondary">
            Administración
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {administrationNavItems.map(renderNavItem)}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography className="nav-section-label" variant="caption" color="text.secondary">
            Configuración
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {configNavItems.map(renderNavItem)}
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

  function renderNavItem(item: { key: ModuleKey; label: string }) {
    return (
      <Button
        key={item.key}
        className="nav-button"
        color={active === item.key ? 'primary' : 'inherit'}
        onClick={() => onNavigate(item.key)}
        variant={active === item.key ? 'contained' : 'text'}
      >
        <span>{item.label}</span>
      </Button>
    )
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
