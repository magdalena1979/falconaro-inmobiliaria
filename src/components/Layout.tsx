import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import type { ModuleDefinition, ModuleKey } from '../services/supabase/types'

interface LayoutProps {
  active: ModuleKey
  modules: ModuleDefinition[]
  onNavigate: (key: ModuleKey) => void
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
  { key: 'contractOwners', label: 'Contrato propietarios' },
  { key: 'contractTenants', label: 'Contrato inquilinos' },
  { key: 'userRoles', label: 'Usuarios y roles' },
  { key: 'employees', label: 'Empleados' },
]

const configNavItems: Array<{ key: ModuleKey; label: string }> = [
  { key: 'propertyTypes', label: 'Tipos' },
  { key: 'contractTerms', label: 'Plazos' },
  { key: 'currencies', label: 'Monedas' },
  { key: 'updateTypes', label: 'Actualizacion' },
]

export function Layout({ active, modules, onNavigate, onSignOut, userEmail, userRole, children }: LayoutProps) {
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
        {userEmail && (
          <Box className="session-box">
            <Typography variant="caption" color="text.secondary">
              {userRole ?? 'user'}
            </Typography>
            <Typography variant="body2">{userEmail}</Typography>
            <Button color="inherit" onClick={onSignOut} size="small">
              Cerrar sesion
            </Button>
          </Box>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Supabase real, sin datos mock.
        </Typography>
      </Box>
      <Box component="main" className="content">
        {children}
      </Box>
    </Box>
  )
}
